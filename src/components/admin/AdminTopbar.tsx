import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Menu, 
  Search, 
  Bell, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Globe
} from 'lucide-react';
import { AdminTabId, ADMIN_NAV_ITEMS } from './types';
import { LanguageToggle } from '../../context/LanguageContext';
import { StaffUser } from '../../types';
import { cn } from '../../lib/utils';

interface AdminTopbarProps {
  currentTab: AdminTabId;
  lang: 'ar' | 'en';
  onOpenMobileSidebar: () => void;
  onOpenCommandPalette: () => void;
  onQuickNewBooking: () => void;
  onNavigateToTab: (tab: AdminTabId) => void;
  currentStaffUser?: StaffUser | null;
  unreadAlertsCount?: number;
  canManageBookings?: boolean;
}

export const AdminTopbar: React.FC<AdminTopbarProps> = ({
  currentTab,
  lang,
  onOpenMobileSidebar,
  onOpenCommandPalette,
  onQuickNewBooking,
  onNavigateToTab,
  currentStaffUser,
  unreadAlertsCount = 0,
  canManageBookings = true
}) => {
  const isRtl = lang === 'ar';
  const currentItem = ADMIN_NAV_ITEMS.find((i) => i.id === currentTab) || ADMIN_NAV_ITEMS[0];
  const CurrentIcon = currentItem.icon;

  return (
    <header className="h-16 sticky top-0 z-20 bg-[#090A0C]/90 backdrop-blur-md border-b border-white/[0.08] px-3 sm:px-6 flex items-center justify-between gap-3 text-[#F5F6F8] w-full min-w-0 max-w-full overflow-hidden">
      {/* Left / Start: Mobile Menu Button & Breadcrumbs */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 shrink-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="md:hidden w-10 h-10 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] active:bg-[#F52B35]/20 text-white transition-colors cursor-pointer shrink-0 border border-white/[0.08] flex items-center justify-center"
          aria-label={lang === 'ar' ? 'فتح القائمة الجانبية' : 'Open Sidebar'}
        >
          <Menu className="w-5 h-5 text-[#F52B35]" />
        </button>

        {/* Breadcrumb Path */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm overflow-hidden min-w-0">
          <span 
            onClick={() => onNavigateToTab('overview')}
            className="text-[#A1A6B2] hover:text-white transition-colors cursor-pointer hidden sm:inline truncate font-mono text-[11px]"
          >
            DR.FIX
          </span>
          <span className="text-[#A1A6B2]/40 hidden sm:inline">
            {isRtl ? <ChevronLeft className="w-3.5 h-3.5 inline" /> : <ChevronRight className="w-3.5 h-3.5 inline" />}
          </span>
          <div className="flex items-center gap-1.5 font-bold text-white truncate min-w-0">
            <CurrentIcon className="w-4 h-4 text-[#F52B35] shrink-0" />
            <h1 className="text-xs sm:text-sm font-bold truncate">
              {lang === 'ar' ? currentItem.labelAr : currentItem.labelEn}
            </h1>
          </div>
        </div>
      </div>

      {/* Center / Right: Quick Search, Language, Notifications & Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Global Search Button with ⌘K / Ctrl+K badge */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl bg-[#141720] hover:bg-[#1C202A] border border-white/[0.08] text-[#A1A6B2] hover:text-white text-xs transition-all cursor-pointer group shadow-sm shrink-0 active:scale-95"
          title={lang === 'ar' ? 'بحث سريع (Ctrl+K)' : 'Quick Search (Ctrl+K)'}
        >
          <Search className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#F52B35] group-hover:scale-110 transition-transform" />
          <span className="hidden lg:inline text-xs">
            {lang === 'ar' ? 'بحث سريع في النظام...' : 'Quick search...'}
          </span>
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono bg-white/[0.06] text-gray-400 rounded border border-white/10">
            ⌘K
          </kbd>
        </button>

        {/* Back to Website Button */}
        <Link
          to="/"
          className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 rounded-xl bg-[#141720] hover:bg-[#1C202A] border border-white/[0.12] hover:border-[#F52B35]/60 text-white text-xs font-bold transition-all cursor-pointer shadow-sm group active:scale-95 shrink-0"
          title={lang === 'ar' ? 'الرجوع إلى الموقع الرئيسي' : 'Back to Website'}
        >
          <Globe className="w-4 h-4 sm:w-3.5 sm:h-3.5 text-[#F52B35] group-hover:scale-110 transition-transform shrink-0" />
          <span className="hidden sm:inline text-[11px] sm:text-xs font-bold whitespace-nowrap">
            {lang === 'ar' ? 'الرجوع للموقع' : 'Back to Site'}
          </span>
        </Link>

        {/* Language Switcher */}
        <div className="shrink-0">
          <LanguageToggle className="bg-[#141720] border-white/[0.08]" />
        </div>

        {/* Notifications Icon with Unread Pill */}
        <button
          type="button"
          onClick={() => onNavigateToTab('notifications')}
          className="relative w-10 h-10 flex items-center justify-center rounded-xl bg-[#141720] hover:bg-[#1C202A] border border-white/[0.08] text-gray-300 hover:text-white transition-all cursor-pointer shadow-sm group shrink-0 active:scale-95"
          title={lang === 'ar' ? 'مركز التنبيهات والإشعارات' : 'Notifications Hub'}
          aria-label={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
        >
          <Bell className="w-4 h-4 text-gray-300 group-hover:text-[#F52B35] transition-colors" />
          {unreadAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#F52B35] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-[#090A0C] animate-pulse">
              {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
            </span>
          )}
        </button>

        {/* Quick Action: New Booking */}
        {canManageBookings && (
          <button
            type="button"
            onClick={onQuickNewBooking}
            className="flex items-center justify-center gap-1.5 w-10 h-10 sm:w-auto sm:h-auto sm:px-3.5 sm:py-2 rounded-xl bg-gradient-to-r from-[#F52B35] to-[#D11C25] hover:from-[#FF414A] hover:to-[#E0242E] text-white font-bold text-xs sm:text-sm transition-all shadow-md shadow-[#F52B35]/25 hover:shadow-lg cursor-pointer shrink-0 active:scale-95"
            title={lang === 'ar' ? 'حجز جديد' : 'New Booking'}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden md:inline whitespace-nowrap">
              {lang === 'ar' ? 'حجز جديد' : 'New Booking'}
            </span>
          </button>
        )}
      </div>
    </header>
  );
};
