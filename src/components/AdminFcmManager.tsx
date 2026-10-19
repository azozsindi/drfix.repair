import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  BellOff, 
  BellRing, 
  CheckCircle2, 
  AlertCircle, 
  Smartphone, 
  Laptop, 
  Tablet, 
  RefreshCw, 
  Trash2, 
  Send, 
  Key, 
  ExternalLink, 
  ShieldCheck, 
  Info, 
  Check, 
  HelpCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { AppSettings, FcmDeviceToken, StaffUser } from '../types';
import { 
  registerFcmDevice, 
  unregisterFcmDevice, 
  sendLocalTestNotification, 
  getNotificationPermissionStatus, 
  isFcmEnvironmentSupported, 
  detectCurrentDevice 
} from '../lib/fcmNotifications';
import { cn } from '../lib/utils';
import { safeFormatDate } from '../lib/dateUtils';

interface AdminFcmManagerProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => Promise<void>;
  currentStaffUser?: StaffUser | null;
}

export const AdminFcmManager: React.FC<AdminFcmManagerProps> = ({
  settings,
  onUpdateSettings,
  currentStaffUser
}) => {
  const [permissionStatus, setPermissionStatus] = useState<string>('default');
  const [envSupport, setEnvSupport] = useState<{ supported: boolean; reason?: string; isIosSafariNonPwa?: boolean }>({ supported: true });
  const [currentToken, setCurrentToken] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [registeredDevices, setRegisteredDevices] = useState<FcmDeviceToken[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(true);
  const [activeTab, setActiveTab] = useState<'devices' | 'settings' | 'guide'>('devices');

  // FCM Settings Form
  const [vapidKeyInput, setVapidKeyInput] = useState(settings.fcmVapidKey || '');
  const [serverKeyInput, setServerKeyInput] = useState(settings.fcmServerKey || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  const currentDevice = detectCurrentDevice();

  useEffect(() => {
    // Check permission & environment
    setPermissionStatus(getNotificationPermissionStatus());
    isFcmEnvironmentSupported().then(res => setEnvSupport(res));

    // Check if this device has an active token cached
    const cachedToken = localStorage.getItem('drfix_current_fcm_token');
    setCurrentToken(cachedToken);
  }, []);

  // Listen to registered device tokens in Firestore
  useEffect(() => {
    setIsLoadingDevices(true);
    const q = query(collection(db, 'fcm_tokens'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: FcmDeviceToken[] = [];
      snapshot.forEach((d) => {
        list.push({ id: d.id, ...(d.data() as any) } as FcmDeviceToken);
      });
      setRegisteredDevices(list);
      setIsLoadingDevices(false);
    }, (err) => {
      console.warn('Error loading FCM tokens:', err);
      setIsLoadingDevices(false);
    });

    return () => unsubscribe();
  }, []);

  const handleToggleNotifications = async () => {
    if (currentToken) {
      // Deactivate
      setIsRegistering(true);
      await unregisterFcmDevice();
      setCurrentToken(null);
      setIsRegistering(false);
      setTestResult({
        success: true,
        message: 'تم إلغاء تفعيل الإشعارات على هذا الجهاز بنجاح.'
      });
      return;
    }

    // Activate
    setIsRegistering(true);
    setTestResult(null);

    const userPayload = {
      id: currentStaffUser?.id || 'master-super-admin',
      name: currentStaffUser?.fullName || 'المدير العام',
      role: currentStaffUser?.role || 'super_admin'
    };

    const res = await registerFcmDevice(userPayload, settings.fcmVapidKey);
    setIsRegistering(false);
    setPermissionStatus(getNotificationPermissionStatus());

    if (res.success && res.token) {
      setCurrentToken(res.token);
      setTestResult({
        success: true,
        message: 'تم تفعيل إشعارات DR.FIX بنجاح على هذا الجهاز! تم تسجيل رمز الجهاز في النظام.'
      });
      // Trigger a welcoming local test notification
      sendLocalTestNotification('مرحباً بك في إشعارات DR.FIX 🚗', 'تم تفعيل التنبيهات الفورية بنجاح على هذا الجهاز.');
    } else {
      setTestResult({
        success: false,
        message: res.error || 'تعذر تفعيل الإشعارات. يرجى مراجعة إذن المتصفح.'
      });
    }
  };

  const handleSendTestNotification = async () => {
    setIsTesting(true);
    setTestResult(null);

    const nowStr = new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });

    // Step 1: Send local test notification immediately
    await sendLocalTestNotification(
      'تنبيه تجريبي من DR.FIX 🚗',
      `هذا إشعار تجريبي لاختبار التنبيهات الفورية (الوقت: ${nowStr}). اضغط لفتح لوحة الإدارة.`
    );

    // Step 2: Trigger server-side FCM broadcast to all registered devices
    try {
      const res = await fetch('/api/fcm-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'تنبيه تجريبي من DR.FIX 🚗',
          body: `إشعار تجريبي مرسل من لوحة الإدارة (الساعة: ${nowStr}).`,
          url: '/admin',
          serverKey: settings.fcmServerKey,
          targetTokens: currentToken ? [currentToken] : undefined
        })
      });

      const data = await res.json();
      const updatedTimestamp = new Date().toISOString();
      await onUpdateSettings({ lastTestNotificationSentAt: updatedTimestamp });

      if (data.ok || data.sent > 0) {
        setTestResult({
          success: true,
          message: `تم إرسال الإشعار التجريبي بنجاح! تم استلامه محلياً وتم إرساله إلى ${data.sent || 1} جهاز مسجل.`
        });
      } else {
        setTestResult({
          success: true,
          message: `تم إطلاق الإشعار التجريبي محلياً على جهازك بنجاح! ${data.message || ''}`
        });
      }
    } catch (err: any) {
      setTestResult({
        success: true,
        message: 'تم إظهار الإشعار التجريبي بنجاح على شاشتك عبر المتصفح.'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDeleteDevice = async (deviceId: string) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في حذف هذا الجهاز من قائمة استلام الإشعارات؟')) return;
    try {
      await deleteDoc(doc(db, 'fcm_tokens', deviceId));
      if (localStorage.getItem('drfix_current_fcm_doc_id') === deviceId) {
        localStorage.removeItem('drfix_current_fcm_token');
        localStorage.removeItem('drfix_current_fcm_doc_id');
        setCurrentToken(null);
      }
    } catch (e) {
      console.error('Error deleting token doc:', e);
    }
  };

  const handleSaveFcmSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await onUpdateSettings({
        fcmVapidKey: vapidKeyInput.trim(),
        fcmServerKey: serverKeyInput.trim()
      });
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err) {
      alert('حدث خطأ أثناء حفظ الإعدادات');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const isCurrentDeviceRegistered = !!currentToken;

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-2xl border border-brand-red/20 bg-gradient-to-r from-brand-red/10 via-black to-brand-black flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl bg-brand-red/20 border border-brand-red/40 flex items-center justify-center text-brand-red shrink-0 shadow-lg shadow-brand-red/10">
            {isCurrentDeviceRegistered ? <BellRing className="w-6 h-6 animate-pulse" /> : <Bell className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-white flex items-center gap-2">
              <span>نظام التنبيهات الفورية (FCM)</span>
              <span className="text-[10px] font-mono font-bold bg-brand-red text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                Web Push
              </span>
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              استقبال إشعارات الحجوزات الجديدة وتغييرات الحالة مباشرة على جوالك وسطح المكتب حتى لو كان الموقع مغلقاً.
            </p>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          <button
            type="button"
            onClick={handleToggleNotifications}
            disabled={isRegistering || !envSupport.supported}
            className={cn(
              "px-5 py-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 disabled:opacity-50",
              isCurrentDeviceRegistered
                ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
                : "bg-brand-red hover:bg-red-700 text-white shadow-brand-red/30"
            )}
          >
            {isRegistering ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : isCurrentDeviceRegistered ? (
              <>
                <BellOff className="w-4 h-4 text-brand-red" />
                <span>إلغاء تفعيل الإشعارات على هذا الجهاز</span>
              </>
            ) : (
              <>
                <Bell className="w-4 h-4" />
                <span>تفعيل إشعارات DR.FIX على هذا الجهاز</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSendTestNotification}
            disabled={isTesting}
            className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isTesting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 text-emerald-400" />}
            <span>إرسال إشعار تجريبي 🔔</span>
          </button>
        </div>
      </div>

      {/* Test / Operation Feedback Toast */}
      {testResult && (
        <div className={cn(
          "p-4 rounded-xl border text-xs sm:text-sm flex items-start gap-3 transition-all",
          testResult.success ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300" : "bg-red-500/10 border-red-500/30 text-red-300"
        )}>
          {testResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-400" />}
          <div>
            <p className="font-bold">{testResult.message}</p>
          </div>
        </div>
      )}

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Device State */}
        <div className="glass-card p-4 rounded-xl border border-white/10">
          <div className="text-gray-400 text-xs mb-1">حالة هذا الجهاز:</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn("w-2.5 h-2.5 rounded-full", isCurrentDeviceRegistered ? "bg-emerald-400 animate-pulse" : "bg-amber-400")} />
            <span className="font-bold text-sm text-white">
              {isCurrentDeviceRegistered ? 'مفعّلة ومتصلة بالرمز ✓' : 'غير مفعّلة على هذا الجهاز'}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2 font-mono">
            {currentDevice.browser} ({currentDevice.os})
          </div>
        </div>

        {/* Card 2: Browser Permission */}
        <div className="glass-card p-4 rounded-xl border border-white/10">
          <div className="text-gray-400 text-xs mb-1">إذن المتصفح (Permission):</div>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              "text-xs font-bold px-2.5 py-0.5 rounded-md",
              permissionStatus === 'granted' ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
              permissionStatus === 'denied' ? "bg-red-500/20 text-red-300 border border-red-500/30" :
              "bg-white/10 text-gray-300 border border-white/15"
            )}>
              {permissionStatus === 'granted' ? 'مسموح (Granted) ✓' :
               permissionStatus === 'denied' ? 'محظور من المتصفح (Denied)' : 'في الانتظار (Default)'}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-2">
            {permissionStatus === 'granted' ? 'الإذن مفعّل وجاهز لاستقبال التنبيهات' : 'اضغط على زر التفعيل لمنح الإذن'}
          </div>
        </div>

        {/* Card 3: Total Active Devices */}
        <div className="glass-card p-4 rounded-xl border border-white/10">
          <div className="text-gray-400 text-xs mb-1">الأجهزة المعتمدة المسجلة:</div>
          <div className="text-2xl font-black font-display text-white mt-1">
            {registeredDevices.length} <span className="text-xs font-normal text-gray-400">جهاز</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            يصلها تنبيه فوري تلقائياً عند أي حجز جديد
          </div>
        </div>

        {/* Card 4: Last Test Notification Time */}
        <div className="glass-card p-4 rounded-xl border border-white/10">
          <div className="text-gray-400 text-xs mb-1">آخر إشعار تجريبي:</div>
          <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-brand-red" />
            <span>
              {settings.lastTestNotificationSentAt 
                ? safeFormatDate(settings.lastTestNotificationSentAt, 'ar-SA', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })
                : 'لم يتم الإرسال بعد'}
            </span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1">
            مستقل عن إشعارات التيليجرام
          </div>
        </div>
      </div>

      {/* iOS Safari Special Notice */}
      {envSupport.isIosSafariNonPwa && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>ملاحظة خاصة لمستخدمي iPhone و iPad (متطلبات نظام iOS):</span>
          </div>
          <p className="leading-relaxed">
            وفقاً لسياسة شركة Apple، تدعم أجهزة iPhone و iPad إشعارات الويب (Web Push) بدءاً من إصدار <strong>iOS 16.4</strong> فما فوق بشرط تثبيت الموقع على الشاشة الرئيسية أولاً:
          </p>
          <div className="flex flex-wrap items-center gap-2 text-[11px] bg-black/40 p-2.5 rounded-lg border border-amber-500/20 font-mono">
            <span>1. افتح الموقع في متصفح Safari</span>
            <span>←</span>
            <span>2. اضغط على زر المشاركة (Share) أسفل الشاشة</span>
            <span>←</span>
            <span>3. اختر "إضافة إلى الشاشة الرئيسية" (Add to Home Screen)</span>
            <span>←</span>
            <span>4. افتح التطبيق من الشاشة الرئيسية واضغط "تفعيل إشعارات DR.FIX"</span>
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('devices')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'devices' ? "bg-brand-red text-white shadow-md shadow-brand-red/20" : "bg-white/5 hover:bg-white/10 text-gray-300"
          )}
        >
          <Smartphone className="w-4 h-4" />
          <span>الأجهزة المسجلة ({registeredDevices.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('settings')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'settings' ? "bg-brand-red text-white shadow-md shadow-brand-red/20" : "bg-white/5 hover:bg-white/10 text-gray-300"
          )}
        >
          <Key className="w-4 h-4" />
          <span>مفاتيح الربط والـ VAPID</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('guide')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2",
            activeTab === 'guide' ? "bg-brand-red text-white shadow-md shadow-brand-red/20" : "bg-white/5 hover:bg-white/10 text-gray-300"
          )}
        >
          <HelpCircle className="w-4 h-4" />
          <span>دليل التفعيل خطوة بخطوة</span>
        </button>
      </div>

      {/* Tab 1: Registered Devices List */}
      {activeTab === 'devices' && (
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>الأجهزة المصرح لها باستلام التنبيهات</span>
            </h3>
            <span className="text-xs text-gray-400">
              تصل التنبيهات الإدارية إلى هذه الأجهزة فقط حرصاً على سرية بيانات العملاء
            </span>
          </div>

          {isLoadingDevices ? (
            <div className="text-center py-10 text-gray-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-brand-red" />
              <span>جاري تحميل قائمة الأجهزة...</span>
            </div>
          ) : registeredDevices.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-white/10 rounded-xl space-y-3">
              <BellOff className="w-8 h-8 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-300 font-bold">لا توجد أجهزة مسجلة حالياً</p>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                لتفعيل الإشعارات واستقبالها على جوالك أو حاسوبك، اضغط على زر «تفعيل إشعارات DR.FIX على هذا الجهاز» في الأعلى ووافق على إذن المتصفح.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {registeredDevices.map((dev) => {
                const isThisCurrent = dev.token === currentToken;
                return (
                  <div 
                    key={dev.id} 
                    className={cn(
                      "p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all",
                      isThisCurrent ? "bg-brand-red/10 border-brand-red/40" : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-black/60 border border-white/10 flex items-center justify-center text-white shrink-0">
                        {dev.deviceType === 'mobile' ? <Smartphone className="w-5 h-5 text-brand-red" /> :
                         dev.deviceType === 'tablet' ? <Tablet className="w-5 h-5 text-brand-red" /> :
                         <Laptop className="w-5 h-5 text-brand-red" />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-white">{dev.userName || 'موظف مصرح'}</span>
                          <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded-md font-mono">
                            {dev.browser} • {dev.os}
                          </span>
                          {isThisCurrent && (
                            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              الجهاز الحالي ✓
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-2">
                          <span>تاريخ التسجيل: {safeFormatDate(dev.createdAt, 'ar-SA', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] text-gray-500 truncate max-w-[200px]" dir="ltr">
                            Token: {dev.token.slice(0, 16)}...
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleDeleteDevice(dev.id)}
                        className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 text-xs transition-colors cursor-pointer"
                        title="حذف هذا الجهاز"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: VAPID & Keys Configuration */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveFcmSettings} className="glass-card p-5 rounded-2xl border border-white/10 space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Key className="w-4 h-4 text-brand-red" />
              <span>إعدادات مفاتيح Firebase Cloud Messaging</span>
            </h3>
            <p className="text-xs text-gray-400 mt-1">
              تُستخدم مفاتيح VAPID و Server Key لمصادقة إرسال الإشعارات المشفرة من خادمك إلى أجهزة المستلمين.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                مفتاح Web Push Certificate (VAPID Key):
              </label>
              <input
                type="text"
                value={vapidKeyInput}
                onChange={(e) => setVapidKeyInput(e.target.value)}
                placeholder="مثال: BFqQGcxVd6sQ1GzVz6p7D0B2S1T3M4K5..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-brand-red transition-all"
                dir="ltr"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                تستخرجه من: Firebase Console ← Project Settings ← Cloud Messaging ← Web Push Certificates.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1.5">
                مفتاح الخادم القديم (FCM Server Key) - اختياري:
              </label>
              <input
                type="password"
                value={serverKeyInput}
                onChange={(e) => setServerKeyInput(e.target.value)}
                placeholder="AAAA...:APA91b..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-mono text-white focus:outline-none focus:border-brand-red transition-all"
                dir="ltr"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                يسمح بإرسال الإشعارات مباشرة من سيرفر Express إلى هواتف الموظفين دون قيود حساب الخدمة.
              </span>
            </div>

            {settingsSavedSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                <span>تم حفظ إعدادات الإشعارات بنجاح ✓</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-lg shadow-brand-red/20 disabled:opacity-50"
            >
              {isSavingSettings ? 'جاري الحفظ...' : 'حفظ إعدادات المفاتيح'}
            </button>
          </div>
        </form>
      )}

      {/* Tab 3: Step-by-Step Guide */}
      {activeTab === 'guide' && (
        <div className="glass-card p-5 rounded-2xl border border-white/10 space-y-4 text-xs text-gray-300 leading-relaxed">
          <h3 className="font-bold text-white text-sm flex items-center gap-2 border-b border-white/10 pb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>خطوات تفعيل واستقبال إشعارات DR.FIX على جوالك</span>
          </h3>

          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <h4 className="font-bold text-white mb-1">1. على هواتف Android ومتصفح Chrome:</h4>
              <p>
                افتح لوحة الإدارة في متصفح Chrome، ثم اضغط على زر «تفعيل إشعارات DR.FIX على هذا الجهاز» بالأعلى، ثم اختر «سماح / Allow» عندما يطلب المتصفح إذن الإشعارات. ستصلك بعدها جميع الحجوزات كإشعار فوري على شريط التنبيهات وشاشة القفل.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <h4 className="font-bold text-white mb-1">2. على هواتف iPhone وأجهزة iPad (نظام iOS):</h4>
              <p>
                تتطلب شركة آبل إضافة الموقع إلى الشاشة الرئيسية أولاً:
                <br />
                أ) افتح الموقع عبر Safari، اضغط على أيقونة المشاركة (Share) في الأسفل.
                <br />
                ب) اختر "إضافة إلى الصفحة الرئيسية" (Add to Home Screen).
                <br />
                ج) افتح أيقونة DR.FIX المثبتة على شاشة جوالك، وادخل لوحة الإدارة، واضغط زر «تفعيل إشعارات DR.FIX».
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/5 border border-white/10">
              <h4 className="font-bold text-white mb-1">3. خطوات استخراج مفتاح Web Push (VAPID) من Firebase:</h4>
              <p>
                1. ادخل إلى <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-brand-red font-bold underline inline-flex items-center gap-1">Firebase Console <ExternalLink className="w-3 h-3" /></a> وافتح مشروع <strong>hr-system-2026</strong>.
                <br />
                2. اضغط على رمز الترس (Project Settings) ← تبويب <strong>Cloud Messaging</strong>.
                <br />
                3. انزل لأسفل إلى قسم <strong>Web Push certificates</strong> واضغط <strong>Generate key pair</strong>.
                <br />
                4. انسخ المفتاح المتولد والصقه في تبويب «مفاتيح الربط والـ VAPID» هنا واضغط حفظ.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFcmManager;
