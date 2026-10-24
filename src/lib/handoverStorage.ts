import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  progressPercent: number;
  state: 'running' | 'paused' | 'success' | 'error';
  downloadUrl?: string;
  error?: string;
}

/**
 * High-performance client-side image compression using HTML5 Canvas.
 * Compresses smartphone camera photos (often 5-15MB) into high-clarity 150-250KB JPEGs.
 */
export async function compressImageForHandover(file: File, maxDimension = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    // If not an image, return raw file
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        // Draw and compress to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Blob/File to Data URL fallback if storage is restricted
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Uploads media file to Firebase Storage with progress tracking and fallback resilience.
 */
export async function uploadHandoverMediaFile(
  file: File,
  folder: 'intake' | 'faults' | 'repair' | 'final',
  handoverCode: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<{ downloadUrl: string; storagePath: string; isVideo: boolean }> {
  const isVideo = file.type.startsWith('video/') || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name);
  const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name);

  // 1. Validation
  if (isVideo) {
    const maxVideoSize = 60 * 1024 * 1024; // 60MB
    if (file.size > maxVideoSize) {
      throw new Error('حجم الفيديو يتجاوز 60 ميجابايت. يرجى اختيار فيديو أقصر أو بجودة مناسبة.');
    }
  }

  // 2. Prepare upload payload
  let uploadPayload: Blob | File = file;
  if (isImage) {
    try {
      uploadPayload = await compressImageForHandover(file);
    } catch (err) {
      console.warn('Client image compression skipped, uploading original:', err);
      uploadPayload = file;
    }
  }

  // 3. Unique storage path to guarantee no overwrites
  const cleanCode = handoverCode.replace(/[^a-zA-Z0-9_-]/g, '') || 'VH-GEN';
  const timestamp = Date.now();
  const randomSalt = Math.random().toString(36).substring(2, 8);
  const ext = file.name.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
  const storagePath = `handovers/${cleanCode}/${folder}/${timestamp}_${randomSalt}.${ext}`;

  // 4. Firebase Storage Upload Task
  return new Promise((resolve, reject) => {
    try {
      const storageRef = ref(storage, storagePath);
      const metadata = {
        contentType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
        customMetadata: {
          handoverCode,
          originalName: file.name,
          uploadedAt: new Date().toISOString()
        }
      };

      const uploadTask = uploadBytesResumable(storageRef, uploadPayload, metadata);

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progressPercent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) {
            onProgress({
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes,
              progressPercent,
              state: 'running'
            });
          }
        },
        async (error) => {
          console.warn('Firebase Storage upload failed, attempting fallback:', error);
          // If storage bucket is blocked or offline, fallback to Data URL for image (so work is not lost)
          if (isImage) {
            try {
              const dataUrl = await blobToDataUrl(uploadPayload);
              if (onProgress) {
                onProgress({
                  bytesTransferred: uploadPayload.size,
                  totalBytes: uploadPayload.size,
                  progressPercent: 100,
                  state: 'success',
                  downloadUrl: dataUrl
                });
              }
              resolve({
                downloadUrl: dataUrl,
                storagePath: 'local_fallback',
                isVideo: false
              });
              return;
            } catch (fallbackErr) {
              reject(error);
              return;
            }
          }
          reject(new Error(`فشل رفع الملف إلى التخزين السحابي: ${error.message}`));
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            if (onProgress) {
              onProgress({
                bytesTransferred: uploadTask.snapshot.totalBytes,
                totalBytes: uploadTask.snapshot.totalBytes,
                progressPercent: 100,
                state: 'success',
                downloadUrl
              });
            }
            resolve({
              downloadUrl,
              storagePath,
              isVideo
            });
          } catch (err: any) {
            reject(new Error(`فشل استخراج رابط التحميل: ${err?.message}`));
          }
        }
      );
    } catch (outerErr: any) {
      console.error('Fatal storage upload error:', outerErr);
      reject(outerErr);
    }
  });
}
