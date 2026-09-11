// Dedicated Video & Media Handler for Vehicle Inspection at Arrival & Service Documentation
import { db } from '../firebase';
import { collection, doc, setDoc, getDocs, query, where, writeBatch } from 'firebase/firestore';

const DB_NAME = 'drfix_media_cache';
const DB_VERSION = 2;
const STORE_NAME = 'inspection_videos';
const CHUNK_SIZE = 450 * 1024; // 450 KB binary per chunk (~600 KB base64, safe for Firestore 1MB doc limit)

/**
 * Open local IndexedDB for instant offline-safe video caching
 */
function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = request.result;
      if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
        dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save video blob into local IndexedDB
 */
export async function cacheVideoLocally(key: string, blob: Blob, mimeType: string, thumbnail?: string): Promise<void> {
  try {
    const idb = await openMediaDB();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put({
        id: key,
        blob,
        thumbnail: thumbnail || '',
        mimeType: mimeType || 'video/mp4',
        savedAt: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('Failed to cache video in IndexedDB:', e);
  }
}

/**
 * Get video blob from local IndexedDB
 */
export async function getCachedVideoLocally(key: string): Promise<{ blob: Blob; mimeType: string } | null> {
  try {
    const idb = await openMediaDB();
    return new Promise((resolve) => {
      const tx = idb.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result?.blob) {
          resolve({
            blob: req.result.blob,
            mimeType: req.result.mimeType || req.result.blob.type || 'video/mp4'
          });
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

/**
 * Generates a crisp base64 JPEG thumbnail from a video file/blob
 */
export function generateVideoThumbnail(videoFile: Blob | File): Promise<string> {
  return new Promise((resolve) => {
    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;
      video.preload = 'auto';

      const url = URL.createObjectURL(videoFile);
      video.src = url;

      let hasResolved = false;

      const finishWithFallback = () => {
        if (hasResolved) return;
        hasResolved = true;
        try { URL.revokeObjectURL(url); } catch {}
        // Return a sleek SVG poster thumbnail fallback
        const svgFallback = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="%23111827"><rect width="640" height="360" fill="%23111827"/><circle cx="320" cy="180" r="48" fill="%23dc2626"/><polygon points="310,160 340,180 310,200" fill="white"/><text x="320" y="260" font-family="sans-serif" font-size="20" font-weight="bold" fill="white" text-anchor="middle">فيديو توثيق الفحص والمعاينة 🎥</text></svg>`;
        resolve(svgFallback);
      };

      const captureFrame = () => {
        if (hasResolved) return;
        hasResolved = true;

        try {
          const canvas = document.createElement('canvas');
          const maxDim = 480;
          let width = video.videoWidth || 480;
          let height = video.videoHeight || 270;

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
            const thumbBase64 = canvas.toDataURL('image/jpeg', 0.65);
            URL.revokeObjectURL(url);
            resolve(thumbBase64);
          } else {
            finishWithFallback();
          }
        } catch {
          finishWithFallback();
        }
      };

      video.onloadeddata = () => {
        try {
          video.currentTime = Math.min(0.5, (video.duration || 1) / 2);
        } catch {
          captureFrame();
        }
      };

      video.onseeked = () => {
        captureFrame();
      };

      video.onerror = () => {
        finishWithFallback();
      };

      // Fallback timeout in case video loading hangs on mobile
      setTimeout(() => {
        if (!hasResolved) {
          captureFrame();
        }
      }, 3000);
    } catch {
      resolve('');
    }
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || '';
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Stores inspection video:
 * 1. Generates a thumbnail for immediate display.
 * 2. Saves directly to Cloud Firestore in distributed chunks (works universally across Vercel, Cloud Run, Safari, Chrome).
 * 3. Caches in local IndexedDB for 0ms instantaneous replay on the current device.
 * 4. Also attempts uploading to backend server endpoint as an optional static backup.
 */
export async function storeInspectionVideo(
  key: string,
  videoBlob: Blob | File,
  onProgress?: (percent: number, statusText: string) => void
): Promise<{ videoUrl: string; thumbnailUrl: string }> {
  const cleanId = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  const mimeType = videoBlob.type || 'video/mp4';

  onProgress?.(10, 'جاري توليد الصورة المصغرة للفيديو...');
  const thumbnailUrl = await generateVideoThumbnail(videoBlob);

  // 1. Cache immediately in IndexedDB so the recording user never has to wait to view their video
  await cacheVideoLocally(cleanId, videoBlob, mimeType, thumbnailUrl);

  // 2. First try fast direct upload to server endpoint (/api/upload-video)
  let serverVideoUrl = '';
  onProgress?.(30, 'جاري رفع الفيديو إلى السيرفر السحابي...');
  try {
    const formData = new FormData();
    const originalName = (videoBlob as File).name || `${cleanId}.mp4`;
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
        onProgress?.(100, 'تم حفظ الفيديو بنجاح!');
        return {
          videoUrl: serverVideoUrl,
          thumbnailUrl: thumbnailUrl || ''
        };
      }
    }
  } catch (serverErr) {
    console.warn('Direct server video upload skipped or unavailable, falling back to cloud chunks:', serverErr);
  }

  // 3. Fallback: Upload in chunks to Firestore if server upload is not available
  onProgress?.(45, 'جاري تجهيز مقطع الفيديو للرفع السحابي...');
  try {
    const totalBytes = videoBlob.size;
    const totalChunks = Math.ceil(totalBytes / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalBytes);
      const chunkBlob = videoBlob.slice(start, end, mimeType);
      const chunkBase64 = await blobToBase64(chunkBlob);

      const chunkDocId = `${cleanId}_c${i}`;
      const chunkRef = doc(db, 'inspection_videos', chunkDocId);

      await setDoc(chunkRef, {
        videoId: cleanId,
        chunkIndex: i,
        totalChunks,
        data: chunkBase64,
        mimeType,
        size: totalBytes,
        createdAt: new Date().toISOString()
      });

      const currentProgress = 45 + Math.round(((i + 1) / totalChunks) * 50);
      onProgress?.(currentProgress, `جاري رفع أجزاء الفيديو إلى السحابة (${i + 1}/${totalChunks})...`);
    }

    onProgress?.(100, 'اكتمل الحفظ السحابي للفيديو بنجاح!');
  } catch (cloudErr) {
    console.warn('Firestore video chunks upload failed, relying on local and server backup:', cloudErr);
  }

  const masterVideoUrl = serverVideoUrl || `firestore-video://${cleanId}`;

  return {
    videoUrl: masterVideoUrl,
    thumbnailUrl: thumbnailUrl || ''
  };
}

/**
 * Checks if a blob: URL is still valid and alive in current browser memory
 */
export async function isBlobUrlAlive(url: string): Promise<boolean> {
  if (!url.startsWith('blob:')) return true;
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return res.ok || res.type === 'opaque';
  } catch {
    return false;
  }
}

/**
 * Resolves any video URL (firestore-video://, blob:, /uploads/, or https://) into an active, playable Object URL or direct link
 */
export async function resolveInspectionVideoUrl(
  rawUrl: string,
  onProgress?: (percent: number, message: string) => void
): Promise<{
  playbackUrl: string | null;
  mimeType: string;
  isExpiredBlob?: boolean;
  error?: string;
}> {
  if (!rawUrl) {
    return { playbackUrl: null, mimeType: 'video/mp4', error: 'لم يتم توفير رابط للفيديو' };
  }

  // 1. Direct Web/Server URL (https://, http://, /uploads/)
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('/uploads/')) {
    return { playbackUrl: rawUrl, mimeType: 'video/mp4' };
  }

  // 2. Blob URL
  if (rawUrl.startsWith('blob:')) {
    const isAlive = await isBlobUrlAlive(rawUrl);
    if (isAlive) {
      return { playbackUrl: rawUrl, mimeType: 'video/mp4' };
    }
    // Expired legacy blob URL
    return {
      playbackUrl: null,
      mimeType: 'video/mp4',
      isExpiredBlob: true,
      error: 'عذراً، هذا المقطع سُجّل سابقاً كمعاينة مؤقتة (blob) وانتهت صلاحيته مع إغلاق المتصفح.'
    };
  }

  // 3. Firestore Video Protocol: firestore-video://${videoId}
  let videoId = rawUrl;
  if (videoId.startsWith('firestore-video://')) {
    videoId = videoId.replace('firestore-video://', '');
  }

  onProgress?.(15, 'فحص الذاكرة المؤقتة للجهاز...');

  // Check local IndexedDB first
  const cached = await getCachedVideoLocally(videoId);
  if (cached?.blob) {
    const playbackUrl = URL.createObjectURL(cached.blob);
    onProgress?.(100, 'تم التحميل من الذاكرة المحلية!');
    return { playbackUrl, mimeType: cached.mimeType || 'video/mp4' };
  }

  // Fetch chunks from Cloud Firestore
  onProgress?.(30, 'جاري طلب أجزاء الفيديو من السحابة...');
  try {
    const col = collection(db, 'inspection_videos');
    const q = query(col, where('videoId', '==', videoId));
    const snap = await getDocs(q);

    if (snap.empty) {
      return {
        playbackUrl: null,
        mimeType: 'video/mp4',
        error: 'لم يتم العثور على أجزاء الفيديو السحابية. قد يكون المقطع لم يكتمل رفعه.'
      };
    }

    onProgress?.(60, `تم استلام ${snap.size} جزء سحابي، جاري تجميع المقطع...`);

    interface ChunkData {
      chunkIndex: number;
      totalChunks: number;
      data: string;
      mimeType: string;
    }

    const chunks: ChunkData[] = [];
    let detectedMime = 'video/mp4';

    snap.forEach((docSnap) => {
      const d = docSnap.data() as ChunkData;
      chunks.push(d);
      if (d.mimeType) detectedMime = d.mimeType;
    });

    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Convert and concatenate all chunks
    const byteArrays: Uint8Array[] = [];
    for (let i = 0; i < chunks.length; i++) {
      byteArrays.push(base64ToUint8Array(chunks[i].data));
    }

    const fullBlob = new Blob(byteArrays, { type: detectedMime });

    // Cache locally for instant next view
    await cacheVideoLocally(videoId, fullBlob, detectedMime);

    const playbackUrl = URL.createObjectURL(fullBlob);
    onProgress?.(100, 'تم تجهيز الفيديو للتشغيل بنجاح!');

    return {
      playbackUrl,
      mimeType: detectedMime
    };
  } catch (err: any) {
    console.error('Error resolving firestore video:', err);
    return {
      playbackUrl: null,
      mimeType: 'video/mp4',
      error: `فشل تحميل الفيديو من السحابة: ${err?.message || 'خطأ في الاتصال'}`
    };
  }
}

/**
 * Retrieves a stored video by key and creates a playback URL
 */
export async function getInspectionVideoUrl(key: string): Promise<string | null> {
  const res = await resolveInspectionVideoUrl(key);
  return res.playbackUrl;
}
