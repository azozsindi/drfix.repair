// Fast Client-Side Video Compressor for Dr.Fix Mobile Technicians
// Reduces 50MB - 120MB raw 4K/1080p phone camera recordings to ~2-4MB in seconds

export function formatFileSize(bytes: number): string {
  if (!bytes || isNaN(bytes)) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Compresses a heavy video file in the browser before network upload
 * @param file The original recorded or selected video file/blob
 * @param maxSizeMB Size threshold in MB (files smaller than this won't be re-encoded)
 * @param onProgress Callback receiving percentage and friendly Arabic status message
 */
export async function compressVideoFile(
  file: File | Blob,
  maxSizeMB = 6,
  onProgress?: (percent: number, statusText: string) => void
): Promise<Blob> {
  const currentSizeMB = file.size / (1024 * 1024);

  // If already under size threshold, return directly for maximum speed
  if (currentSizeMB <= maxSizeMB) {
    onProgress?.(100, `حجم الفيديو مناسب (${currentSizeMB.toFixed(1)} MB)، جاهز للرفع السريع!`);
    return file;
  }

  // Safety check: browser must support HTML5 video and MediaRecorder
  if (
    typeof window === 'undefined' ||
    typeof document === 'undefined' ||
    typeof MediaRecorder === 'undefined'
  ) {
    return file;
  }

  onProgress?.(5, `جاري تجهيز ضغط الفيديو (${currentSizeMB.toFixed(1)} MB ⬅️ ~3 MB)...`);

  return new Promise((resolve) => {
    let isFinished = false;
    let objectUrl = '';

    const cleanUpAndResolve = (resultBlob: Blob) => {
      if (isFinished) return;
      isFinished = true;
      if (objectUrl) {
        try { URL.revokeObjectURL(objectUrl); } catch {}
      }
      resolve(resultBlob);
    };

    // Hard safety timeout: if browser takes more than 12 seconds, fallback to original
    const safetyTimeout = setTimeout(() => {
      console.warn('[VideoCompressor] Compression timeout reached, proceeding with original file.');
      cleanUpAndResolve(file);
    }, 12000);

    try {
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.autoplay = false;
      video.preload = 'metadata';

      objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      video.onloadedmetadata = async () => {
        try {
          const duration = video.duration;

          // If duration is unknown or too long (>3 minutes), bypass compression
          if (!duration || isNaN(duration) || duration > 180) {
            clearTimeout(safetyTimeout);
            return cleanUpAndResolve(file);
          }

          let width = video.videoWidth || 854;
          let height = video.videoHeight || 480;

          // Target 720p maximum dimension (ideal for sharp inspection details at low size)
          const targetMax = 720;
          if (width > targetMax || height > targetMax) {
            if (width > height) {
              height = Math.round((height * targetMax) / width);
              width = targetMax;
            } else {
              width = Math.round((width * targetMax) / height);
              height = targetMax;
            }
          }

          // Ensure even dimensions for video codecs
          width = width % 2 === 0 ? width : width - 1;
          height = height % 2 === 0 ? height : height - 1;

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d', { alpha: false });

          if (!ctx) {
            clearTimeout(safetyTimeout);
            return cleanUpAndResolve(file);
          }

          const stream = canvas.captureStream ? canvas.captureStream(24) : null;
          if (!stream) {
            clearTimeout(safetyTimeout);
            return cleanUpAndResolve(file);
          }

          // Choose most compact supported mime type
          let selectedMime = 'video/webm';
          if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
            selectedMime = 'video/mp4;codecs=avc1';
          } else if (MediaRecorder.isTypeSupported('video/mp4')) {
            selectedMime = 'video/mp4';
          } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
            selectedMime = 'video/webm;codecs=vp8';
          }

          const recorder = new MediaRecorder(stream, {
            mimeType: selectedMime,
            videoBitsPerSecond: 1_200_000 // 1.2 Mbps -> 20s ≈ 3MB
          });

          const recordedChunks: Blob[] = [];

          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              recordedChunks.push(event.data);
            }
          };

          recorder.onstop = () => {
            clearTimeout(safetyTimeout);
            const compressedBlob = new Blob(recordedChunks, { type: selectedMime });

            // Only use compressed if it's smaller and non-empty
            if (compressedBlob.size > 2048 && compressedBlob.size < file.size) {
              const savedPct = Math.round((1 - compressedBlob.size / file.size) * 100);
              const compressedMB = (compressedBlob.size / (1024 * 1024)).toFixed(1);
              onProgress?.(100, `تم ضغط الفيديو بنسبة ${savedPct}% إلى ${compressedMB} MB! ⚡`);
              cleanUpAndResolve(compressedBlob);
            } else {
              cleanUpAndResolve(file);
            }
          };

          // Play at accelerated rate for rapid compression
          video.playbackRate = 2.5;
          recorder.start();
          await video.play();

          let animationFrameId: number;
          const renderLoop = () => {
            if (video.paused || video.ended || isFinished) {
              if (recorder.state === 'recording') {
                recorder.stop();
              }
              return;
            }

            ctx.drawImage(video, 0, 0, width, height);

            const progress = Math.min(
              90,
              10 + Math.round((video.currentTime / duration) * 80)
            );
            onProgress?.(progress, `جاري تسريع وضغط الفيديو فائق الدقة (${progress}%)...`);

            animationFrameId = requestAnimationFrame(renderLoop);
          };

          renderLoop();

          video.onended = () => {
            cancelAnimationFrame(animationFrameId);
            if (recorder.state === 'recording') {
              recorder.stop();
            }
          };

        } catch (innerErr) {
          console.warn('[VideoCompressor] Failed inside metadata handler:', innerErr);
          clearTimeout(safetyTimeout);
          cleanUpAndResolve(file);
        }
      };

      video.onerror = () => {
        clearTimeout(safetyTimeout);
        cleanUpAndResolve(file);
      };

    } catch (e) {
      clearTimeout(safetyTimeout);
      cleanUpAndResolve(file);
    }
  });
}
