import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Printer,
  X,
  FileText,
  DollarSign,
  Handshake,
  Building2,
  Edit3,
  Eye,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  CheckCircle2,
  Car,
  Wrench,
  ShieldCheck,
  Phone,
  Mail,
  Globe,
  Plus,
  Trash2,
  Layers,
  Sparkles,
  Download,
  Clock,
  MapPin,
  Calendar
} from 'lucide-react';
import { Contract, AppSettings } from '../types';

export type OfficialDocType = 'letter' | 'quotation' | 'contract' | 'proposal';

interface QuotationItem {
  id: string;
  description: string;
  sku?: string;
  qty: number;
  unitPrice: number;
  warranty: string;
}

interface ContractClause {
  id: string;
  title: string;
  content: string;
}

interface ProposalPackage {
  id: string;
  name: string;
  target: string;
  priceTag: string;
  features: string[];
}

interface OfficialDocumentLetterheadProps {
  isOpen: boolean;
  onClose: () => void;
  initialDocType?: OfficialDocType;
  contractData?: Contract | null;
  settings?: AppSettings;
  lang?: 'ar' | 'en';
}

export const OfficialDocumentLetterhead: React.FC<OfficialDocumentLetterheadProps> = ({
  isOpen,
  onClose,
  initialDocType = 'letter',
  contractData = null,
  settings,
  lang = 'ar'
}) => {
  const [docType, setDocType] = useState<OfficialDocType>(initialDocType);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Common Header & Metadata
  const [refNumber, setRefNumber] = useState<string>('DRF-DOC-2026-0842');
  const [gregorianDate, setGregorianDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [hijriDate, setHijriDate] = useState<string>(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(new Date());
    } catch {
      return '17 شوال 1447 هـ';
    }
  });

  // Recipient details
  const [recipientCompany, setRecipientCompany] = useState<string>('شركة الأسطول الماسي لتأجير السيارات');
  const [recipientContact, setRecipientContact] = useState<string>('سعادة الأستاذ / فهد بن خالد السلمي');
  const [recipientTitle, setRecipientTitle] = useState<string>('المدير العام والمسؤول التنفيذي');
  const [recipientCity, setRecipientCity] = useState<string>('جدة - المملكة العربية السعودية');
  const [recipientCr, setRecipientCr] = useState<string>('4030281902');
  const [recipientVat, setRecipientVat] = useState<string>('310459201900003');

  // Signatures
  const [signatoryNameFirst, setSignatoryNameFirst] = useState<string>('م. سامي السندي');
  const [signatoryRoleFirst, setSignatoryRoleFirst] = useState<string>('المدير العام - مركز DR.FIX');
  const [signatoryNameSecond, setSignatoryNameSecond] = useState<string>('أ. فهد بن خالد السلمي');
  const [signatoryRoleSecond, setSignatoryRoleSecond] = useState<string>('المفوض بالتوقيع والاعتماد');

  // 1. Official Letter specific state
  const [letterSubject, setLetterSubject] = useState<string>(
    'اعتماد وتفعيل خدمات الصيانة المتنقلة والدعم الفني لأسطول المركبات بجدة'
  );
  const [letterIntro, setLetterIntro] = useState<string>(
    'السلام عليكم ورحمة الله وبركاته،،\nتحية طيبة وبعد،،\n\nيسر إدارة مركز DR.FIX لصيانة السيارات والخدمات المتنقلة أن ترفع لسعادتكم أطيب التحيات والتقدير. وبالإشارة إلى المباحثات المشتركة بشأن تقديم خدمات الصيانة والإصلاح الفوري لأسطول مركباتكم في مدينة جدة، نود إحاطة سعادتكم بالتزامنا الكامل بتوفير أعلى مستويات الجودة والجاهزية الفنية.'
  );
  const [letterPoints, setLetterPoints] = useState<string[]>([
    'تخصيص ورش متنقلة مجهزة بأحدث معدات الفحص الإلكتروني لتنفيذ الصيانة الوقائية بمقر الشركة.',
    'إسناد فنيين ميكانيكا وكهرباء معتمدين ذوي خبرة لا تقل عن 8 سنوات للتعامل مع أسطولكم.',
    'توفير خدمة الطوارئ والمساعدة على الطريق 24 ساعة يومياً داخل النطاق الجغرافي لمدينة جدة.',
    'إصدار فواتير ضريبية إلكترونية موحدة مدعومة ببيانات رقم الهيكل ورقم اللوحة والمسافة المقطوعة.',
    'ضمان ذهبي معتمد على كافة أعمال الصيانة وقطع الغيار الأصلية لمدة لا تقل عن 6 أشهر أو 10,000 كم.'
  ]);
  const [letterOutro, setLetterOutro] = useState<string>(
    'نأمل أن يحظى خطابنا هذا بتقديركم واهتمامكم المعتاد، ونتطلع إلى تأسيس شراكة عمل استراتيجية ومستدامة تسهم في خفض تكاليف التشغيل وتعزيز كفاءة أسطولكم.\n\nوتفضلوا بقبول فائق التحية والتقدير والامتنان،،'
  );

  // 2. Quotation specific state
  const [quoteSubject, setQuoteSubject] = useState<string>('عرض أسعار حزمة الصيانة الوقائية والإصلاح لأسطول المركبات');
  const [quoteValidity, setQuoteValidity] = useState<string>('30 يوماً من تاريخ الإصدار');
  const [quoteDiscountPercent, setQuoteDiscountPercent] = useState<number>(15);
  const [quotationItems, setQuotationItems] = useState<QuotationItem[]>([
    {
      id: 'q1',
      description: 'باقة غيار زيت محرك تخليقي بالكامل 10,000 كم مع فلتر زيت أصلي وفحص مجاني',
      sku: 'SRV-OIL-SYN-10K',
      qty: 25,
      unitPrice: 280,
      warranty: '10,000 كم أو 6 أشهر'
    },
    {
      id: 'q2',
      description: 'صيانة دورية وتغيير فحمات الفرامل الأمامية الأصلية مع خرط الهوبات وضبط الحساسات',
      sku: 'BRK-FRT-OEM-SET',
      qty: 12,
      unitPrice: 420,
      warranty: '6 أشهر ضد الصرير'
    },
    {
      id: 'q3',
      description: 'فحص كمبيوتر شامل لجميع الأنظمة وبرمجة الحساسات وكنترول المحرك وتصفية الأعطال',
      sku: 'DIAG-SCAN-FULL',
      qty: 20,
      unitPrice: 150,
      warranty: 'تقرير فني رقمي معتمد'
    },
    {
      id: 'q4',
      description: 'صيانة وتعبئة فريون دورة التكييف بغاز R134a أصلي وفحص تسريبات بالليزر',
      sku: 'AC-GAS-R134-REFILL',
      qty: 10,
      unitPrice: 220,
      warranty: '3 أشهر على دورة التبريد'
    },
    {
      id: 'q5',
      description: 'استبدال بطارية عالية الكفاءة 70 أمبير مع ضمان الوكيل المعتمد والتركيب الميداني',
      sku: 'BAT-70AH-HEAVY',
      qty: 8,
      unitPrice: 380,
      warranty: '12 شهراً استبدال فوري'
    }
  ]);
  const [quoteTerms, setQuoteTerms] = useState<string>(
    '1. الأسعار الموضحة تشمل أجور اليد والقطع وفحص السلامة الميداني بموقع العميل.\n2. يتم تطبيق خصم الشراكة الخاص للأساطيل (15%) على إجمالي الفاتورة الشهرية.\n3. شروط السداد: تسوية فواتير شهرية بموجب كشف حساب معتمد خلال 30 يوماً من تاريخ إصدار المطالبة.\n4. الضمان: يسري الضمان المعتمد على جميع القطع وشغل اليد مع التزامنا بالإصلاح الفوري.'
  );

  // 3. Contract specific state
  const [contractSubject, setContractSubject] = useState<string>('اتفاقية إدارة وصيانة أسطول مركبات تجاري');
  const [contractNumber, setContractNumber] = useState<string>('CTR-CORP-2026-09');
  const [contractStartDate, setContractStartDate] = useState<string>('2026-05-01');
  const [contractEndDate, setContractEndDate] = useState<string>('2027-04-30');
  const [contractClauses, setContractClauses] = useState<ContractClause[]>([
    {
      id: 'c1',
      title: 'البند الأول: موضوع ونطاق الاتفاقية',
      content:
        'يتولى الطرف الأول (مركز DR.FIX) تقديم خدمات الصيانة الدورية، الصيانة الوقائية، الصيانة الطارئة والميكانيكية، لأسطول مركبات الطرف الثاني بموجب أعلى المعايير الهندسية والميكانيكية المعتمدة، مع توفير ورش متنقلة مجهزة تصل لموقع الطرف الثاني بمدينة جدة.'
    },
    {
      id: 'c2',
      title: 'البند الثاني: التزامات ومسؤوليات الطرف الأول (DR.FIX)',
      content:
        'يلتزم الطرف الأول بتوفير كادر فني مؤهل ومعدات فحص متطورة، واستخدام قطع غيار وزيوت أصلية معتمدة، وتقديم تقرير فني رقمي مفصل عن كل عملية صيانة، مع الالتزام بزمن استجابة لا يتجاوز 60 دقيقة في حالات الطوارئ و24 ساعة للصيانة الوقائية المجدولة.'
    },
    {
      id: 'c3',
      title: 'البند الثالث: المقابل المالي وآلية السداد',
      content:
        'يمنح الطرف الأول الطرف الثاني خصماً خاصاً بنسبة 20% على أسعار الخدمات وقطع الغيار المعتمدة. وتتم تسوية المستحقات بموجب فواتير ضريبية إلكترونية مجمعة تصدر شهرياً مصحوبة ببيان استهلاك الأسطول، ويكون السداد خلال 30 يوماً من استلام الفاتورة.'
    },
    {
      id: 'c4',
      title: 'البند الرابع: الضمان والجودة',
      content:
        'يقدم الطرف الأول ضماناً رسمياً لمدة 6 أشهر أو 10,000 كم (أيهما يسبق) على جميع أعمال الصيانة الميكانيكية والكهربائية، وضمان الوكيل على البطاريات وقطع الغيار الجديدة. ويلتزم بإعادة الإصلاح دون أي مقابل مالي في حال ظهور أي عيب مصنعي أو فني.'
    },
    {
      id: 'c5',
      title: 'البند الخامس: سريان العقد وتجديده والاختصاص',
      content:
        'يسري هذا العقد لمدة عام كامل تبدأ من تاريخ توقيعه، ويتجدد تلقائياً لمدد مماثلة ما لم يخطر أحد الطرفين الآخر خطياً بعدم الرغبة في التجديد قبل 30 يوماً من تاريخ الانتهاء. وتخضع هذه الاتفاقية للأنظمة واللوائح المعمول بها في المملكة العربية السعودية ومحاكم مدينة جدة.'
    }
  ]);

  // 4. B2B Proposal specific state
  const [proposalSubject, setProposalSubject] = useState<string>(
    'مقترح شراكة استراتيجية لإدارة وصيانة أساطيل التأجير والشركات اللوجستية (DR.FIX Mobile Fleet)'
  );
  const [proposalPackages, setProposalPackages] = useState<ProposalPackage[]>([
    {
      id: 'pkg1',
      name: 'باقة الصيانة الوقائية السريعة (Essential Fleet)',
      target: 'مخصصة لسيارات الإيجار اليومي والتشغيل المكثف',
      priceTag: 'تبدأ من 199 ريال / سيارة شهرياً',
      features: [
        'غيار زيت محرك تخليقي عالي الجودة مع الفلتر الأصلي كل 10,000 كم.',
        'فحص سلامة وقائي شامل يشمل 25 نقطة فحص (فرامل، سوائل، بطارية، إطارات).',
        'تعبئة سوائل التبريد ومساحات الزجاج وضبط ضغط الإطارات مجاناً.',
        'صيانة ميدانية في مقر شركة التأجير دون الحاجة لنقل المركبات.'
      ]
    },
    {
      id: 'pkg2',
      name: 'باقة الأسطول الذهبية المتكاملة (Gold Comprehensive)',
      target: 'الخيار المثالي للأساطيل المتوسطة والكبيرة (20 مركبة فأكثر)',
      priceTag: 'تبدأ من 349 ريال / سيارة شهرياً',
      features: [
        'تشمل كافة مزايا باقة الصيانة الوقائية السريعة كاملة.',
        'صيانة مجدولة لنظام الفرامل، السيور، الفلاتر الداخلية، وشمعات الاحتراق.',
        'فحص دورة التكييف وتعبئة الفريون مجاناً مرتين سنوياً.',
        'خصم 25% على أعمال الميكانيكا المتقدمة والسمكرة والدهان الحراري.',
        'أولوية قصوى ودخول فوري لمراكز الصيانة ومساندة الورش المتنقلة.'
      ]
    },
    {
      id: 'pkg3',
      name: 'باقة الطوارئ والمساندة الميدانية 24/7 (Roadside Support VIP)',
      target: 'للحفاظ على تشغيل الأسطول دون أي تعطيل للعملاء',
      priceTag: 'إضافة اختيارية بـ 85 ريال / سيارة شهرياً',
      features: [
        'خدمة طوارئ ميدانية على مدار الساعة في جميع مناطق جدة وضواحيها.',
        'وصول فني سريع خلال 35 إلى 50 دقيقة لمعالجة الأعطال السريعة.',
        'شحن وتبديل بطاريات، بنشر وإصلاح إطارات، تزويد بالوقود، وفتح سيارات مقفلة.',
        'خدمة سحب وسطحة مجانية إلى المركز في حال تعذر الإصلاح الميداني.'
      ]
    }
  ]);

  // Sync when contractData is provided
  useEffect(() => {
    if (contractData) {
      setDocType('contract');
      setRecipientCompany(contractData.partyName || recipientCompany);
      setRecipientContact(contractData.contactPerson || recipientContact);
      setRecipientCity(contractData.city || 'جدة');
      if (contractData.crNumber) setRecipientCr(contractData.crNumber);
      if (contractData.taxNumber) setRecipientVat(contractData.taxNumber);
      if (contractData.contractNumber) {
        setContractNumber(contractData.contractNumber);
        setRefNumber(contractData.contractNumber);
      }
      if (contractData.title) setContractSubject(contractData.title);
      if (contractData.startDate) setContractStartDate(contractData.startDate);
      if (contractData.endDate) setContractEndDate(contractData.endDate);
      if (contractData.termsConditions) {
        setContractClauses([
          {
            id: 'c-custom-1',
            title: 'البند الأول: موضوع ونطاق الاتفاقية المعتمد',
            content: contractData.specializationOrScope || 'إسناد وصيانة أسطول المركبات وفق أعلى معايير الجودة.'
          },
          {
            id: 'c-custom-2',
            title: 'البند الثاني: الشروط والالتزامات التعاقدية',
            content: contractData.termsConditions
          },
          {
            id: 'c-custom-3',
            title: 'البند الثالث: المقابل المالي وشروط السداد',
            content: `نسبة الخصم أو العمولة: ${contractData.commissionOrDiscount || 'حسب الاتفاق'}. شروط السداد: ${contractData.paymentTermsDetails || 'تسوية فواتير شهرية'}.`
          }
        ]);
      }
    }
  }, [contractData]);

  // Calculations for quotation
  const subtotal = quotationItems.reduce((acc, item) => acc + item.qty * item.unitPrice, 0);
  const discountAmount = Math.round(subtotal * (quoteDiscountPercent / 100));
  const netAfterDiscount = subtotal - discountAmount;
  const vatAmount = Math.round(netAfterDiscount * 0.15 * 100) / 100;
  const grandTotal = Math.round((netAfterDiscount + vatAmount) * 100) / 100;

  // Print Action
  const handlePrint = () => {
    window.print();
  };

  // Reset to default sample values
  const handleReset = () => {
    setRecipientCompany('شركة الأسطول الماسي لتأجير السيارات');
    setRecipientContact('سعادة الأستاذ / فهد بن خالد السلمي');
    setRecipientTitle('المدير العام والمسؤول التنفيذي');
    setRefNumber(`DRF-DOC-2026-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  // Preset switchers for rapid corporate scenario testing
  const applyPreset = (preset: 'rental' | 'logistics' | 'government') => {
    if (preset === 'rental') {
      setRecipientCompany('شركة المفتاح لتأجير السيارات (فرع أساطيل الغربية)');
      setRecipientContact('سعادة مدير العمليات والصيانة / م. طارق العتيبي');
      setRecipientCity('جدة - طريق الملك عبدالعزيز');
      setRecipientCr('4030114590');
      setRecipientVat('300184920100003');
      setDocType('proposal');
      setProposalSubject('عرض شراكة حصرية لخدمات الصيانة السريعة والمتنقلة لأسطول تأجير السيارات بجدة');
    } else if (preset === 'logistics') {
      setRecipientCompany('مؤسسة السهم اللوجستي للنقل والتوصيل السريع');
      setRecipientContact('سعادة مدير الأسطول والنقل / أ. ماجد باوزير');
      setRecipientCity('جدة - المنطقة اللوجستية الخمرة');
      setRecipientCr('4030782341');
      setRecipientVat('310992384700003');
      setDocType('quotation');
      setQuoteSubject('عرض أسعار صيانة أسطول فانات التوصيل والشاحنات الخفيفة');
    } else {
      setRecipientCompany('الجهة الرسمية المعنية / الهيئة العامة للنقل - فرع منطقة مكة المكرمة');
      setRecipientContact('سعادة مدير إدارة التراخيص والرقابة الميدانية');
      setRecipientCity('جدة - المملكة العربية السعودية');
      setDocType('letter');
      setLetterSubject('إفادة مطابقة المعايير الفنية والتجهيزات المتنقلة لمركز صيانة السيارات DR.FIX');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md overflow-hidden text-right" dir="rtl">
      
      {/* ========================================================================= */}
      {/* 1. TOP CONTROL BAR (Hidden during @media print) */}
      {/* ========================================================================= */}
      <header className="bg-neutral-900 border-b border-neutral-800 text-white px-4 sm:px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3 shadow-xl z-20 print:hidden">
        
        {/* Left Side: Brand badge & Document Type Selector */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          <div className="flex items-center gap-2 bg-neutral-800/80 px-3 py-1.5 rounded-xl border border-neutral-700/60">
            <div className="w-6 h-6 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center font-black text-xs">
              DF
            </div>
            <span className="font-bold text-xs text-neutral-200">الورقة الرسمية الفاخرة (Corporate Letterhead)</span>
          </div>

          {/* Document Type Switcher Tabs */}
          <div className="flex items-center bg-neutral-800 p-1 rounded-xl border border-neutral-700/50 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setDocType('letter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                docType === 'letter'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>خطاب رسمي</span>
            </button>

            <button
              onClick={() => setDocType('quotation')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                docType === 'quotation'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>عرض أسعار</span>
            </button>

            <button
              onClick={() => setDocType('contract')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                docType === 'contract'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <Handshake className="w-3.5 h-3.5" />
              <span>عقد واتفاقية</span>
            </button>

            <button
              onClick={() => setDocType('proposal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                docType === 'proposal'
                  ? 'bg-red-600 text-white shadow-md'
                  : 'text-neutral-300 hover:text-white hover:bg-neutral-700/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>مقترح أساطيل وتأجير</span>
            </button>
          </div>
        </div>

        {/* Right Side Controls: Presets, Edit Mode, Zoom, Print, Close */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Quick Presets Dropdown/Buttons */}
          <div className="hidden md:flex items-center gap-1 text-[11px] text-neutral-400 bg-neutral-800/80 px-2 py-1 rounded-xl border border-neutral-700/50">
            <span>نماذج سريعة:</span>
            <button
              onClick={() => applyPreset('rental')}
              className="px-2 py-0.5 rounded hover:bg-neutral-700 text-neutral-200 hover:text-red-400 transition-colors"
            >
              مكتب تأجير
            </button>
            <span className="text-neutral-600">|</span>
            <button
              onClick={() => applyPreset('logistics')}
              className="px-2 py-0.5 rounded hover:bg-neutral-700 text-neutral-200 hover:text-red-400 transition-colors"
            >
              شركة لوجستية
            </button>
            <span className="text-neutral-600">|</span>
            <button
              onClick={() => applyPreset('government')}
              className="px-2 py-0.5 rounded hover:bg-neutral-700 text-neutral-200 hover:text-red-400 transition-colors"
            >
              خطاب رسمي
            </button>
          </div>

          {/* Toggle Edit / Preview */}
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
              isEditMode
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
            }`}
            title="تفعيل وضع تعديل النصوص مباشرة"
          >
            {isEditMode ? <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" /> : <Edit3 className="w-3.5 h-3.5" />}
            <span>{isEditMode ? 'إنهاء التعديل' : 'تعديل البيانات'}</span>
          </button>

          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-neutral-800 rounded-xl border border-neutral-700/60 p-0.5 text-xs text-neutral-300">
            <button
              onClick={() => setZoomLevel(Math.max(75, zoomLevel - 10))}
              className="p-1.5 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
              title="تصغير"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[11px] font-mono text-neutral-400">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(Math.min(125, zoomLevel + 10))}
              className="p-1.5 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
              title="تكبير"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* PRINT BUTTON (Calls native window.print) */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-xl text-xs font-black shadow-lg shadow-red-900/40 hover:shadow-red-600/30 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة الورقة الرسمية (A4 Print / PDF)</span>
          </button>

          {/* Close Modal */}
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
            title="إغلاق المعاينة"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN DOCUMENT PREVIEW WORKSPACE (Gray canvas with realistic A4 paper) */}
      {/* ========================================================================= */}
      <main className="flex-1 overflow-auto bg-neutral-950 p-3 sm:p-8 flex justify-center items-start print:p-0 print:m-0 print:bg-white print:overflow-visible">
        
        {/* Transform container for zoom */}
        <div
          style={{
            transform: `scale(${zoomLevel / 100})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease-out'
          }}
          className="print:transform-none"
        >
          {/* ===================================================================== */}
          {/* THE OFFICIAL A4 LETTERHEAD CONTAINER */}
          {/* Dimensions: 210mm x 297mm standard A4, pure white background */}
          {/* ===================================================================== */}
          <div
            id="drfix-official-letterhead-print"
            className="bg-white text-neutral-900 shadow-2xl relative overflow-hidden transition-all print:shadow-none"
            style={{
              width: '210mm',
              minHeight: '297mm',
              boxSizing: 'border-box',
              padding: '14mm 16mm 14mm 16mm',
              position: 'relative',
              backgroundColor: '#ffffff'
            }}
          >
            {/* ------------------------------------------------------------------- */}
            {/* SUBTLE GEOMETRIC WATERMARK (Ultra-light, abstract mechanical CAD art) */}
            {/* ------------------------------------------------------------------- */}
            <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-[0.035] overflow-hidden select-none">
              <svg className="w-[600px] h-[600px]" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="250" cy="250" r="230" stroke="#E31837" strokeWidth="1.5" strokeDasharray="8 6" />
                <circle cx="250" cy="250" r="180" stroke="#000000" strokeWidth="1" />
                <circle cx="250" cy="250" r="130" stroke="#E31837" strokeWidth="2" />
                <circle cx="250" cy="250" r="80" stroke="#000000" strokeWidth="1" strokeDasharray="4 4" />
                {/* Mechanical Crosshairs & Gear teeth */}
                <line x1="20" y1="250" x2="480" y2="250" stroke="#000000" strokeWidth="0.75" />
                <line x1="250" y1="20" x2="250" y2="480" stroke="#000000" strokeWidth="0.75" />
                <path d="M220,50 L280,50 L270,90 L230,90 Z" fill="#E31837" />
                <path d="M220,450 L280,450 L270,410 L230,410 Z" fill="#E31837" />
                <path d="M50,220 L50,280 L90,270 L90,230 Z" fill="#E31837" />
                <path d="M450,220 L450,280 L410,270 L410,230 Z" fill="#E31837" />
              </svg>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* LUXURY DUAL FRAME BORDER (Hairline red & silver precision) */}
            {/* ------------------------------------------------------------------- */}
            <div className="absolute inset-[6mm] border border-neutral-300 pointer-events-none z-0 rounded-sm">
              {/* Inner secondary hairline */}
              <div className="absolute inset-[2mm] border border-neutral-200/80" />

              {/* Top-Right Precision Corner Accent (DR.FIX Red + Silver) */}
              <div className="absolute -top-[1px] -right-[1px] w-8 h-8 pointer-events-none">
                <div className="absolute top-0 right-0 w-8 h-[2px] bg-red-600" />
                <div className="absolute top-0 right-0 w-[2px] h-8 bg-red-600" />
                <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-neutral-400 rounded-none" />
              </div>

              {/* Top-Left Precision Corner Accent */}
              <div className="absolute -top-[1px] -left-[1px] w-8 h-8 pointer-events-none">
                <div className="absolute top-0 left-0 w-8 h-[2px] bg-red-600" />
                <div className="absolute top-0 left-0 w-[2px] h-8 bg-red-600" />
                <div className="absolute top-1.5 left-1.5 w-1.5 h-1.5 bg-neutral-400 rounded-none" />
              </div>

              {/* Bottom-Right Precision Corner Accent */}
              <div className="absolute -bottom-[1px] -right-[1px] w-8 h-8 pointer-events-none">
                <div className="absolute bottom-0 right-0 w-8 h-[2px] bg-red-600" />
                <div className="absolute bottom-0 right-0 w-[2px] h-8 bg-red-600" />
                <div className="absolute bottom-1.5 right-1.5 w-1.5 h-1.5 bg-neutral-400 rounded-none" />
              </div>

              {/* Bottom-Left Precision Corner Accent */}
              <div className="absolute -bottom-[1px] -left-[1px] w-8 h-8 pointer-events-none">
                <div className="absolute bottom-0 left-0 w-8 h-[2px] bg-red-600" />
                <div className="absolute bottom-0 left-0 w-[2px] h-8 bg-red-600" />
                <div className="absolute bottom-1.5 left-1.5 w-1.5 h-1.5 bg-neutral-400 rounded-none" />
              </div>
            </div>

            {/* ------------------------------------------------------------------- */}
            {/* CONTENT LAYER */}
            {/* ------------------------------------------------------------------- */}
            <div className="relative z-10 flex flex-col justify-between min-h-full">
              
              {/* TOP SECTION: HEADER & DIVIDER */}
              <div>
                
                {/* 1. Official Corporate Letterhead Header */}
                <div className="flex items-center justify-between pb-4 gap-4">
                  
                  {/* Right Side (Arabic Brand & Logo) */}
                  <div className="flex items-center gap-3.5">
                    <div className="w-16 h-16 rounded-2xl bg-black p-2 flex items-center justify-center border border-neutral-300 shadow-sm shrink-0">
                      <img
                        src={settings?.logoUrl || '/logo-custom.png'}
                        alt="DR.FIX Official Logo"
                        className="max-h-full max-w-full object-contain"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src.indexOf('logo.png') === -1) {
                            target.src = '/logo.png';
                          }
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl font-black tracking-tight text-neutral-950 font-display">
                          DR.<span className="text-red-600">FIX</span>
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-700 border border-neutral-300 font-mono">
                          KSA
                        </span>
                      </div>
                      <div className="text-xs font-bold text-neutral-800 tracking-wider font-display">
                        مركز صيانة السيارات والخدمات المتنقلة
                      </div>
                      <div className="text-[10px] font-semibold text-neutral-500 tracking-wider font-mono uppercase" dir="ltr">
                        CAR MAINTENANCE & MOBILE SERVICES
                      </div>
                    </div>
                  </div>

                  {/* Left Side (Official Corporate Contact & Registration Info) */}
                  <div className="text-left font-mono text-[10px] text-neutral-700 leading-tight space-y-0.5" dir="ltr">
                    <div className="font-bold text-neutral-900 flex items-center gap-1.5 justify-end">
                      <span>C.R:</span>
                      <span className="text-red-600 font-black text-[11px]">{settings?.commercialRegister || '7055517838'}</span>
                    </div>
                    {settings?.vatNumber && (
                      <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                        <span>VAT:</span>
                        <span className="font-semibold text-neutral-900">{settings.vatNumber}</span>
                      </div>
                    )}
                    <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                      <span>Tel:</span>
                      <span className="font-bold text-neutral-900">{settings?.phone || '0546870807'}</span>
                    </div>
                    <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                      <span>Email:</span>
                      <span className="text-neutral-800">{settings?.email || 'info@drfix.repair'}</span>
                    </div>
                    <div className="text-neutral-600 flex items-center gap-1.5 justify-end">
                      <span>Web:</span>
                      <span className="text-red-700 font-semibold">www.drfix.repair</span>
                    </div>
                    <div className="text-[9px] text-neutral-500 text-right">Jeddah, Kingdom of Saudi Arabia</div>
                  </div>
                </div>

                {/* 2. Precision Dual Hairline Divider with Center Diamond Accent */}
                <div className="relative my-2">
                  <div className="w-full h-[2px] bg-red-600" />
                  <div className="w-full h-[0.75px] bg-neutral-300 mt-[1.5px]" />
                  {/* Center mechanical diamond accent */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 flex items-center gap-1 text-[9px] font-mono text-red-600 font-bold uppercase tracking-widest">
                    <span>◆</span>
                    <span>DR.FIX OFFICIAL</span>
                    <span>◆</span>
                  </div>
                </div>

                {/* 3. Document Meta Bar (Ref, Date Gregorian, Date Hijri, Classification) */}
                <div className="bg-neutral-50 border border-neutral-200/90 rounded-xl px-4 py-2 mt-3 mb-5 flex items-center justify-between text-xs text-neutral-800">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 font-medium">رقم الإشارة (Ref):</span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={refNumber}
                          onChange={(e) => setRefNumber(e.target.value)}
                          className="px-2 py-0.5 text-xs font-mono font-bold bg-white border border-neutral-300 rounded text-red-600 focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono font-black text-red-600">{refNumber}</span>
                      )}
                    </div>

                    <div className="hidden sm:inline-block text-neutral-300">|</div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-neutral-500 font-medium">التاريخ:</span>
                      {isEditMode ? (
                        <input
                          type="date"
                          value={gregorianDate}
                          onChange={(e) => setGregorianDate(e.target.value)}
                          className="px-2 py-0.5 text-xs font-mono bg-white border border-neutral-300 rounded focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono font-semibold">{gregorianDate} م</span>
                      )}
                      <span className="text-neutral-400 text-[10px]">({hijriDate})</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-md text-[10px] font-bold border border-red-200/80">
                    <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                    <span>وثيقة رسمية معتمدة | Approved Document</span>
                  </div>
                </div>

                {/* 4. Document Recipient Box */}
                <div className="border border-neutral-200 rounded-xl p-3.5 bg-neutral-50/50 mb-5 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <div className="text-neutral-500 text-[11px] mb-0.5">الجهة الموجه إليها:</div>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={recipientCompany}
                          onChange={(e) => setRecipientCompany(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-neutral-300 rounded font-bold text-neutral-900 focus:outline-none"
                        />
                      ) : (
                        <div className="font-black text-sm text-neutral-950 font-display">{recipientCompany}</div>
                      )}
                    </div>

                    <div>
                      <div className="text-neutral-500 text-[11px] mb-0.5">عناية المسئول / المفوض:</div>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={recipientContact}
                          onChange={(e) => setRecipientContact(e.target.value)}
                          className="w-full px-2 py-1 bg-white border border-neutral-300 rounded font-semibold text-neutral-900 focus:outline-none"
                        />
                      ) : (
                        <div className="font-bold text-neutral-800">{recipientContact}</div>
                      )}
                    </div>
                  </div>

                  {(recipientCr || recipientVat || recipientCity) && (
                    <div className="flex items-center gap-4 text-[10px] text-neutral-500 font-mono mt-2 pt-2 border-t border-neutral-200/80">
                      <span>المدينة: {recipientCity}</span>
                      {recipientCr && <span>السجل التجاري: {recipientCr}</span>}
                      {recipientVat && <span>الرقم الضريبي: {recipientVat}</span>}
                    </div>
                  )}
                </div>

                {/* --------------------------------------------------------------- */}
                {/* 5. DYNAMIC DOCUMENT BODY (Based on Selected Document Type) */}
                {/* --------------------------------------------------------------- */}

                {/* =============================================================== */}
                {/* TEMPLATE 1: OFFICIAL LETTER (الخطابات الرسمية) */}
                {/* =============================================================== */}
                {docType === 'letter' && (
                  <div className="space-y-4 text-xs leading-relaxed text-neutral-800">
                    
                    {/* Subject Header */}
                    <div className="bg-neutral-100 border-r-4 border-red-600 px-3.5 py-2 rounded-l-lg">
                      <span className="font-bold text-neutral-600">الموضوع: </span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={letterSubject}
                          onChange={(e) => setLetterSubject(e.target.value)}
                          className="w-full mt-1 px-2 py-1 bg-white border border-neutral-300 rounded font-black text-neutral-950 focus:outline-none"
                        />
                      ) : (
                        <span className="font-black text-sm text-neutral-950 font-display">{letterSubject}</span>
                      )}
                    </div>

                    {/* Letter Body Intro */}
                    {isEditMode ? (
                      <textarea
                        rows={4}
                        value={letterIntro}
                        onChange={(e) => setLetterIntro(e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-300 rounded text-xs leading-relaxed focus:outline-none"
                      />
                    ) : (
                      <div className="whitespace-pre-line text-neutral-800 font-sans text-[12.5px] leading-relaxed">
                        {letterIntro}
                      </div>
                    )}

                    {/* Points / Scope of Work */}
                    <div className="bg-neutral-50/70 border border-neutral-200/90 rounded-xl p-3.5 space-y-2">
                      <div className="font-bold text-neutral-900 text-[11px] mb-1">
                        أبرز محاور والتزامات خدمات DR.FIX المعتمدة:
                      </div>
                      {letterPoints.map((point, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          {isEditMode ? (
                            <input
                              type="text"
                              value={point}
                              onChange={(e) => {
                                const updated = [...letterPoints];
                                updated[idx] = e.target.value;
                                setLetterPoints(updated);
                              }}
                              className="flex-1 px-2 py-0.5 bg-white border border-neutral-300 rounded text-xs focus:outline-none"
                            />
                          ) : (
                            <span className="text-neutral-800 text-xs">{point}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Outro */}
                    {isEditMode ? (
                      <textarea
                        rows={3}
                        value={letterOutro}
                        onChange={(e) => setLetterOutro(e.target.value)}
                        className="w-full p-2 bg-white border border-neutral-300 rounded text-xs leading-relaxed focus:outline-none"
                      />
                    ) : (
                      <div className="whitespace-pre-line text-neutral-800 font-sans text-xs leading-relaxed pt-1">
                        {letterOutro}
                      </div>
                    )}
                  </div>
                )}

                {/* =============================================================== */}
                {/* TEMPLATE 2: QUOTATION (عروض الأسعار المعتمدة) */}
                {/* =============================================================== */}
                {docType === 'quotation' && (
                  <div className="space-y-4 text-xs leading-relaxed text-neutral-800">
                    
                    {/* Subject & Validity */}
                    <div className="flex items-center justify-between bg-neutral-100 border-r-4 border-red-600 px-3.5 py-2 rounded-l-lg">
                      <div>
                        <span className="font-bold text-neutral-600">الموضوع: </span>
                        <span className="font-black text-sm text-neutral-950 font-display">{quoteSubject}</span>
                      </div>
                      <div className="text-[10px] font-mono text-neutral-600 bg-white px-2 py-0.5 rounded border border-neutral-200">
                        سريان العرض: {quoteValidity}
                      </div>
                    </div>

                    {/* Quotation Items Table */}
                    <div className="border border-neutral-300 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-right text-xs">
                        <thead className="bg-neutral-100 text-neutral-900 font-bold border-b border-neutral-300 text-[11px]">
                          <tr>
                            <th className="p-2 w-8 text-center">#</th>
                            <th className="p-2">بيان الخدمة / الصيانة وقطع الغيار</th>
                            <th className="p-2 text-center w-24">كود البند</th>
                            <th className="p-2 text-center w-12">الكمية</th>
                            <th className="p-2 text-center w-20">السعر (ر.س)</th>
                            <th className="p-2 text-center w-24">الإجمالي (ر.س)</th>
                            <th className="p-2 text-center w-28">الضمان</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 text-[11px]">
                          {quotationItems.map((item, idx) => (
                            <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-neutral-50/60'}>
                              <td className="p-2 text-center font-mono font-semibold text-neutral-500">{idx + 1}</td>
                              <td className="p-2 font-medium text-neutral-900">{item.description}</td>
                              <td className="p-2 text-center font-mono text-[10px] text-neutral-500">{item.sku}</td>
                              <td className="p-2 text-center font-bold text-neutral-900">{item.qty}</td>
                              <td className="p-2 text-center font-mono font-semibold">{item.unitPrice.toLocaleString()}</td>
                              <td className="p-2 text-center font-mono font-bold text-neutral-950">
                                {(item.qty * item.unitPrice).toLocaleString()}
                              </td>
                              <td className="p-2 text-center text-[10px] text-neutral-600 font-medium">{item.warranty}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Financial Summary & VAT Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Terms Box */}
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-[11px] leading-relaxed">
                        <div className="font-bold text-neutral-900 mb-1 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-red-600" />
                          <span>الشروط والأحكام المالية والفنية:</span>
                        </div>
                        <div className="whitespace-pre-line text-neutral-700">{quoteTerms}</div>
                      </div>

                      {/* Math Summary Box */}
                      <div className="bg-neutral-50 border border-neutral-300 rounded-xl p-3 text-xs space-y-1.5 font-mono">
                        <div className="flex justify-between text-neutral-600">
                          <span>المجموع الفرعي (قبل الخصم):</span>
                          <span className="font-bold text-neutral-900">{subtotal.toLocaleString()} ر.س</span>
                        </div>

                        <div className="flex justify-between text-emerald-700">
                          <span>خصم شراكة الأساطيل ({quoteDiscountPercent}%):</span>
                          <span className="font-bold">- {discountAmount.toLocaleString()} ر.س</span>
                        </div>

                        <div className="flex justify-between text-neutral-700 pt-1 border-t border-neutral-200">
                          <span>الصافي الخاضع للضريبة:</span>
                          <span className="font-bold">{netAfterDiscount.toLocaleString()} ر.س</span>
                        </div>

                        <div className="flex justify-between text-neutral-700">
                          <span>ضريبة القيمة المضافة (15% VAT):</span>
                          <span className="font-bold">{vatAmount.toLocaleString()} ر.س</span>
                        </div>

                        <div className="flex justify-between text-neutral-950 text-sm font-black pt-1.5 border-t-2 border-red-600 bg-red-50/50 p-1.5 rounded">
                          <span className="font-display">الإجمالي النهائي المستحق:</span>
                          <span className="text-red-600">{grandTotal.toLocaleString()} ريال سعودي</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* =============================================================== */}
                {/* TEMPLATE 3: CONTRACT & AGREEMENT (الاتفاقيات والعقود) */}
                {/* =============================================================== */}
                {docType === 'contract' && (
                  <div className="space-y-4 text-xs leading-relaxed text-neutral-800">
                    
                    {/* Contract Title Banner */}
                    <div className="text-center py-2 bg-neutral-100 border border-neutral-300 rounded-xl">
                      <div className="text-[10px] font-mono font-bold text-red-600 uppercase tracking-widest">
                        OFFICIAL SERVICE & FLEET AGREEMENT
                      </div>
                      <h2 className="text-base font-black text-neutral-950 font-display mt-0.5">
                        {contractSubject}
                      </h2>
                      <div className="text-[10px] font-mono text-neutral-600 mt-0.5">
                        رقم العقد: {contractNumber} | فترة السريان: من {contractStartDate} إلى {contractEndDate}
                      </div>
                    </div>

                    {/* Preamble: Parties Introduction */}
                    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 space-y-2 text-[11px]">
                      <div className="font-bold text-neutral-900 border-b border-neutral-200 pb-1">
                        ديباجة وأطراف الاتفاقية:
                      </div>
                      <div className="leading-relaxed">
                        <span className="font-bold text-red-600">الطرف الأول: </span>
                        <span>
                          <b>مركز DR.FIX لصيانة السيارات</b> (سجل تجاري: {settings?.commercialRegister || '7055517838'}
                          {settings?.vatNumber ? `، رقم ضريبي: ${settings.vatNumber}` : ''})، ومقره الرئيسي بمدينة جدة، ويمثله في هذا العقد الإدارة العامة.
                        </span>
                      </div>
                      <div className="leading-relaxed">
                        <span className="font-bold text-red-600">الطرف الثاني: </span>
                        <span>
                          <b>{recipientCompany}</b>
                          {recipientCr && ` (سجل تجاري: ${recipientCr})`}
                          {recipientVat && ` (رقم ضريبي: ${recipientVat})`}
                          {`، الكائن بمدينة ${recipientCity}، ويمثله بالتوقيع: ${recipientContact}.`}
                        </span>
                      </div>
                    </div>

                    {/* Contract Clauses */}
                    <div className="space-y-2.5">
                      {contractClauses.map((clause, idx) => (
                        <div key={clause.id} className="border border-neutral-200/90 rounded-xl p-2.5 bg-white shadow-xs">
                          <div className="font-bold text-neutral-900 text-[11.5px] border-b border-neutral-100 pb-1 mb-1 font-display">
                            {clause.title}
                          </div>
                          {isEditMode ? (
                            <textarea
                              rows={2}
                              value={clause.content}
                              onChange={(e) => {
                                const updated = [...contractClauses];
                                updated[idx].content = e.target.value;
                                setContractClauses(updated);
                              }}
                              className="w-full p-1 bg-white border border-neutral-300 rounded text-xs leading-relaxed focus:outline-none"
                            />
                          ) : (
                            <p className="text-neutral-700 text-[11px] leading-relaxed">{clause.content}</p>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Vehicles Schedule (if available from props) */}
                    {contractData?.vehicles && contractData.vehicles.length > 0 && (
                      <div className="border border-neutral-300 rounded-xl overflow-hidden text-[11px]">
                        <div className="bg-neutral-100 px-3 py-1.5 font-bold text-neutral-900 border-b border-neutral-300 flex items-center justify-between">
                          <span>ملحق جدول أسطول المركبات المشمولة بالعقد:</span>
                          <span className="font-mono text-[10px] text-neutral-600">
                            {contractData.vehicles.length} مركبة مسجلة
                          </span>
                        </div>
                        <table className="w-full text-right">
                          <thead className="bg-neutral-50 text-neutral-700 text-[10px] border-b border-neutral-200">
                            <tr>
                              <th className="p-1.5 w-8 text-center">#</th>
                              <th className="p-1.5">رقم اللوحة</th>
                              <th className="p-1.5">طراز السيارة والسنة</th>
                              <th className="p-1.5">نوع الصيانة المطلوبة</th>
                              <th className="p-1.5 text-center">الحالة</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200">
                            {contractData.vehicles.slice(0, 5).map((v, i) => (
                              <tr key={v.id || i}>
                                <td className="p-1.5 text-center font-mono text-neutral-500">{i + 1}</td>
                                <td className="p-1.5 font-bold font-mono text-neutral-950">{v.plateNumber}</td>
                                <td className="p-1.5 text-neutral-800">
                                  {v.carModel} {v.carYear}
                                </td>
                                <td className="p-1.5 text-neutral-600">{v.serviceRequired}</td>
                                <td className="p-1.5 text-center">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-neutral-100 text-neutral-800">
                                    معتمد
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* =============================================================== */}
                {/* TEMPLATE 4: B2B FLEET & RENTAL PROPOSAL (مقترح الشركات والتأجير) */}
                {/* =============================================================== */}
                {docType === 'proposal' && (
                  <div className="space-y-4 text-xs leading-relaxed text-neutral-800">
                    
                    {/* Subject Header */}
                    <div className="bg-neutral-100 border-r-4 border-red-600 px-3.5 py-2 rounded-l-lg">
                      <span className="font-bold text-neutral-600">الموضوع: </span>
                      <span className="font-black text-sm text-neutral-950 font-display">{proposalSubject}</span>
                    </div>

                    {/* Executive Summary */}
                    <p className="text-[11.5px] leading-relaxed text-neutral-800">
                      يسر <b>مركز DR.FIX</b> أن يقدم لسعادتكم هذا المقترح الفني والتشغيلي المتكامل، المصمم خصيصاً لمواكبة
                      احتياجات شركات ومكاتب تأجير السيارات والشركات اللوجستية بمدينة جدة. نهدف من خلال منظومتنا المتنقلة إلى
                      <b> رفع الجاهزية التشغيلية لأسطولكم بنسبة 99%</b>، وخفض تكاليف التعطيل ونقل المركبات.
                    </p>

                    {/* Fleet Pillars (4 Strategic Advantages) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="bg-neutral-50 border border-neutral-200 p-2 rounded-xl">
                        <Wrench className="w-5 h-5 text-red-600 mx-auto mb-1" />
                        <div className="font-black text-[11px] text-neutral-950">ورش صيانة متنقلة</div>
                        <div className="text-[9.5px] text-neutral-500 mt-0.5">صيانة في موقعك وفروعك بجدة</div>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 p-2 rounded-xl">
                        <Clock className="w-5 h-5 text-red-600 mx-auto mb-1" />
                        <div className="font-black text-[11px] text-neutral-950">استجابة سريعة 24/7</div>
                        <div className="text-[9.5px] text-neutral-500 mt-0.5">طوارئ ومساندة على الطريق</div>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 p-2 rounded-xl">
                        <Car className="w-5 h-5 text-red-600 mx-auto mb-1" />
                        <div className="font-black text-[11px] text-neutral-950">توفير 100% سطحات</div>
                        <div className="text-[9.5px] text-neutral-500 mt-0.5">بدون نقل أو تعطيل سيارات</div>
                      </div>

                      <div className="bg-neutral-50 border border-neutral-200 p-2 rounded-xl">
                        <ShieldCheck className="w-5 h-5 text-red-600 mx-auto mb-1" />
                        <div className="font-black text-[11px] text-neutral-950">فوترة رقمية موحدة</div>
                        <div className="text-[9.5px] text-neutral-500 mt-0.5">كشف شهري وتقارير فنية</div>
                      </div>
                    </div>

                    {/* Fleet Service Packages */}
                    <div className="space-y-2 pt-1">
                      <div className="font-bold text-neutral-900 text-xs border-b border-neutral-200 pb-1">
                        باقات الصيانة الدورية المقترحة لأسطولكم:
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {proposalPackages.map((pkg) => (
                          <div
                            key={pkg.id}
                            className="border border-neutral-300 rounded-xl p-2.5 bg-neutral-50/50 flex flex-col justify-between"
                          >
                            <div>
                              <div className="font-black text-[11px] text-neutral-950 font-display mb-0.5">
                                {pkg.name}
                              </div>
                              <div className="text-[9px] text-red-600 font-bold font-mono mb-2">{pkg.priceTag}</div>
                              <ul className="space-y-1 text-[10px] text-neutral-700">
                                {pkg.features.map((feat, fIdx) => (
                                  <li key={fIdx} className="flex items-start gap-1">
                                    <span className="text-red-600 font-bold">✓</span>
                                    <span>{feat}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="text-[8.5px] text-neutral-400 mt-2 pt-1.5 border-t border-neutral-200 text-center font-mono">
                              {pkg.target}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* ----------------------------------------------------------------- */}
              {/* BOTTOM SECTION: SIGNATURES & OFFICIAL FOOTER */}
              {/* ----------------------------------------------------------------- */}
              <div className="mt-8 pt-4">
                
                {/* 1. Official Approvals, Signatures & Seal Block */}
                <div className="grid grid-cols-2 gap-8 border-t-2 border-neutral-300 pt-4 text-center text-xs">
                  
                  {/* First Party: DR.FIX Management Signature */}
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="font-black text-neutral-950 font-display">
                      اعتماد الطرف الأول (مركز DR.FIX لصيانة السيارات)
                    </div>
                    <div className="text-[10px] text-neutral-600 font-mono">Authorized Official Signature</div>
                    
                    {/* Clean Official Signature Area */}
                    <div className="relative w-48 h-20 my-2 flex flex-col items-center justify-end border-b-2 border-neutral-800 pb-1">
                      <span className="text-[9px] text-neutral-400 font-mono">توقيع المسؤول المعتمد / Signature</span>
                    </div>

                    <div className="text-[10.5px] font-bold text-neutral-900">{signatoryNameFirst}</div>
                    <div className="text-[9.5px] text-neutral-500">{signatoryRoleFirst}</div>
                  </div>

                  {/* Second Party: Client / Partner Approval */}
                  <div className="space-y-2 flex flex-col items-center">
                    <div className="font-black text-neutral-950 font-display">
                      اعتماد وقبول الطرف الثاني ({recipientCompany})
                    </div>
                    <div className="text-[10px] text-neutral-600 font-mono">Client Acceptance & Signature</div>
                    
                    {/* Clean Client Signature Area */}
                    <div className="relative w-48 h-20 my-2 flex flex-col items-center justify-end border-b-2 border-neutral-800 pb-1">
                      <span className="text-[9px] text-neutral-400 font-mono">توقيع المفوض / Authorized Signature</span>
                    </div>

                    <div className="text-[10.5px] font-bold text-neutral-900">{signatoryNameSecond}</div>
                    <div className="text-[9.5px] text-neutral-500">{signatoryRoleSecond}</div>
                  </div>
                </div>

                {/* 2. Official Letterhead Bottom Footer */}
                <div className="mt-5 pt-3 border-t border-neutral-300">
                  <div className="w-full h-[2px] bg-red-600 mb-2" />
                  
                  <div className="flex items-center justify-between text-[9px] text-neutral-600 font-mono leading-tight flex-wrap gap-2">
                    <div className="text-right">
                      <span className="font-bold text-neutral-900">المركز الرئيسي:</span>
                      <span> المملكة العربية السعودية - جدة | خدمة متنقلة ومراكز متخصصة</span>
                    </div>

                    <div className="text-center">
                      <span className="font-bold text-red-600">س.ت: </span>
                      <span className="font-bold text-neutral-900">{settings?.commercialRegister || '7055517838'}</span>
                      {settings?.vatNumber && (
                        <>
                          <span className="mx-1 text-neutral-400">|</span>
                          <span className="font-bold text-neutral-800">الرقم الضريبي: </span>
                          <span>{settings.vatNumber}</span>
                        </>
                      )}
                    </div>

                    <div className="text-left" dir="ltr">
                      <span>Tel: {settings?.phone || '0546870807'}</span>
                      <span className="mx-1 text-neutral-400">|</span>
                      <span>www.drfix.repair</span>
                    </div>
                  </div>

                  <div className="text-center text-[8.5px] text-neutral-400 mt-1 uppercase tracking-wider font-mono">
                    DR.FIX | Professional Automotive & Mobile Fleet Services
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. EMBEDDED PRINT CSS (Ensures pixel-perfect A4 printing) */}
      {/* ========================================================================= */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0 !important;
          }

          html, body {
            background-color: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Hide all non-printable elements */
          header, nav, footer, button, .print\\:hidden {
            display: none !important;
          }

          /* Ensure the letterhead takes full paper with crisp printing */
          #drfix-official-letterhead-print {
            box-shadow: none !important;
            margin: 0 auto !important;
            width: 210mm !important;
            min-height: 297mm !important;
            padding: 12mm 14mm 12mm 14mm !important;
            background: #ffffff !important;
            color: #111827 !important;
            page-break-after: auto;
          }

          /* Avoid breaking inside tables or signature blocks */
          table, tr, td, th {
            page-break-inside: avoid !important;
          }

          .grid {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
};
export default OfficialDocumentLetterhead;
