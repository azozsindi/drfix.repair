import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronRight, 
  ChevronLeft, 
  LogOut, 
  X, 
  Shield, 
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { StaffUser } from '../../types';
import { 
  AdminTabId, 
  ADMIN_NAV_ITEMS, 
  ADMIN_NAV_SECTIONS 
} from './types';
import { cn } from '../../lib/utils';

interface AdminSidebarProps {
  currentTab: AdminTabId;
  onSelectTab: (tabId: AdminTabId) => void;
  lang: 'ar' | 'en';
  currentStaffUser?: StaffUser | null;
  onLogout: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  badges: {
    pendingBookings?: number;
    newReviews?: number;
    unreadAlerts?: number;
  };
  allowedTabs?: AdminTabId[];
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  onSelectTab,
  lang,
  currentStaffUser,
  onLogout,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  badges,
  allowedTabs
}) => {
  const isRtl = lang === 'ar';
  const [hoveredTabId, setHoveredTabId] = useState<AdminTabId | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Filter items based on user role / permissions
  const filteredNavItems = ADMIN_NAV_ITEMS.filter((item) => {
    if (allowedTabs && allowedTabs.length > 0) {
      return allowedTabs.includes(item.id);
    }
    return true;
  });

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'super_admin': return lang === 'ar' ? 'المدير العام' : 'Super Admin';
      case 'manager': return lang === 'ar' ? 'مدير التشغيل' : 'Manager';
      case 'supervisor': return lang === 'ar' ? 'مشرف فني' : 'Supervisor';
      case 'technician': return lang === 'ar' ? 'فني معتمد' : 'Technician';
      case 'accountant': return lang === 'ar' ? 'محاسب' : 'Accountant';
      case 'customer_service': return lang === 'ar' ? 'خدمة عملاء' : 'Support';
      default: return lang === 'ar' ? 'مسؤول النظام' : 'Administrator';
    }
  };

  const sidebarContent = (
    <div className="h-full flex flex-col bg-[#0C0E12] text-[#F5F6F8] border-r border-white/[0.08] rtl:border-r-0 rtl:border-l rtl:border-white/[0.08] select-none">
      {/* Brand & Collapse Header */}
      <div className={cn(
        "h-16 flex items-center justify-between px-4 border-b border-white/[0.08] bg-[#090A0C]/60 backdrop-blur-md shrink-0",
        isCollapsed && "px-2 justify-center"
      )}>
        <div className={cn("flex items-center gap-3 overflow-hidden", isCollapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F52B35] to-[#B3121B] flex items-center justify-center shadow-lg shadow-[#F52B35]/20 shrink-0">
            <span className="font-display font-black text-white text-base tracking-tighter">DR</span>
          </div>

          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-display font-black text-sm tracking-tight text-white truncate">DR.FIX</span>
                <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded bg-[#F52B35]/20 text-[#FF414A] border border-[#F52B35]/30">
                  ADMIN
                </span>
              </div>
              <span className="text-[11px] text-[#A1A6B2] truncate">
                {lang === 'ar' ? 'لوحة القيادة والعمليات' : 'Executive Control Panel'}
              </span>
            </div>
          )}
        </div>

        {/* Desktop Collapse Toggle */}
        <button
          type="button"
          onClick={onToggleCollapse}
          className={cn(
            "hidden md:flex w-7 h-7 rounded-lg items-center justify-center text-[#A1A6B2] hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer",
            isCollapsed && "mx-auto"
          )}
          title={isCollapsed ? (lang === 'ar' ? 'توسيع القائمة' : 'Expand Sidebar') : (lang === 'ar' ? 'طي القائمة' : 'Collapse Sidebar')}
        >
          {isCollapsed ? (
            isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          ) : (
            isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Mobile Close Button */}
        <button
          type="button"
          onClick={onCloseMobile}
          className="md:hidden p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/10"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items (Categorized with live scroll) */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 custom-tabs-scrollbar">
        {ADMIN_NAV_SECTIONS.map((section) => {
          const sectionItems = filteredNavItems.filter((i) => i.category === section.id);
          if (sectionItems.length === 0) return null;

          return (
            <div key={section.id} className="space-y-1">
              {!isCollapsed && (
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#A1A6B2]/70">
                  {lang === 'ar' ? section.titleAr : section.titleEn}
                </div>
              )}

              {sectionItems.map((item) => {
                const isActive = currentTab === item.id;
                const Icon = item.icon;
                const badgeCount = item.badgeKey ? badges[item.badgeKey] : undefined;

                return (
                  <div
                    key={item.id}
                    className="relative"
                    onMouseEnter={() => setHoveredTabId(item.id)}
                    onMouseLeave={() => setHoveredTabId(null)}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        onSelectTab(item.id);
                        onCloseMobile();
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-xs sm:text-sm transition-all duration-150 cursor-pointer group text-start relative overflow-hidden",
                        isActive
                          ? "bg-gradient-to-r from-[#F52B35]/20 to-transparent text-white font-bold border-l-2 rtl:border-l-0 rtl:border-r-2 border-[#F52B35]"
                          : "text-[#A1A6B2] hover:text-[#F5F6F8] hover:bg-white/[0.04]",
                        isCollapsed && "justify-center px-2"
                      )}
                    >
                      <Icon className={cn(
                        "w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
                        isActive ? "text-[#FF414A]" : "text-[#A1A6B2] group-hover:text-white"
                      )} />

                      {!isCollapsed && (
                        <span className="truncate flex-1">
                          {lang === 'ar' ? item.labelAr : item.labelEn}
                        </span>
                      )}

                      {!isCollapsed && Boolean(badgeCount && badgeCount > 0) && (
                        <span className="px-1.5 py-0.5 text-[10px] font-black rounded-full bg-[#F52B35] text-white shrink-0 shadow-sm shadow-[#F52B35]/50 animate-pulse">
                          {badgeCount}
                        </span>
                      )}
                    </button>

                    {/* Floating Tooltip when Collapsed */}
                    {isCollapsed && hoveredTabId === item.id && (
                      <div className={cn(
                        "absolute top-1/2 -translate-y-1/2 z-50 px-3 py-1.5 rounded-lg bg-[#181B22] border border-white/10 text-white text-xs font-bold whitespace-nowrap shadow-xl pointer-events-none",
                        isRtl ? "right-full mr-2" : "left-full ml-2"
                      )}>
                        {lang === 'ar' ? item.labelAr : item.labelEn}
                        {Boolean(badgeCount && badgeCount > 0) && ` (${badgeCount})`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* User Footer Profile & Quick Logout */}
      <div className="p-3 border-t border-white/[0.08] bg-[#090A0C]/60 shrink-0">
        <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
          <div className="relative shrink-0">
            <div className="w-8 h-8 rounded-full bg-[#181B22] border border-white/15 flex items-center justify-center font-bold text-xs text-white">
              {(currentStaffUser?.fullName || 'A').charAt(0).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#090A0C]" />
          </div>

          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold text-white truncate">
                {currentStaffUser?.fullName || (lang === 'ar' ? 'المدير العام' : 'Super Admin')}
              </div>
              <div className="text-[10px] text-[#A1A6B2] flex items-center gap-1">
                <Shield className="w-2.5 h-2.5 text-[#F52B35]" />
                <span className="truncate">{getRoleLabel(currentStaffUser?.role)}</span>
              </div>
            </div>
          )}

          {!isCollapsed && (
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(true)}
              className="p-1.5 rounded-lg text-[#A1A6B2] hover:text-[#FF414A] hover:bg-white/[0.06] transition-all cursor-pointer"
              title={lang === 'ar' ? 'تسجيل الخروج' : 'Logout'}
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141720] border border-white/10 p-6 rounded-2xl max-w-sm w-full space-y-4 text-center shadow-2xl" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="w-12 h-12 rounded-full bg-[#F52B35]/15 text-[#F52B35] flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">
              {lang === 'ar' ? 'تأكيد تسجيل الخروج' : 'Confirm Logout'}
            </h4>
            <p className="text-xs text-[#A1A6B2] leading-relaxed">
              {lang === 'ar' 
                ? 'هل أنت متأكد من رغبتك في تسجيل الخروج من لوحة إدارة DR.FIX؟'
                : 'Are you sure you want to sign out of the DR.FIX management dashboard?'}
            </p>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer"
              >
                {lang === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-[#F52B35] hover:bg-[#FF414A] text-white text-xs font-bold transition-all cursor-pointer shadow-lg shadow-[#F52B35]/30"
              >
                {lang === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className={cn(
        "hidden md:block h-screen sticky top-0 transition-all duration-300 ease-in-out shrink-0 z-30",
        isCollapsed ? "w-[74px]" : "w-[260px]"
      )}>
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      <AnimatePresence>
        {isMobileOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: isRtl ? '100%' : '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: isRtl ? '100%' : '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10"
            >
              {sidebarContent}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
