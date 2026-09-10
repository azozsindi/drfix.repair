import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  FileText, 
  X, 
  Mail, 
  Phone, 
  MapPin, 
  Printer, 
  CheckCircle2, 
  AlertCircle,
  Car,
  Lock
} from 'lucide-react';
import { AppSettings } from '../types';
import { useScrollLock } from '../lib/scrollLock';

export const DEFAULT_PRIVACY_POLICY = `
سياسة الخصوصية وحماية البيانات الشخصية - DR.FIX
وفقاً لنظام حماية البيانات الشخصية السعودي (PDPL) الصادر بالمرسوم الملكي رقم (م/19)

1. التزامنا ومقدمة:
نحن في DR.FIX لصيانة وميكانيكا السيارات المتنقلة بجدة (المشار إليها بـ "نحن" أو "المركز")، نولي أقصى درجات العناية لخصوصية عملائنا وأمان بياناتهم الشخصية. توضح هذه السياسة بشفافية الأسس التي نتبعها في جمع ومعالجة وحماية بياناتك عند تصفح موقعنا drfix.repair أو الاستفادة من خدمات الصيانة الميدانية.

2. البيانات الشخصية التي نقوم بجمعها:
نلتزم بجمع الحد الأدنى الضروري من البيانات بما يخدم تقديم خدمة الصيانة المتنقلة بكفاءة وجودة عالية:
• بيانات الهوية والتواصل: الاسم الكريم ورقم الجوال السعودي، وذلك لتأكيد الحجز، والتواصل المباشر مع العميل وتحديد توقيت الزيارة.
• بيانات المركبة: صانع السيارة (النوع)، الموديل، سنة الصنع، ورقم اللوحة، وذلك لضمان جلب القطع والعدد والمعدات التقنية الملائمة لنوع محرك وسيارة العميل.
• الموقع الجغرافي (Coordinates & Location): الموقع الميداني الدقيق للسيارة داخل نطاق تغطيتنا بمدينة جدة، وذلك لتوجيه سيارة الصيانة والفني المتنقل إلى موقعك مباشرة وبدون تأخير.
• وصف المشكلة والأعطال: أي صور أو ملاحظات فنية أو أصوات أعطال يتم تزويدنا بها لتشخيص الخلل.

3. الغرض من جمع واستخدام البيانات:
• توجيه مهندس/فني الصيانة المتنقل ومعدات الورشة إلى موقع سيارتك في الموعد المتفق عليه.
• فتح ملف سجل صيانة للمركبة لتوثيق الأعمال المنجزة والقطع المستبدلة ومتابعة الضمان الممنوح.
• إرسال تنبيهات وتحديثات لحظية حول حالة الطلب وتأكيد المواعيد عبر رسائل واتساب أو تيليجرام.
• إصدار الفواتير الإلكترونية وتقارير الفحص الفني.

4. عدم مشاركة البيانات مع أي طرف ثالث (Strict Zero Third-Party Sharing):
• نؤكد التزامنا التام بعدم بيع أو تأجير أو مشاركة أو تداول بيانات عملائنا مع أي جهة خارجية أو أطراف تجارية ثالثة لأغراض الإعلانات أو التسويق.
• تُعامل بياناتك بسرية تامة ومحصورة حصرياً بين إدارة DR.FIX والفني المكلف بزيارتك فقط لتنفيذ الخدمة المتفق عليها.

5. أمان وتخزين البيانات:
تُخزن البيانات في بيئات سحابية مؤمنة بأعلى معايير التشفير وقواعد الحماية الصارمة لمنع أي وصول غير مصرح به، أو تعديل، أو فقدان للبيانات.

6. حقوقك النظامية وفق نظام حماية البيانات الشخصية (PDPL):
بموجب الأنظمة واللوائح السارية بالمملكة العربية السعودية، يحق لك دائماً:
• حق الاطلاع: معرفة البيانات المسجلة عنك وسجل صيانة مركباتك.
• حق التصحيح: تعديل وتحديث أي بيانات غير دقيقة.
• حق الإتلاف/المسح: طلب مسح وحذف بياناتك عند انتهاء الغرض من تقديم الخدمة وانقضاء الفترات النظامية للضمان والفوترة.

7. مسؤول حماية البيانات والتواصل الرسمي:
لأي استفسار بخصوص هذه السياسة أو ممارسة حقوقك النظامية، يُسعدنا تواصلكم المباشر معنا:
• البريد الإلكتروني المعتمد لإدارة البيانات: info@drfix.repair
• هاتف خدمة العملاء / واتساب: 0546870807
• المقر: مدينة جدة، المملكة العربية السعودية
`.trim();

export const DEFAULT_TERMS_OF_SERVICE = `
شروط وأحكام الخدمة - DR.FIX
مركز صيانة وميكانيكا السيارات المتنقلة بمدينة جدة

1. تعريف الخدمة:
يقدم DR.FIX خدمات فحص، تشخيص كمبيوتر، ميكانيكا، كهرباء، وصيانة سيارات متنقلة عند موقع العميل داخل حدود مدينة جدة والمناطق المشمولة في نطاق الخدمة.

2. متطلبات الموقع والسلامة:
• يلتزم العميل بتحديد موقع وقوف السيارة بدقة، والتأكد من تواجد المركبة في مكان آمن ومناسب قانونياً وعملياً يسمح بوقوف سيارة الورشة المتنقلة واستخدام معدات الفحص والرفع بأمان.
• يجب حضور العميل أو من يفوضه رسمياً عند بدء العمل ولدى تجربة واستلام السيارة بعد إتمام الصيانة.

3. الفحص والتشخيص وإقرار التكاليف:
• يقوم الفني بمعاينة المركبة وتشخيص العطل وإبلاغ العميل بالقطع المطلوبة والتكلفة التقديرية قبل البدء في أعمال الإصلاح.
• لا يتم تنفيذ أي عمل إضافي طارئ خارج الحجز المبدئي إلا بعد أخذ موافقة العميل الشفهية أو الكتابية المباشرة.

4. الضمان وحدوده:
• تضمن إدارة DR.FIX أعمال الصيانة وجودة التركيب لفترة الضمان المحددة في سند وفاتورة الصيانة.
• يسقط الضمان في حال التدخل في القطع من ورش أخرى، أو سوء استخدام المركبة، أو تعرضها لحوادث أو إهمال الصيانة الدورية الموصى بها.

5. الإلغاء وتعديل المواعيد:
• يتاح للعميل تعديل أو إلغاء موعد الصيانة قبل تحرك الورشة المتنقلة بالتواصل مع خدمة العملاء دون أي رسوم.

6. الدعم الفني والملاحظات:
• نلتزم بأعلى معايير الشفافية والاحترافية، ونسعد باستقبال أي ملاحظة أو شكوى لمعالجتها فوراً عبر بريدنا info@drfix.repair أو هاتف 0546870807.
`.trim();

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'privacy' | 'terms';
  settings: AppSettings;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'privacy',
  settings
}) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'terms'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open so background never moves
  useScrollLock(isOpen);

  if (!isOpen) return null;

  const privacyContent = settings.privacyPolicyText?.trim() || DEFAULT_PRIVACY_POLICY;
  const termsContent = settings.termsOfServiceText?.trim() || DEFAULT_TERMS_OF_SERVICE;

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99999] flex items-center justify-center p-2.5 sm:p-4 md:p-6 overflow-y-auto overscroll-contain">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-4xl max-h-[94dvh] sm:max-h-[90vh] bg-[#0F0F10] border border-white/10 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col z-10 overflow-hidden text-right my-auto"
          dir="rtl"
        >
          {/* Header */}
          <div className="px-5 sm:px-8 py-5 border-b border-white/10 flex items-center justify-between gap-4 bg-gradient-to-r from-brand-red/10 via-transparent to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
                {activeTab === 'privacy' ? (
                  <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
                ) : (
                  <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
                )}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-xl font-display font-black text-white truncate">
                    {activeTab === 'privacy' ? 'سياسة الخصوصية وحماية البيانات' : 'شروط وأحكام الخدمة'}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-brand-red/15 text-brand-red border border-brand-red/30 shrink-0">
                    <CheckCircle2 className="w-3 h-3" />
                    معتمد ومحدث 2026
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  DR.FIX • المركز المتخصص لصيانة السيارات والميكانيكا المتنقلة بجدة
                </p>
              </div>
            </div>

            {/* Actions: Close & Print */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePrint}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                title="طباعة الوثيقة"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
                aria-label="إغلاق النافذة"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 sm:px-8 pt-3 pb-2 border-b border-white/5 bg-black/40 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'privacy'
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/25 scale-[1.02]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>سياسة الخصوصية (PDPL)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  activeTab === 'terms'
                    ? 'bg-brand-red text-white shadow-lg shadow-brand-red/25 scale-[1.02]'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>شروط الخدمة والضمان</span>
              </button>
            </div>

            <div className="hidden md:flex items-center gap-2 text-xs text-gray-400">
              <Lock className="w-3.5 h-3.5 text-brand-red" />
              <span>نظام حماية البيانات الشخصية السعودي</span>
            </div>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 text-sm sm:text-base text-gray-200 leading-relaxed font-sans scroll-smooth">
            {activeTab === 'privacy' ? (
              <div className="space-y-6">
                {/* Visual Highlights Box */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-start gap-3 p-2">
                    <div className="p-2 rounded-lg bg-brand-red/10 text-brand-red shrink-0">
                      <Car className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">بيانات صيانة المركبة</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">نوع السيارة، الموديل، واللوحة لتجهيز المعدات وقطع الغيار</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2">
                    <div className="p-2 rounded-lg bg-brand-red/10 text-brand-red shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">الموقع الميداني بجدة</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">لتوجيه الفني والورشة المتنقلة لموقعك بدقة وأمان</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2">
                    <div className="p-2 rounded-lg bg-white/10 text-white shrink-0">
                      <Lock className="w-4 h-4 text-brand-red" />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">حظر تام للمشاركة</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">لا نشارك أو نبيع بياناتك لأي طرف ثالث أو شركة تسويق</div>
                    </div>
                  </div>
                </div>

                {/* Structured / Customized Text */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 sm:p-6 text-gray-300 leading-loose whitespace-pre-line text-xs sm:text-sm font-normal">
                  {privacyContent}
                </div>

                {/* Contact Box */}
                <div className="p-4 rounded-2xl bg-brand-red/5 border border-brand-red/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                      <Mail className="w-4 h-4 text-brand-red" />
                      <span>هل لديك استفسار حول بياناتك أو تريد ممارسة حقك في المسح؟</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      تواصل مباشرة مع مسؤول الخصوصية عبر البريد الرسمي أو الهاتف المعتمد
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <a
                      href={`mailto:${settings.email || 'info@drfix.repair'}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-red text-white text-xs font-bold hover:bg-red-700 transition-colors shadow-sm"
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>{settings.email || 'info@drfix.repair'}</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Terms Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
                  <div className="flex items-start gap-3 p-2">
                    <div className="p-2 rounded-lg bg-brand-red/10 text-brand-red shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">ضمان معتمد على الإصلاحات</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">ضمان فني رسمي على الأعمال والقطع المحددة في الفاتورة</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-2">
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-white">موافقة العميل المسبقة</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">لا يتم تنفيذ أي عمل إضافي دون موافقتك الصريحة وإيضاح التكلفة</div>
                    </div>
                  </div>
                </div>

                {/* Terms Structured Text */}
                <div className="bg-black/40 border border-white/5 rounded-2xl p-5 sm:p-6 text-gray-300 leading-loose whitespace-pre-line text-xs sm:text-sm font-normal">
                  {termsContent}
                </div>
              </div>
            )}
          </div>

          {/* Footer of Modal */}
          <div className="px-5 sm:px-8 py-4 border-t border-white/10 bg-black/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-400 text-center sm:text-right">
              <ShieldCheck className="w-4 h-4 text-brand-red shrink-0" />
              <span>آخر تحديث: سبتمبر 2026 • متوافق مع لوائح التجارة الإلكترونية وأنظمة حماية البيانات بالسعودية</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-white font-bold text-xs sm:text-sm transition-all shadow-lg shadow-brand-red/20 active:scale-95 cursor-pointer"
            >
              فهمت وموافق
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
