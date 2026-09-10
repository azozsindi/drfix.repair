import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  RotateCcw, 
  Download, 
  ExternalLink, 
  AlertTriangle, 
  RefreshCw, 
  Camera, 
  Film,
  X
} from 'lucide-react';
import { resolveInspectionVideoUrl } from '../lib/videoStorage';

interface InspectionVideoPlayerProps {
  videoUrl?: string;
  poster?: string;
  title?: string;
  caption?: string;
  onClose?: () => void;
  onReupload?: (file: File) => void;
  allowReupload?: boolean;
  className?: string;
}

export const InspectionVideoPlayer: React.FC<InspectionVideoPlayerProps> = ({
  videoUrl,
  poster,
  title,
  caption,
  onClose,
  onReupload,
  allowReupload = false,
  className = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reuploadInputRef = useRef<HTMLInputElement>(null);

  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('video/mp4');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('جاري تحضير مشغل الفيديو...');
  const [isExpiredBlob, setIsExpiredBlob] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Playback states
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [showControls, setShowControls] = useState<boolean>(true);

  // Load and resolve video URL on mount or change
  useEffect(() => {
    let isCancelled = false;

    async function loadVideo() {
      if (!videoUrl) {
        setIsLoading(false);
        setErrorMessage('لا يوجد رابط فيديو مسجل لهذه العملية.');
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);
      setIsExpiredBlob(false);
      setProgressPercent(10);
      setStatusMessage('جاري الاتصال بقاعدة البيانات السحابية...');

      try {
        const result = await resolveInspectionVideoUrl(videoUrl, (pct, msg) => {
          if (!isCancelled) {
            setProgressPercent(pct);
            setStatusMessage(msg);
          }
        });

        if (isCancelled) return;

        if (result.isExpiredBlob) {
          setIsExpiredBlob(true);
          setErrorMessage(result.error || 'عذراً، هذا الفيديو سُجّل سابقاً كرابط محلي مؤقت (blob) وانتهت صلاحيته.');
          setIsLoading(false);
          return;
        }

        if (result.error || !result.playbackUrl) {
          setErrorMessage(result.error || 'تعذر تشغيل هذا المقطع.');
          setIsLoading(false);
          return;
        }

        setResolvedUrl(result.playbackUrl);
        setMimeType(result.mimeType || 'video/mp4');
        setIsLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Video resolve error:', err);
          setErrorMessage('حدث خطأ أثناء تحميل الفيديو: ' + (err?.message || 'خطأ غير معروف'));
          setIsLoading(false);
        }
      }
    }

    loadVideo();

    return () => {
      isCancelled = true;
    };
  }, [videoUrl]);

  // Video event handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play().catch((err) => {
        console.warn('Playback prevented or failed:', err);
      });
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    setDuration(videoRef.current.duration || 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (!videoRef.current) return;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleToggleFullscreen = () => {
    if (!videoRef.current) return;
    const el = videoRef.current;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if ((el as any).webkitEnterFullscreen) {
        (el as any).webkitEnterFullscreen();
      }
    }
  };

  const cyclePlaybackSpeed = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackSpeed(nextSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && onReupload) {
      onReupload(files[0]);
    }
  };

  return (
    <div className={`relative w-full flex flex-col items-center select-none ${className}`}>
      {/* Top Header with title & close button */}
      <div className="w-full flex items-center justify-between pb-2 text-white px-1">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-brand-red animate-pulse" />
          <span className="text-xs sm:text-sm font-bold truncate">
            {title || 'فيديو معاينة وفحص السيارة'}
          </span>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="إغلاق مشغل الفيديو"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Video Box / Display Area */}
      <div 
        className="relative w-full max-h-[75vh] sm:max-h-[78vh] flex items-center justify-center bg-black rounded-2xl overflow-hidden border border-white/15 shadow-2xl group/player"
        onMouseEnter={() => setShowControls(true)}
        onTouchStart={() => setShowControls(true)}
      >
        {/* Loading State with Progress Bar */}
        {isLoading && (
          <div className="w-full h-64 sm:h-80 flex flex-col items-center justify-center p-6 text-center bg-gray-950/90 text-white space-y-4">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-brand-red/20 border-t-brand-red animate-spin" />
              <Film className="w-6 h-6 text-brand-red" />
            </div>
            <div className="space-y-1.5 max-w-sm">
              <p className="text-sm font-bold text-white">{statusMessage}</p>
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-brand-red to-amber-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-400 font-mono">{progressPercent}% مكتمل</p>
            </div>
          </div>
        )}

        {/* Expired Blob or Error State */}
        {!isLoading && (isExpiredBlob || errorMessage) && (
          <div className="w-full min-h-64 p-6 flex flex-col items-center justify-center text-center bg-gray-950 text-white space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5 max-w-md">
              <h4 className="text-sm sm:text-base font-black text-amber-300">
                {isExpiredBlob ? 'الفيديو مسجل مسبقاً برابط محلي منتهي الصلاحية' : 'تعذر تشغيل مقطع الفيديو'}
              </h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                {isExpiredBlob 
                  ? 'هذا المقطع تم تصويره قبل تفعيل الحفظ السحابي التلقائي، وكان مخزناً كذاكرة مؤقتة (blob:) في جهاز الفني وانتهت مع إغلاق المتصفح. يمكنك إعادة إرفاق الفيديو الآن ليتم رفعه بشكل دائم في السحابة.'
                  : errorMessage}
              </p>
            </div>

            {/* Re-upload Action button */}
            {allowReupload && onReupload && (
              <div className="pt-2">
                <input 
                  type="file" 
                  ref={reuploadInputRef}
                  onChange={handleFilePicked}
                  accept="video/*"
                  capture="environment"
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => reuploadInputRef.current?.click()}
                  className="px-4 py-2.5 bg-brand-red hover:bg-red-700 text-white text-xs sm:text-sm font-black rounded-xl inline-flex items-center gap-2 shadow-lg shadow-brand-red/30 transition-all cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>تسجيل / إعادة إرفاق فيديو الفحص للسحابة 🎥</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Video Player Render */}
        {!isLoading && resolvedUrl && (
          <>
            <video
              ref={videoRef}
              src={resolvedUrl}
              poster={poster}
              playsInline
              preload="metadata"
              onClick={togglePlay}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              className="w-full max-h-[75vh] sm:max-h-[78vh] object-contain rounded-2xl bg-black cursor-pointer"
            >
              <source src={resolvedUrl} type={mimeType} />
              متصفحك لا يدعم تشغيل هذا المقطع.
            </video>

            {/* Central Play/Pause Watermark Button when paused */}
            {!isPlaying && (
              <div 
                onClick={togglePlay}
                className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer"
              >
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-brand-red/95 hover:bg-brand-red text-white flex items-center justify-center shadow-2xl shadow-brand-red/50 hover:scale-105 active:scale-95 transition-all">
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current translate-x-0.5" />
                </div>
              </div>
            )}

            {/* Floating Custom Controls Bar */}
            <div 
              className={`absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent transition-opacity duration-300 ${
                showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {/* Timeline scrubber */}
              <div className="w-full flex items-center gap-2 mb-2">
                <span className="text-[10px] text-gray-300 font-mono w-9 text-right">
                  {formatTime(currentTime)}
                </span>
                <input 
                  type="range"
                  min="0"
                  max={duration || 1}
                  step="0.1"
                  value={currentTime}
                  onChange={handleSeek}
                  className="flex-1 h-1.5 bg-white/25 rounded-lg appearance-none cursor-pointer accent-brand-red"
                />
                <span className="text-[10px] text-gray-400 font-mono w-9 text-left">
                  {formatTime(duration)}
                </span>
              </div>

              {/* Bottom buttons row */}
              <div className="flex items-center justify-between text-white">
                <div className="flex items-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />}
                  </button>

                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>

                  <button
                    type="button"
                    onClick={cyclePlaybackSpeed}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-white/10 hover:bg-white/20 transition-colors cursor-pointer"
                    title="تغيير سرعة التشغيل"
                  >
                    {playbackSpeed}x
                  </button>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFullscreen}
                    className="p-1.5 rounded-lg hover:bg-white/15 transition-colors cursor-pointer"
                    title="ملء الشاشة"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Action Footer: Download, External Tab & Caption */}
      <div className="w-full mt-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs text-gray-300">
        <div className="flex items-center gap-2 flex-wrap">
          {resolvedUrl && (
            <>
              <a
                href={resolvedUrl}
                download={`${title || 'inspection_video'}.mp4`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold border border-emerald-500/30 transition-all cursor-pointer"
                title="تنزيل نسخة من الفيديو على جهازك"
              >
                <Download className="w-3.5 h-3.5" />
                <span>تنزيل الفيديو 📥</span>
              </a>

              <a
                href={resolvedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium border border-white/15 transition-all cursor-pointer"
                title="فتح الفيديو في نافذة مستقلة"
              >
                <ExternalLink className="w-3.5 h-3.5 text-brand-red" />
                <span>فتح في تبويب مستقل ↗</span>
              </a>
            </>
          )}

          {allowReupload && onReupload && !isExpiredBlob && (
            <>
              <input 
                type="file" 
                ref={reuploadInputRef}
                onChange={handleFilePicked}
                accept="video/*"
                capture="environment"
                className="hidden" 
              />
              <button
                type="button"
                onClick={() => reuploadInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/15 transition-all cursor-pointer"
                title="استبدال الفيديو بفيديو آخر"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>إعادة تسجيل/رفع مقطع جديد</span>
              </button>
            </>
          )}
        </div>

        {caption && (
          <p className="text-[11px] text-gray-400 italic text-center sm:text-left">
            {caption}
          </p>
        )}
      </div>
    </div>
  );
};
