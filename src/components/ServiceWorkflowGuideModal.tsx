import React, { useState } from 'react';
import { 
  X, 
  Car, 
  Video, 
  Camera, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ShieldCheck, 
  Navigation, 
  Wrench, 
  MessageCircle, 
  Phone, 
  Zap, 
  Sparkles,
  ArrowLeft,
  Calendar
} from 'lucide-react';
import { useScrollLock } from '../lib/scrollLock';

interface ServiceWorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'customer' | 'technician';
}

export const ServiceWorkflowGuideModal: React.FC<ServiceWorkflowGuideModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'customer'
}) => {
  // Prevent background scroll when modal is open
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'customer' | 'technician'>(defaultTab);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto overscroll-contain">
      <div 
        className="relative w-full max-w-4xl bg-brand-dark/95 border border-white/15 rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[94dvh] sm:max-h-[92vh] text-right my-auto"
        dir="rtl"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-gradient-to-r from-brand-red/15 via-white/5 to-transparent flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shadow-lg shadow-brand-red/10 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                دليل إجراءات الصيانة المتنقلة - DR.FIX
              </h3>
              <p className="text-xs text-gray-300 mt-0.5">
                شرح تفصيلي ومبسط لرحلة العميل وخطوات الفني الميداني لإنجاز الصيانة بأعلى سرعة وجودة
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-3 sm:px-6 bg-black/40 border-b border-white/10 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('customer')}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'customer'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/25'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>1. خطوات العميل (طلب ومتابعة الصيانة) 🚗</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('technician')}
            className={`flex-1 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'technician'
                ? 'bg-brand-red text-white shadow-lg shadow-brand-red/25'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>2. خطوات الفني الميداني (أسرع طريقة إنجاز) ⚡</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain space-y-4 sm:space-y-6 text-sm flex-1">
          {/* CUSTOMER WORKFLOW */}
          {activeTab === 'customer' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0 text-xl">
                  🚗
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    رحلة العميل من الحجز حتى استلام السيارة بجدة
                  </h4>
                  <p className="text-xs text-gray-300">
                    صيانة متنقلة وفورية تصل إلى باب منزلك أو مكان عملك دون عناء زيارة الورش.
                  </p>
                </div>
              </div>

              {/* Step by step cards */}
              <div className="grid gap-4">
                {/* Step 1 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 hover:border-brand-red/40 transition-all">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>تحديد الخدمة وبيانات السيارة</span>
                      <span className="text-[10px] bg-brand-red/20 text-brand-red px-2 py-0.5 rounded-full border border-brand-red/30 font-bold">خطوة أساسية</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      يحدد العميل نوع الصيانة (ميكانيكا، كهرباء، فحص كمبيوتر، فحمات وزيوت، تكييف، أو صيانة دورية) ويكتب ماركة وموديل وسنة صنع السيارة ووصف المشكلة.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 hover:border-brand-red/40 transition-all">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>اختيار اليوم والوقت المتاح المناسب</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">فوري أو مجدول</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      يعرض النظام الأوقات المتاحة بدقة لهذا اليوم أو الأيام القادمة، مع إمكانية اختيار <b>"خدمة فورية عاجلة خلال 45 دقيقة ⚡"</b> أو حجز فترة زمنية مريحة (مثل 05:00 م - 07:00 م).
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 hover:border-brand-red/40 transition-all">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>تحديد موقع السيارة (GPS بجدة) ورقم الجوال</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30 font-bold">موقع مباشر</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      بنقرة واحدة على زر <b>"📍 تحديد موقعي الحالي"</b> يتم حفظ إحداثيات موقع السيارة بدقة ليتجه الفني مباشرة عبر خرائط Google دون الحاجة لشرح الطريق هاتفياً.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 hover:border-brand-red/40 transition-all">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>تأكيد الحجز واستلام رقم السند ورابط التتبع</span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-bold">تتبع مباشر</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      يصل العميل إشعار فوري برقم الحجز الخاص به مع إمكانية متابعة حالة الطلب والـ Timeline المصور من خلال الموقع أو عبر محادثة واتساب الرسمية.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5 hover:border-brand-red/40 transition-all">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    5
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>وصول الفني وتصوير السيارة بالفيديو وبدء الصيانة</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">أمان وضمان</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      فور وصول الفني، يقوم بتصوير فيديو شامل للسيارة لتوثيق حالتها الخارجية والعداد، ثم يشرع في أعمال الصيانة مع إمكانية رفع صور القطع التالفة والجديدة، وإشعار العميل عند الانتهاء.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TECHNICIAN WORKFLOW */}
          {activeTab === 'technician' && (
            <div className="space-y-6 animate-fadeIn">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 text-xl">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    كيف ينجز الفني مهمته بأسرع وأفضل طريقة؟
                  </h4>
                  <p className="text-xs text-gray-300">
                    تم تصميم نظام الفني الميداني ليعمل بلمسة واحدة (1-Tap Workflow) عبر الجوال دون كتابة مطولة.
                  </p>
                </div>
              </div>

              <div className="grid gap-4">
                {/* Tech Step 1 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>تسجيل الدخول وشاشة "مهامي الميدانية 🔧"</span>
                      <span className="text-[10px] bg-white/10 text-gray-300 px-2 py-0.5 rounded">بنقرة واحدة</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      يدخل الفني بحسابه، فتظهر له فوراً بطاقة <b>المهمة ذات الأولوية الحالية (Active Spotlight Job)</b> في أعلى الشاشة بكامل بيانات السيارة وموقع العميل ورقم جواله.
                    </p>
                  </div>
                </div>

                {/* Tech Step 2 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>نقرة واحدة: "🚗 أنا في الطريق للعميل" + فتح الخريطة</span>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-mono">1-Tap</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      يضغط الفني زر <b>"أنا في الطريق"</b>، فيتم إشعار العميل فوراً. ويضغط زر <b>"ملاحة GPS 🗺️"</b> ليفتح له تطبيق Google Maps ويوجهه مباشرة لموقع السيارة بأسرع طريق.
                    </p>
                  </div>
                </div>

                {/* Tech Step 3 - THE VIDEO REQUIREMENT */}
                <div className="p-4 rounded-2xl bg-brand-red/15 border-2 border-brand-red/50 flex items-start gap-3.5 shadow-lg shadow-brand-red/10">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h5 className="font-black text-white text-sm flex items-center gap-1.5">
                        <Video className="w-4 h-4 text-brand-red" />
                        <span>أول ما يوصل الفني: تصوير فيديو استلام ومعاينة السيارة 🎥</span>
                      </h5>
                      <span className="text-[10px] bg-brand-red text-white px-2 py-0.5 rounded-full font-bold">
                        إجراء إلزامي وسريع
                      </span>
                    </div>
                    <p className="text-xs text-gray-200 leading-relaxed">
                      بمجرد الوصول لموقع السيارة، يضغط الفني على زر:
                      <br />
                      <span className="inline-block mt-1 font-bold bg-black/60 px-3 py-1 rounded-xl border border-brand-red text-white">
                        🎥 تصوير فيديو فحص واستلام السيارة عند الوصول
                      </span>
                      <br />
                      يصور الفني جولة فيديو سريعة (10 إلى 20 ثانية) حول السيارة توثق: حالة البودي الخارجية، أي خدوش أو صدمات سابقة، وعداد المسافة (Odometer). يتم رفع الفيديو وحفظه تلقائياً لحماية الفني والمركز والعميل.
                    </p>
                  </div>
                </div>

                {/* Tech Step 4 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-brand-red text-white font-black text-sm flex items-center justify-center shrink-0">
                    4
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>إجراء الصيانة وتوثيق القطع (صور اختيارية)</span>
                      <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">شفافية كاملة</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      يقوم الفني بفك وتركيب القطع، وإذا كانت هناك قطعة متضررة أو قطع غيار جديدة يمكنه التقاط صورة سريعة وحفظها لتظهر في سجل وتقرير العميل الفني.
                    </p>
                  </div>
                </div>

                {/* Tech Step 5 */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    5
                  </div>
                  <div className="space-y-1">
                    <h5 className="font-bold text-white text-sm flex items-center gap-2">
                      <span>نقرة واحدة: "✅ تم إنجاز الصيانة بنجاح"</span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">إغلاق فوري</span>
                    </h5>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      يضغط الفني زر الإنجاز النهائي، فيتم إرسال إشعار فوري للإدارة والمالك عبر تيليجرام ورابط التقرير للعميل، وتنتقل المهمة إلى سجل المنجزات، ليصبح الفني متاحاً للمهمة التالية فوراً!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>نظام موحد لضمان سرعة الاستجابة والجودة الميدانية في جدة</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
          >
            إغلاق الدليل
          </button>
        </div>
      </div>
    </div>
  );
};
