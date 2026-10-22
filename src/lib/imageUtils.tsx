import React, { useState, useEffect } from 'react';
import { HelpCircle, CheckCircle2 } from 'lucide-react';

export interface UploadedImageInfo {
  name: string;
  origSize: string;
  origSizeBytes: number;
  compSize: string;
  compSizeBytes: number;
  origDim: string;
  compDim: string;
  savings?: string;
}

export const formatBytes = (bytes: number): string => {
  if (!bytes || bytes <= 0) return '0 بايت';
  if (bytes < 1024) return `${bytes} بايت`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} كيلوبايت`;
  const mb = kb / 1024;
  return `${mb.toFixed(2)} ميجابايت`;
};

export const getBase64SizeInBytes = (base64: string): number => {
  if (!base64 || !base64.startsWith('data:')) return 0;
  const parts = base64.split(',');
  if (!parts[1]) return 0;
  const padding = parts[1].endsWith('==') ? 2 : parts[1].endsWith('=') ? 1 : 0;
  return Math.max(0, Math.round((parts[1].length * 3) / 4) - padding);
};

export const compressImage = (
  base64Str: string, 
  maxWidth = 1200, 
  maxHeight = 1200, 
  quality = 0.75,
  preservePng = false
): Promise<string> => {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (!width || !height) {
            resolve(base64Str);
            return;
          }

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * (maxWidth / width));
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * (maxHeight / height));
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, width);
          canvas.height = Math.max(1, height);
          const ctx = canvas.getContext('2d');
          if (ctx) {
            const isPng = preservePng || base64Str.startsWith('data:image/png');
            if (!isPng) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL(isPng ? 'image/png' : 'image/jpeg', quality));
          } else {
            resolve(base64Str);
          }
        } catch (canvasErr) {
          console.warn('Canvas processing error:', canvasErr);
          resolve(base64Str);
        }
      };
      img.onerror = () => resolve(base64Str);
    } catch {
      resolve(base64Str);
    }
  });
};

export const ImageUploadSizeBadge = ({ 
  meta, 
  imageUrl, 
  recommended 
}: { 
  meta?: UploadedImageInfo; 
  imageUrl?: string; 
  recommended: { dimensions: string; idealSize: string; formats: string } 
}) => {
  const [liveInfo, setLiveInfo] = useState<{ dim?: string; size?: string } | null>(null);

  useEffect(() => {
    if (!imageUrl) {
      setLiveInfo(null);
      return;
    }
    if (meta) {
      setLiveInfo(null);
      return;
    }

    const img = new Image();
    img.src = imageUrl;
    img.onload = () => {
      const dim = img.naturalWidth ? `${img.naturalWidth} × ${img.naturalHeight} بكسل` : undefined;
      const size = imageUrl.startsWith('data:') ? formatBytes(getBase64SizeInBytes(imageUrl)) : undefined;
      setLiveInfo({ dim, size });
    };
    img.onerror = () => {
      setLiveInfo(null);
    };
  }, [imageUrl, meta]);

  return (
    <div className="space-y-2 mt-2 w-full text-right" dir="rtl">
      {/* Recommended Specs Box */}
      <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-gray-300">
        <div className="flex items-center gap-1.5 font-bold text-gray-200 mb-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-brand-red shrink-0" />
          <span>المقاسات والمواصفات الموصى بها:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
          <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-gray-400 block">الأبعاد الموصى بها:</span>
            <span className="font-bold text-white font-mono">{recommended.dimensions}</span>
          </div>
          <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-gray-400 block">الحجم الأقصى المثالي:</span>
            <span className="font-bold text-emerald-400 font-mono">{recommended.idealSize}</span>
          </div>
          <div className="bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/5">
            <span className="text-gray-400 block">الصيغ المفضلة:</span>
            <span className="font-bold text-gray-300 font-mono">{recommended.formats}</span>
          </div>
        </div>
      </div>

      {/* Selected Image Information Badge */}
      {meta ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 font-bold text-emerald-400">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="line-clamp-1">بيانات الصورة المرفوعة: {meta.name}</span>
            </div>
            {meta.savings && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono">
                توفير {meta.savings} عبر التحسين والضغط الذكي
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-black/50 p-2 rounded-lg border border-white/5">
              <span className="text-gray-400 block text-[10px]">الحجم الأصلي قبل الرفع:</span>
              <span className="font-bold text-white font-mono text-xs">{meta.origSize}</span>
              <span className="text-gray-400 text-[9px] block font-mono">({meta.origDim})</span>
            </div>
            <div className="bg-black/50 p-2 rounded-lg border border-brand-red/20">
              <span className="text-brand-red block text-[10px] font-bold">الحجم الفعلي المحفوظ:</span>
              <span className="font-bold text-white font-mono text-xs">{meta.compSize}</span>
              <span className="text-gray-400 text-[9px] block font-mono">({meta.compDim})</span>
            </div>
            <div className="bg-black/50 p-2 rounded-lg border border-white/5 col-span-2 sm:col-span-1 flex flex-col justify-center">
              <span className="text-gray-400 block text-[10px]">سرعة العرض والتصفح:</span>
              <span className="font-bold text-white text-xs flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-brand-red animate-pulse"></span>
                فائقة السرعة ومثالية ✓
              </span>
            </div>
          </div>
        </div>
      ) : liveInfo ? (
        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs flex flex-wrap items-center justify-between gap-2 text-gray-300">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />
            <span className="text-[11px] text-gray-400">بيانات الصورة الحالية:</span>
            {liveInfo.dim && <span className="font-mono text-white text-[11px] bg-black/40 px-1.5 py-0.5 rounded border border-white/5">{liveInfo.dim}</span>}
          </div>
          {liveInfo.size ? (
            <span className="font-mono font-bold text-white bg-brand-red/15 px-2 py-0.5 rounded text-[11px] border border-brand-red/30">
              حجم الملف: {liveInfo.size} (محسّنة للويب)
            </span>
          ) : (
            <span className="text-gray-400 text-[10px]">رابط صورة خارجي مباشر</span>
          )}
        </div>
      ) : null}
    </div>
  );
};
