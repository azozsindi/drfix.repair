import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Camera, 
  Video, 
  Square, 
  RotateCcw, 
  Check, 
  X, 
  Zap, 
  ZapOff, 
  SwitchCamera, 
  UploadCloud, 
  Clock, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { formatFileSize } from '../lib/videoCompressor';

interface FastVideoRecorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoCaptured: (videoBlob: Blob) => Promise<void> | void;
  onFallbackToFilePicker: () => void;
  title?: string;
  maxSeconds?: number;
}

export const FastVideoRecorderModal: React.FC<FastVideoRecorderModalProps> = ({
  isOpen,
  onClose,
  onVideoCaptured,
  onFallbackToFilePicker,
  title = 'تصوير فيديو فحص واستلام السيارة 🎥',
  maxSeconds = 25
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [hasTorchSupport, setHasTorchSupport] = useState(false);

  // Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement>(null);
  const recordedVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);

  // Start / restart live camera stream
  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    setCameraError(null);

    // Stop existing stream first
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('المتصفح الحالي لا يدعم الوصول المباشر للكاميرا. يمكنك اختيار فيديو من المعرض.');
      return;
    }

    try {
      // First attempt with rear camera and audio
      let userStream: MediaStream;
      try {
        userStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 24, max: 30 }
          },
          audio: true
        });
      } catch (audioErr) {
        console.warn('Could not acquire microphone, falling back to video only:', audioErr);
        // Fallback to video only if microphone permission is denied
        userStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      }

      setStream(userStream);

      // Check for torch/flashlight support on track
      const videoTrack = userStream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = (videoTrack.getCapabilities && videoTrack.getCapabilities()) as any;
        if (capabilities && 'torch' in capabilities) {
          setHasTorchSupport(true);
        } else {
          setHasTorchSupport(false);
        }
      }

      if (videoElementRef.current) {
        videoElementRef.current.srcObject = userStream;
        videoElementRef.current.play().catch(e => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Fast Camera access error:', err);
      let msg = 'تعذر فتح الكاميرا المباشرة.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'تم رفض إذن الكاميرا. يرجى تفعيل الإذن من إعدادات المتصفح، أو اختيار ملف فيديو من الاستوديو.';
      } else if (err.name === 'NotFoundError') {
        msg = 'لم يتم العثور على كاميرا في هذا الجهاز.';
      }
      setCameraError(msg);
    }
  }, [stream]);

  // Handle open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setRecordedBlob(null);
      setRecordedPreviewUrl(null);
      setIsRecording(false);
      setElapsedSeconds(0);
      startCamera(facingMode);
    } else {
      // Cleanup
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
        setStream(null);
      }
      if (recordedPreviewUrl) {
        URL.revokeObjectURL(recordedPreviewUrl);
        setRecordedPreviewUrl(null);
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Connect stream to video element whenever stream changes
  useEffect(() => {
    if (videoElementRef.current && stream && !recordedBlob) {
      videoElementRef.current.srcObject = stream;
      videoElementRef.current.play().catch(() => {});
    }
  }, [stream, recordedBlob]);

  // Toggle torch / flashlight
  const toggleTorch = async () => {
    if (!stream) return;
    const videoTrack = stream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      const nextState = !torchEnabled;
      await (videoTrack as any).applyConstraints({
        advanced: [{ torch: nextState }]
      });
      setTorchEnabled(nextState);
    } catch (e) {
      console.warn('Torch toggle not supported or failed:', e);
    }
  };

  // Switch camera facing
  const toggleCameraFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  // Start recording
  const handleStartRecording = () => {
    if (!stream) return;
    recordedChunksRef.current = [];
    setElapsedSeconds(0);

    // Pick best lightweight format
    let mimeType = 'video/webm';
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      mimeType = 'video/mp4;codecs=avc1';
    } else if (MediaRecorder.isTypeSupported('video/mp4')) {
      mimeType = 'video/mp4';
    } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      mimeType = 'video/webm;codecs=vp8';
    }

    try {
      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 1_200_000 // 1.2 Mbps = very small file size (~2.5 MB for 20s)
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const finalBlob = new Blob(recordedChunksRef.current, { type: mimeType });
        setRecordedBlob(finalBlob);
        const previewUrl = URL.createObjectURL(finalBlob);
        setRecordedPreviewUrl(previewUrl);
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start(1000); // 1-second chunks
      setIsRecording(true);

      // Start elapsed timer
      timerIntervalRef.current = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next >= maxSeconds) {
            handleStopRecording();
          }
          return next;
        });
      }, 1000);

    } catch (err) {
      console.error('Error starting MediaRecorder:', err);
      alert('تعذر بدء التسجيل المباشر، يمكنك اختيار فيديو من الاستوديو.');
    }
  };

  // Stop recording
  const handleStopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  // Retake video
  const handleRetake = () => {
    if (recordedPreviewUrl) {
      URL.revokeObjectURL(recordedPreviewUrl);
    }
    setRecordedBlob(null);
    setRecordedPreviewUrl(null);
    setElapsedSeconds(0);
    startCamera(facingMode);
  };

  // Confirm and submit video
  const handleConfirmVideo = async () => {
    if (!recordedBlob) return;
    setIsSubmitting(true);
    try {
      await onVideoCaptured(recordedBlob);
      onClose();
    } catch (err) {
      console.error('Error in onVideoCaptured:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col justify-between select-none overflow-hidden" dir="rtl">
      {/* Top Bar Header */}
      <div className="p-4 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white z-20">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">{title}</h3>
            <p className="text-[11px] text-gray-400">كاميرا ميدانية سريعة ومضغوطة تلقائياً ⚡</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Torch toggle if available */}
          {!recordedBlob && hasTorchSupport && (
            <button
              type="button"
              onClick={toggleTorch}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                torchEnabled 
                  ? 'bg-amber-400 text-black border-amber-300 shadow-lg shadow-amber-400/30' 
                  : 'bg-white/10 text-white border-white/15 hover:bg-white/20'
              }`}
              title="تشغيل/إطفاء فلاش الكاميرا"
            >
              {torchEnabled ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}

          {/* Camera switch (front/back) */}
          {!recordedBlob && !cameraError && (
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="p-2.5 rounded-xl bg-white/10 text-white border border-white/15 hover:bg-white/20 transition-all cursor-pointer"
              title="تبديل الكاميرا"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}

          {/* Close modal */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/15 transition-all cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Viewport Content */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-zinc-950">
        {/* Error Fallback */}
        {cameraError ? (
          <div className="p-6 max-w-md mx-auto text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h4 className="text-white font-bold text-base">تعذر فتح الكاميرا المباشرة</h4>
            <p className="text-xs text-gray-300 leading-relaxed">{cameraError}</p>

            <div className="pt-2 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackToFilePicker();
                }}
                className="w-full py-3.5 px-4 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-red/30 cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>تصوير / اختيار فيديو من كاميرا الجوال العادية</span>
              </button>
              <button
                type="button"
                onClick={() => startCamera(facingMode)}
                className="w-full py-2.5 text-xs text-gray-400 hover:text-white"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        ) : recordedBlob && recordedPreviewUrl ? (
          /* Recorded Preview Screen */
          <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <video
              ref={recordedVideoRef}
              src={recordedPreviewUrl}
              controls
              playsInline
              autoPlay
              className="max-h-[65vh] w-auto max-w-full rounded-2xl shadow-2xl border border-white/20 bg-black object-contain"
            />
            {/* Quick stats pill */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 rounded-full text-emerald-300 text-xs font-bold shadow-lg">
              <ShieldCheck className="w-4 h-4" />
              <span>مقطع مضغوط وخفيف ({formatFileSize(recordedBlob.size)}) - يُرفع بثانية واحدة ⚡</span>
            </div>
          </div>
        ) : (
          /* Live Camera Stream */
          <div className="relative w-full h-full flex items-center justify-center">
            <video
              ref={videoElementRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover"
            />

            {/* Viewfinder Target Overlays */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
              {/* Target Guide Header */}
              <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-center max-w-xs shadow-lg">
                <span className="text-xs font-bold text-white block">
                  {isRecording ? '🔴 جاري التسجيل الميداني...' : '🎯 دورة سريعة حول السيارة + العداد'}
                </span>
                <span className="text-[10px] text-gray-300">
                  {isRecording ? 'امش حول هيكل السيارة بهدوء لتوثيق الخدوش والبودي' : 'اضغط الزر الأحمر لبدء التسجيل (15-20 ثانية كافية)'}
                </span>
              </div>

              {/* Center Framing Reticle */}
              <div className="w-64 h-44 sm:w-80 sm:h-56 border-2 border-white/30 border-dashed rounded-3xl relative pointer-events-none opacity-60">
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-brand-red rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-brand-red rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-brand-red rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-brand-red rounded-br-lg" />
              </div>

              {/* Timer Progress Bar (Visible while recording) */}
              {isRecording && (
                <div className="w-full max-w-xs space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-white px-1">
                    <span className="flex items-center gap-1.5 text-red-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                      REC
                    </span>
                    <span>{elapsedSeconds}s / {maxSeconds}s</span>
                  </div>
                  <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 via-amber-500 to-brand-red transition-all duration-300"
                      style={{ width: `${Math.min(100, (elapsedSeconds / maxSeconds) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Controls Bar */}
      <div className="p-4 bg-gradient-to-t from-black via-black/90 to-transparent z-20 space-y-3">
        {recordedBlob ? (
          /* Confirm or Retake Controls */
          <div className="max-w-md mx-auto space-y-2">
            <button
              type="button"
              onClick={handleConfirmVideo}
              disabled={isSubmitting}
              className="w-full py-4 px-6 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 shadow-xl shadow-emerald-600/30 transition-all cursor-pointer active:scale-98 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري الحفظ والرفع السريع... ⚡</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>اعتماد وحفظ الفيديو فوراً ⚡</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRetake}
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-gray-200 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 text-amber-400" />
              <span>إعادة تصوير الفيديو 🔄</span>
            </button>
          </div>
        ) : !cameraError ? (
          /* Live Recording Controls */
          <div className="max-w-md mx-auto flex flex-col items-center gap-3">
            <div className="flex items-center justify-center w-full">
              {isRecording ? (
                /* Stop Recording Button */
                <button
                  type="button"
                  onClick={handleStopRecording}
                  className="w-20 h-20 rounded-full bg-brand-red border-4 border-white flex items-center justify-center shadow-2xl shadow-red-600/60 active:scale-95 transition-all cursor-pointer"
                >
                  <Square className="w-8 h-8 fill-white text-white" />
                </button>
              ) : (
                /* Start Recording Button */
                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="relative group p-1 rounded-full cursor-pointer"
                >
                  <div className="absolute inset-0 rounded-full bg-brand-red/40 animate-ping" />
                  <div className="relative w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-black/40 group-hover:scale-105 transition-all">
                    <div className="w-14 h-14 rounded-full bg-brand-red group-active:scale-90 transition-all shadow-lg shadow-brand-red/50" />
                  </div>
                </button>
              )}
            </div>

            {/* Alternative gallery option */}
            {!isRecording && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onFallbackToFilePicker();
                }}
                className="text-[11px] text-gray-300 hover:text-white flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer"
              >
                <UploadCloud className="w-3.5 h-3.5 text-brand-red" />
                <span>أو التقاط/اختيار فيديو من كاميرا الجوال العادية 📁</span>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
