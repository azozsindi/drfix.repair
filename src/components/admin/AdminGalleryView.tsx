import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Eye, 
  Upload, 
  Filter, 
  X, 
  ExternalLink,
  Tag,
  Edit3
} from 'lucide-react';
import { cn } from '../../lib/utils';

interface AdminGalleryViewProps {
  gallery: any[];
  lang: 'ar' | 'en';
  onAddImage: () => void;
  onEditImage?: (item: any) => void;
  onDeleteImage: (id: string) => void;
}

export const AdminGalleryView: React.FC<AdminGalleryViewProps> = ({
  gallery,
  lang,
  onAddImage,
  onEditImage,
  onDeleteImage
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [previewImage, setPreviewImage] = useState<any | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const categories = [
    { id: 'all', labelAr: 'الكل', labelEn: 'All' },
    { id: 'before_after', labelAr: 'قبل وبعد', labelEn: 'Before & After' },
    { id: 'diagnostics', labelAr: 'فحص كمبيوتر', labelEn: 'Diagnostics' },
    { id: 'maintenance', labelAr: 'صيانة متنقلة', labelEn: 'Mobile Maintenance' },
    { id: 'fleet', labelAr: 'أسطول العمليات', labelEn: 'Fleet Vehicles' }
  ];

  const filteredGallery = gallery.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="space-y-6"
    >
      {/* Header and Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#141720] border border-white/[0.08] shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-[#F52B35]" />
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {lang === 'ar' ? 'إدارة معرض الأعمال والميدان' : 'Media Gallery Management'}
            </h2>
          </div>
          <p className="text-xs text-[#A1A6B2] mt-1">
            {lang === 'ar' 
              ? `إدارة صور وفيديوهات إنجازات DR.FIX المعروضة في المعرض العام (${gallery.length} عنصر)`
              : `Manage verified photos of mechanic work and field repairs (${gallery.length} items)`}
          </p>
        </div>

        <button
          type="button"
          onClick={onAddImage}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white text-xs font-bold transition-all shadow-lg shadow-[#F52B35]/25 hover:shadow-xl hover:shadow-[#F52B35]/35 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>{lang === 'ar' ? 'إضافة صورة للمعرض' : 'Upload Image'}</span>
        </button>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-tabs-scrollbar">
        <Filter className="w-4 h-4 text-gray-400 shrink-0 mx-1" />
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0",
              selectedCategory === cat.id
                ? "bg-[#F52B35] text-white shadow-md shadow-[#F52B35]/30"
                : "bg-[#141720] hover:bg-white/[0.06] text-[#A1A6B2] hover:text-white border border-white/[0.06]"
            )}
          >
            {lang === 'ar' ? cat.labelAr : cat.labelEn}
          </button>
        ))}
      </div>

      {/* Gallery Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredGallery.length > 0 ? (
          filteredGallery.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-2xl overflow-hidden bg-[#141720] border border-white/[0.08] aspect-square flex flex-col justify-end shadow-md hover:shadow-xl transition-all duration-200"
            >
              <img
                src={item.url || item.imageUrl || '/hero-custom.jpg'}
                alt={item.title || 'صورة من أعمال DR.FIX'}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />

              {/* Top Controls */}
              <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <span className="px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-md text-[10px] text-gray-200 font-mono">
                  {item.category || 'عام'}
                </span>

                <div className="flex items-center gap-1.5">
                  {onEditImage && (
                    <button
                      type="button"
                      onClick={() => onEditImage(item)}
                      className="p-1.5 rounded-lg bg-black/60 hover:bg-[#F52B35] text-white backdrop-blur-md transition-colors cursor-pointer"
                      title={lang === 'ar' ? 'تعديل الصورة والبيانات' : 'Edit Image'}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewImage(item)}
                    className="p-1.5 rounded-lg bg-black/60 hover:bg-white/20 text-white backdrop-blur-md transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'معاينة بالحجم الكامل' : 'Preview'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 text-white backdrop-blur-md transition-colors cursor-pointer"
                    title={lang === 'ar' ? 'حذف الصورة' : 'Delete'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Bottom Caption */}
              <div className="relative p-3 z-10 space-y-0.5">
                <h4 className="text-xs sm:text-sm font-bold text-white truncate">
                  {item.title || (lang === 'ar' ? 'صيانة موثقة ميدانياً' : 'Field Maintenance')}
                </h4>
                {item.description && (
                  <p className="text-[11px] text-[#A1A6B2] truncate">{item.description}</p>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-16 text-center rounded-2xl bg-[#141720] border border-dashed border-white/10 p-6 space-y-3">
            <Camera className="w-12 h-12 text-gray-600 mx-auto" />
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'لا توجد صور في هذا التصنيف' : 'No images in this category'}
            </h4>
            <p className="text-xs text-[#A1A6B2] max-w-sm mx-auto">
              {lang === 'ar' ? 'قم برفع صور جديدة لإظهار كفاءة واحترافية فريق DR.FIX في الميدان' : 'Upload photos of real maintenance operations to build trust'}
            </p>
            <button
              type="button"
              onClick={onAddImage}
              className="px-4 py-2 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>{lang === 'ar' ? 'رفع صورة جديدة' : 'Upload Image'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Full Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <div className="relative max-w-3xl w-full max-h-[90vh] flex flex-col items-center">
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="absolute -top-10 right-0 p-2 text-white hover:text-[#F52B35] transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <img
                src={previewImage.url || previewImage.imageUrl}
                alt={previewImage.title}
                className="max-h-[75vh] w-auto object-contain rounded-2xl shadow-2xl border border-white/10"
              />

              <div className="mt-3 text-center text-white">
                <h4 className="text-sm font-bold">{previewImage.title}</h4>
                <p className="text-xs text-[#A1A6B2]">{previewImage.description}</p>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'تأكيد حذف الصورة' : 'Confirm Image Deletion'}
            </h4>
            <p className="text-xs text-[#A1A6B2] leading-relaxed">
              {lang === 'ar' 
                ? 'هل أنت متأكد من حذف هذه الصورة من المعرض العام؟'
                : 'Are you sure you want to remove this photo from the media gallery?'}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteImage(deleteConfirmId);
                  setDeleteConfirmId(null);
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-red-600/30"
              >
                {lang === 'ar' ? 'حذف' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};
