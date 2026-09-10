// Dedicated Video & Media Handler for Vehicle Inspection at Arrival

const DB_NAME = 'drfix_media_cache';
const DB_VERSION = 1;
const STORE_NAME = 'inspection_videos';

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generates a crisp base64 JPEG thumbnail from a video file/blob
 */
export function generateVideoThumbnail(videoFile: Blob | File): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;
      video.preload = 'metadata';

      const url = URL.createObjectURL(videoFile);
      video.src = url;

      let hasResolved = false;

      const captureFrame = () => {
        if (hasResolved) return;
        hasResolved = true;

        try {
          const canvas = document.createElement('canvas');
          const maxDim = 640;
          let width = video.videoWidth || 640;
          let height = video.videoHeight || 360;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, width, height);
            const thumbBase64 = canvas.toDataURL('image/jpeg', 0.7);
            URL.revokeObjectURL(url);
            resolve(thumbBase64);
          } else {
            URL.revokeObjectURL(url);
            resolve('');
          }
        } catch (e) {
          URL.revokeObjectURL(url);
          resolve('');
        }
      };

      video.onloadeddata = () => {
        // seek a bit into the video to avoid black frames
        video.currentTime = Math.min(1.0, (video.duration || 1) / 2);
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };

      // Fallback timeout in case video loading hangs
      setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true;
          URL.revokeObjectURL(url);
          resolve('');
        }
      }, 5000);
    } catch (err) {
      resolve('');
    }
  });
}

/**
 * Stores inspection video:
 * 1. Uploads to backend server (/api/upload-video) so it produces a real, permanent, universally accessible URL
 *    that works across laptops, customer devices, and phones.
 * 2. Generates a crisp base64 JPEG thumbnail for instant preview and listing.
 * 3. Also caches in local IndexedDB as an offline safety backup.
 */
export async function storeInspectionVideo(
  key: string,
  videoBlob: Blob | File
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const thumbnailUrl = await generateVideoThumbnail(videoBlob);
  let serverVideoUrl = '';

  // 1. Attempt upload to backend server
  try {
    const formData = new FormData();
    const originalName = (videoBlob as File).name || `${key}.mp4`;
    const mimeType = videoBlob.type || 'video/mp4';
    const fileToUpload = videoBlob instanceof File 
      ? videoBlob 
      : new File([videoBlob], originalName, { type: mimeType });

    formData.append('video', fileToUpload);

    const response = await fetch('/api/upload-video', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.videoUrl) {
        serverVideoUrl = data.videoUrl;
      }
    } else {
      console.warn('Server video upload returned non-200:', response.status);
    }
  } catch (uploadErr) {
    console.warn('Server video upload failed, falling back to local storage:', uploadErr);
  }

  // 2. Cache in local IndexedDB as backup
  try {
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: key,
        blob: videoBlob,
        thumbnail: thumbnailUrl,
        serverUrl: serverVideoUrl,
        savedAt: Date.now(),
        type: videoBlob.type || 'video/mp4'
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (dbErr) {
    console.warn('IndexedDB write warning for inspection video:', dbErr);
  }

  // Fallback to object URL if server was unreachable
  const finalVideoUrl = serverVideoUrl || URL.createObjectURL(videoBlob);

  return {
    videoUrl: finalVideoUrl,
    thumbnailUrl: thumbnailUrl || finalVideoUrl
  };
}

/**
 * Retrieves a stored video by key and creates a playback URL
 */
export async function getInspectionVideoUrl(key: string): Promise<string | null> {
  try {
    const db = await openMediaDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result?.blob) {
          resolve(URL.createObjectURL(req.result.blob));
        } else {
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}
