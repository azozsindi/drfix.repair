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
 * Stores inspection video blob in local IndexedDB and returns playback URL and thumbnail
 */
export async function storeInspectionVideo(
  key: string,
  videoBlob: Blob | File
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const thumbnailUrl = await generateVideoThumbnail(videoBlob);

  try {
    const db = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: key,
        blob: videoBlob,
        thumbnail: thumbnailUrl,
        savedAt: Date.now(),
        type: videoBlob.type || 'video/mp4'
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (dbErr) {
    console.warn('IndexedDB write warning for inspection video:', dbErr);
  }

  // Create an object URL for immediate in-session playback
  const objectUrl = URL.createObjectURL(videoBlob);
  return {
    videoUrl: objectUrl,
    thumbnailUrl: thumbnailUrl || objectUrl
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
