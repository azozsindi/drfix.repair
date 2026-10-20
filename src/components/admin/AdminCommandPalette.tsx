import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, ArrowRight, CornerDownLeft, Plus, FileText, Bell, Globe } from 'lucide-react';
import { AdminTabId, ADMIN_NAV_ITEMS } from './types';
import { useScrollLock } from '../../lib/scrollLock';
import { cn } from '../../lib/utils';

interface AdminCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToTab: (tabId: AdminTabId) => void;
  onQuickNewBooking: () => void;
  lang: 'ar' | 'en';
}

export const AdminCommandPalette: React.FC<AdminCommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateToTab,
  onQuickNewBooking,
  lang
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const isRtl = lang === 'ar';

  useScrollLock(isOpen);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Global keydown listener for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const cleanQuery = query.trim().toLowerCase();

  const filteredItems = ADMIN_NAV_ITEMS.filter((item) => {
    if (!cleanQuery) return true;
    const label = (lang === 'ar' ? item.labelAr : item.labelEn).toLowerCase();
    return label.includes(cleanQuery) || item.id.includes(cleanQuery);
  });

  const handleSelect = (tabId: AdminTabId) => {
    onNavigateToTab(tabId);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filteredItems.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % (filteredItems.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        handleSelect(filteredItems[selectedIndex].id);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/80 backdrop-blur-sm">
      <div 
        className="fixed inset-0" 
        onClick={onClose} 
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="relative w-full max-w-xl bg-[#141720] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-10 flex flex-col text-[#F5F6F8]"
        dir={isRtl ? 'rtl' : 'ltr'}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#0E1015]">
          <Search className="w-5 h-5 text-[#F52B35] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={lang === 'ar' ? 'ابحث عن قسم أو صفحة أو إجراء...' : 'Search pages or actions...'}
            className="flex-1 bg-transparent text-sm sm:text-base text-white placeholder-[#A1A6B2] outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="p-1 rounded text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.08] text-gray-300 rounded border border-white/10">
            ESC
          </kbd>
        </div>

        {/* Quick Actions Shortcuts */}
        {!cleanQuery && (
          <div className="p-3 border-b border-white/[0.06] bg-[#090A0C]/50 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span className="text-[#A1A6B2] text-[11px] font-bold px-2 shrink-0">
              {lang === 'ar' ? 'إجراءات سريعة:' : 'Quick Actions:'}
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onQuickNewBooking();
              }}
              className="px-2.5 py-1 rounded-lg bg-[#F52B35]/20 hover:bg-[#F52B35]/30 text-[#FF414A] border border-[#F52B35]/30 font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إضافة حجز جديد' : 'New Booking'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelect('reports')}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'تقارير الصيانة' : 'Reports'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelect('notifications')}
              className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-gray-300 font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إشعارات FCM' : 'FCM Push'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate('/');
              }}
              className="px-2.5 py-1 rounded-lg bg-[#F52B35]/15 hover:bg-[#F52B35]/25 border border-[#F52B35]/30 text-white font-bold flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5 text-[#F52B35]" />
              <span>{lang === 'ar' ? 'الرجوع للموقع' : 'Back to Website'}</span>
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-tabs-scrollbar">
          {filteredItems.length > 0 ? (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-colors text-start cursor-pointer",
                    isSelected 
                      ? "bg-[#F52B35]/15 text-white font-bold border border-[#F52B35]/30" 
                      : "text-[#A1A6B2] hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className={cn(
                      "w-4 h-4 shrink-0",
                      isSelected ? "text-[#F52B35]" : "text-[#A1A6B2]"
                    )} />
                    <span className="truncate">
                      {lang === 'ar' ? item.labelAr : item.labelEn}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#A1A6B2]/60">
                    <span className="text-[11px] font-mono hidden sm:inline">{item.path}</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })
          ) : (
            <div className="py-8 text-center text-sm text-[#A1A6B2]">
              {lang === 'ar' ? 'لم يتم العثور على أي قسم يطابق بحثك' : 'No sections found matching your search'}
            </div>
          )}
        </div>

        {/* Footer Hint */}
        <div className="px-4 py-2 border-t border-white/[0.06] bg-[#0E1015] flex items-center justify-between text-[11px] text-[#A1A6B2]">
          <span>{lang === 'ar' ? 'استخدم الأسهم للتنقل و Enter للفتح' : 'Use arrow keys to navigate, Enter to select'}</span>
          <span>{lang === 'ar' ? `${filteredItems.length} قسم متاح` : `${filteredItems.length} sections`}</span>
        </div>
      </motion.div>
    </div>
  );
};
