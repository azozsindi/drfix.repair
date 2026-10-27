import React from 'react';
import { Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  Settings, 
  Menu, 
  Globe
} from 'lucide-react';
import { AdminTabId } from './types';
import { cn } from '../../lib/utils';

interface AdminMobileDockProps {
  currentTab: AdminTabId;
  onSelectTab: (tabId: AdminTabId) => void;
  onOpenMobileSidebar: () => void;
  pendingBookingsCount?: number;
  lang: 'ar' | 'en';
}

export const AdminMobileDock: React.FC<AdminMobileDockProps> = ({
  currentTab,
  onSelectTab,
  onOpenMobileSidebar,
  pendingBookingsCount = 0,
  lang
}) => {
  const isOverview = currentTab === 'overview' || currentTab === 'dashboard';
  const isBookings = currentTab === 'bookings';
  const isSettings = currentTab === 'settings';

  return (
    <nav 
      aria-label="Admin Mobile Navigation Dock"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#090A0C]/95 backdrop-blur-xl border-t border-white/[0.12] px-2 py-1.5 pb-safe shadow-[0_-8px_25px_rgba(0,0,0,0.85)] select-none"
    >
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto">
        {/* 1. الرئيسية (Overview / Home) - Rightmost in RTL */}
        <button
          type="button"
          onClick={() => onSelectTab('overview')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[50px] active:scale-95",
            isOverview 
              ? "bg-[#F52B35]/20 text-[#FF414A] font-bold border border-[#F52B35]/35 shadow-sm shadow-[#F52B35]/20" 
              : "text-[#A1A6B2] hover:text-white hover:bg-white/[0.04]"
          )}
          title={lang === 'ar' ? 'الرئيسية' : 'Overview'}
        >
          <LayoutDashboard className={cn("w-5 h-5", isOverview ? "text-[#F52B35]" : "text-[#A1A6B2]")} />
          <span className="text-[11px] font-bold tracking-tight mt-0.5 truncate max-w-full">
            {lang === 'ar' ? 'الرئيسية' : 'Overview'}
          </span>
        </button>

        {/* 2. الحجوزات (Bookings) */}
        <button
          type="button"
          onClick={() => onSelectTab('bookings')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[50px] relative active:scale-95",
            isBookings 
              ? "bg-[#F52B35]/20 text-[#FF414A] font-bold border border-[#F52B35]/35 shadow-sm shadow-[#F52B35]/20" 
              : "text-[#A1A6B2] hover:text-white hover:bg-white/[0.04]"
          )}
          title={lang === 'ar' ? 'الحجوزات' : 'Bookings'}
        >
          <div className="relative">
            <Wrench className={cn("w-5 h-5", isBookings ? "text-[#F52B35]" : "text-[#A1A6B2]")} />
            {pendingBookingsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 px-1 py-0.2 bg-[#F52B35] text-white text-[9px] font-black rounded-full min-w-[15px] h-[15px] flex items-center justify-center shadow-md animate-pulse">
                {pendingBookingsCount > 9 ? '9+' : pendingBookingsCount}
              </span>
            )}
          </div>
          <span className="text-[11px] font-bold tracking-tight mt-0.5 truncate max-w-full">
            {lang === 'ar' ? 'الحجوزات' : 'Bookings'}
          </span>
        </button>

        {/* 3. الموقع (Live Website) */}
        <Link
          to="/"
          className="flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl text-emerald-400 hover:text-emerald-300 hover:bg-white/[0.04] transition-all cursor-pointer min-h-[50px] active:scale-95"
          title={lang === 'ar' ? 'الموقع' : 'Website'}
        >
          <Globe className="w-5 h-5 text-emerald-400" />
          <span className="text-[11px] font-bold tracking-tight mt-0.5 truncate max-w-full">
            {lang === 'ar' ? 'الموقع' : 'Website'}
          </span>
        </Link>

        {/* 4. الإعدادات (Settings) - Leftmost in RTL */}
        <button
          type="button"
          onClick={() => onSelectTab('settings')}
          className={cn(
            "flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all cursor-pointer min-h-[50px] active:scale-95",
            isSettings 
              ? "bg-[#F52B35]/20 text-[#FF414A] font-bold border border-[#F52B35]/35 shadow-sm shadow-[#F52B35]/20" 
              : "text-[#A1A6B2] hover:text-white hover:bg-white/[0.04]"
          )}
          title={lang === 'ar' ? 'الإعدادات' : 'Settings'}
        >
          <Settings className={cn("w-5 h-5", isSettings ? "text-[#F52B35]" : "text-[#A1A6B2]")} />
          <span className="text-[11px] font-bold tracking-tight mt-0.5 truncate max-w-full">
            {lang === 'ar' ? 'الإعدادات' : 'Settings'}
          </span>
        </button>
      </div>
    </nav>
  );
};
