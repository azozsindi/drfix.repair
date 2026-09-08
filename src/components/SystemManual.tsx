import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Car,
  Wrench,
  CalendarCheck,
  Users,
  ShieldCheck,
  FileText,
  Printer,
  TrendingUp,
  Bell,
  Package,
  Smartphone,
  Settings,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Layers,
  Lock,
  MessageCircle,
  HelpCircle,
  Eye,
  Sliders,
  DollarSign,
  ChevronDown,
  ChevronUp,
  Handshake,
  Tag
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SystemManualProps {
  lang?: 'ar' | 'en';
}

interface ManualSection {
  id: string;
  number: string;
  titleAr: string;
  titleEn: string;
  categoryAr: string;
  categoryEn: string;
  icon: React.ElementType;
  badgeAr: string;
  badgeEn: string;
  summaryAr: string;
  summaryEn: string;
  featuresAr: { title: string; desc: string; tip?: string }[];
  featuresEn: { title: string; desc: string; tip?: string }[];
  workflowStepsAr?: string[];
  workflowStepsEn?: string[];
}

export const SystemManual: React.FC<SystemManualProps> = ({ lang = 'ar' }) => {
  const isAr = lang === 'ar';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeSectionId, setActiveSectionId] = useState<string>('architecture');
  const [isTocDropdownOpen, setIsTocDropdownOpen] = useState<boolean>(false);
  const tocDropdownRef = useRef<HTMLDivElement>(null);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    architecture: true,
    booking: true,
    dispatching: true
  });

  const categories = useMemo(() => [
    { id: 'all', nameAr: 'جميع الأقسام والفهارس', nameEn: 'All Sections' },
    { id: 'core', nameAr: 'البنية الأساسية والعمليات', nameEn: 'Core & Operations' },
    { id: 'field', nameAr: 'الميدان والفنيين والتوثيق', nameEn: 'Field & Technicians' },
    { id: 'crm', nameAr: 'العملاء والضمان والمالية', nameEn: 'CRM & Warranty' },
    { id: 'admin', nameAr: 'الإدارة والأمان والإعدادات', nameEn: 'Admin & System Control' }
  ], []);

  const manualSections: ManualSection[] = useMemo(() => [
    {
      id: 'architecture',
      number: '01',
      titleAr: 'نظرة عامة على منصة DR.FIX وبنيتها السحابية',
      titleEn: 'Platform Overview & Cloud Architecture',
      categoryAr: 'core',
      categoryEn: 'core',
      icon: Sparkles,
      badgeAr: 'سحابي فوري 100%',
      badgeEn: '100% Realtime Cloud',
      summaryAr: 'منظومة إلكترونية متكاملة ومؤتمتة لإدارة عمليات الصيانة الميدانية والمتنقلة في مدينة جدة، تربط العميل ومسؤولي العمليات والفنيين الميدانيين في الوقت الفعلي.',
      summaryEn: 'Comprehensive cloud management system designed for on-demand mobile automotive maintenance in Jeddah, connecting customers, operations dispatchers, and field technicians in real-time.',
      featuresAr: [
        {
          title: 'المزامنة السحابية اللحظية (Firestore Real-time)',
          desc: 'يتم تحديث جميع بيانات الحجوزات والمراحل ومواقع الصيانة فورياً عبر جميع الأجهزة دون الحاجة لإعادة تحميل المتصفح.'
        },
        {
          title: 'تصميم فخم ثلاثي الألوان (أبيض، أحمر DR.FIX، وأسود كربوني)',
          desc: 'واجهة بصرية احترافية وعالية التباين تعزز الهوية المؤسسية للمركز وتمنح المستخدم تجربة فاخرة وسريعة الاستجابة.'
        },
        {
          title: 'دعم ثنائي اللغة كامل ومدمج (عربي / English)',
          desc: 'تبديل فوري للغة ولاتجاه الصفحة (RTL / LTR) مع حفظ تفضيلات المستخدم تلقائياً.'
        },
        {
          title: 'العمل كتطبيق جوال رسمي (PWA)',
          desc: 'يمكن تثبيت المنصة على شاشة الهواتف الذكية (Android & iOS) مع تخزين مؤقت ودعم التصفح السريع.'
        }
      ],
      featuresEn: [
        {
          title: 'Instant Real-time Cloud Sync (Firestore)',
          desc: 'All bookings, job steps, and technician assignments update in real-time without needing to refresh pages.'
        },
        {
          title: 'Signature Brand Identity (White, Brand Red, Carbon Black)',
          desc: 'High-contrast automotive design with responsive layout providing an ergonomic experience across devices.'
        },
        {
          title: 'Comprehensive Bilingual Architecture (Arabic & English)',
          desc: 'Instant switching between RTL (Arabic) and LTR (English) across the whole platform with local persistence.'
        },
        {
          title: 'Progressive Web App (PWA)',
          desc: 'Installable directly to home screens on iOS and Android with cached performance and quick access.'
        }
      ],
      workflowStepsAr: [
        'العميل يحجز عبر الموقع أو الواتساب أو الاتصال',
        'النظام يسجل الحجز فورياً ويرسل إشعار تيليجرام وتنبيه صوتي للوحة التحكم',
        'مسؤول العمليات يسند الفني المتفرغ ميدانياً بنقرة زر',
        'الفني يباشر الصيانة ويوثق المراحل بالصور الحية',
        'العميل يتابع حالة مركبته مباشرة ويستلم سند الصيانة والضمان'
      ],
      workflowStepsEn: [
        'Customer submits booking via web portal, WhatsApp, or phone',
        'System records booking in real-time and triggers telegram alert + sound chime',
        'Dispatcher assigns the available field technician with 1 click',
        'Technician executes service with photo verification timeline',
        'Customer tracks progress live and downloads digital work order & warranty'
      ]
    },
    {
      id: 'booking',
      number: '02',
      titleAr: 'بوابة الحجز الذكية وتجربة العميل',
      titleEn: 'Smart Customer Booking Engine',
      categoryAr: 'core',
      categoryEn: 'core',
      icon: Car,
      badgeAr: 'حجز في دقيقة واحدة',
      badgeEn: '1-Minute Booking',
      summaryAr: 'نموذج حجز ذكي ومبسط يقلل من خطوات الإدخال ويدعم التعرف على المركبة ونوع الصيانة والحي السكني داخل جدة مع تحديد الموعد تلقائياً.',
      summaryEn: 'Streamlined booking workflow optimized for conversions with smart vehicle detection, Jeddah location pickup, and calendar slot selection.',
      featuresAr: [
        {
          title: 'اختيار ذكي لنوع الخدمة أو العرض',
          desc: 'عرض كافة الباقات والخدمات المتنقلة (صيانة دورية، فحص كمبيوتر، تبديل بطاريات، زيوت وفلاتر، صيانة فرامل) مع بيان الأسعار والضمان.'
        },
        {
          title: 'التعرف على المركبة وتوثيقها',
          desc: 'تسجيل نوع وموديل وسنة صنع السيارة ورقم اللوحة، مع حفظها آلياً في ملف العميل للزيارات القادمة.'
        },
        {
          title: 'جدولة التاريخ والوقت بدقة',
          desc: 'منع تضارب المواعيد من خلال تقويم تفاعلي يتيح اختيار الفترات الصباحية أو المسائية المتاحة.'
        },
        {
          title: 'إصدار رقم تتبع فوري (Booking ID)',
          desc: 'توليد كود تتبع فريد ومميز يُرسل للعميل لمتابعة حالة سيارته خطوة بخطوة.'
        }
      ],
      featuresEn: [
        {
          title: 'Service & Package Selection',
          desc: 'Showcase mobile services (routine maintenance, diagnostics, battery replacement, oil/filter, brake service) with clear pricing and warranty.'
        },
        {
          title: 'Vehicle Profiling & Plate Number',
          desc: 'Record vehicle make, model, year, and plate, automatically linking them to customer CRM files.'
        },
        {
          title: 'Smart Slot Scheduling',
          desc: 'Conflict-free appointment booking with interactive date and morning/evening slot choices.'
        },
        {
          title: 'Instant Booking ID & Tracking Code',
          desc: 'Generates a unique tracking reference allowing customers to monitor service progress live.'
        }
      ]
    },
    {
      id: 'customer_portal',
      number: '03',
      titleAr: 'بوابة تتبع الصيانة المباشرة للعميل',
      titleEn: 'Live Customer Tracking Portal',
      categoryAr: 'core',
      categoryEn: 'core',
      icon: Eye,
      badgeAr: 'شفافية كاملة',
      badgeEn: '100% Transparency',
      summaryAr: 'صفحة تتبع تفاعلية تتيح للعميل استعلام حالة مركبته برقم الجوال أو رقم الحجز دون الحاجة لإنشاء حساب أو كلمة مرور معقدة.',
      summaryEn: 'Interactive live tracking portal where car owners check their service status simply using their phone number or booking reference.',
      featuresAr: [
        {
          title: 'شريط المراحل الزمنية (Timeline Bar)',
          desc: 'مؤشر بصري واضح يوضح مرحلة الطلب: تم استلام الحجز ➔ في الطريق إليك ➔ بدء الفحص ➔ قيد الصيانة ➔ مرحلة التوثيق ➔ اكتمال الخدمة.'
        },
        {
          title: 'معرض صور التوثيق الميداني الحية',
          desc: 'يستطيع العميل مشاهدة صور مركبته قبل وبعد العمل مباشرة، مما يعزز الثقة والمصداقية المطلقة.'
        },
        {
          title: 'بطاقة الفني المسؤول والتواصل السريع',
          desc: 'عرض اسم الفني المكلف وزر مباشر لمحادثته على واتساب أو الاتصال به عند الحاجة.'
        },
        {
          title: 'عرض الفاتورة والضمان وسند الصيانة',
          desc: 'إمكانية استعراض التكلفة الإجمالية وتنزيل سند استلام الخدمة وبطاقة الضمان بضغطة واحدة.'
        }
      ],
      featuresEn: [
        {
          title: 'Visual Multi-Stage Timeline',
          desc: 'Tracks stages from Booking Confirmed ➔ En Route ➔ Inspection ➔ In Progress ➔ Photo Documentation ➔ Completed.'
        },
        {
          title: 'Live Field Photo Verification',
          desc: 'Customers can see before-and-after photos of replaced parts and inspection results directly.'
        },
        {
          title: 'Assigned Technician Badge & Contact',
          desc: 'Displays technician name with 1-click WhatsApp chat and phone call buttons.'
        },
        {
          title: 'Invoice, Warranty & Digital Bond',
          desc: 'Instant view of total cost, warranty details, and downloadable digital service receipt.'
        }
      ]
    },
    {
      id: 'bookings_management',
      number: '04',
      titleAr: 'لوحة إدارة العمليات والحجوزات المركزية',
      titleEn: 'Central Operations & Bookings Hub',
      categoryAr: 'core',
      categoryEn: 'core',
      icon: Layers,
      badgeAr: 'محرك العمليات اليومية',
      badgeEn: 'Core Daily Operations',
      summaryAr: 'شاشة التحكم الشاملة لفرز وتوزيع وتعديل الحجوزات مع محرك بحث فائق وسرعة معالجة عالية وإجراءات جماعية.',
      summaryEn: 'Central dispatcher dashboard to filter, assign, update, and manage all incoming customer requests with batch actions and smart search.',
      featuresAr: [
        {
          title: 'محرك البحث الذكي بأرقام الجوال السعودية الموحدة',
          desc: 'بحث ذكي يتطابق تلقائياً سواء كتب العميل الرقم بـ 05 أو 966 أو بدون الصفر، ويبحث في اسم العميل، موديل السيارة، رقم اللوحة، والملاحظات.'
        },
        {
          title: 'فلاتر الحالات السريعة',
          desc: 'تصنيف فوري للحجوزات: (الكل، قيد الانتظار، قيد التنفيذ، مكتملة، ملغاة، بدون فني مسند).'
        },
        {
          title: 'العمليات الجماعية الآمنة (Batch Actions)',
          desc: 'تحديد حجوزات متعددة لتغيير حالتها دفعة واحدة أو حذفها بأمان مع نافذة تأكيد ورقم سري لمنع الأخطاء.'
        },
        {
          title: 'سجل تدقيق التغييرات (Audit Log)',
          desc: 'حفظ آلي لكل تغيير يطرأ على السعر، الحالة، إسناد الفني، أو الملاحظات مع اسم الموظف وتوقيت التعديل.'
        }
      ],
      featuresEn: [
        {
          title: 'Unified Saudi Phone & Smart Search',
          desc: 'Seamlessly matches phone queries entered with 05, +966, or partial strings, plus names, cars, and plate numbers.'
        },
        {
          title: 'Quick Status Filters',
          desc: 'Instant toggle between All, Pending, In Progress, Completed, Cancelled, and Unassigned requests.'
        },
        {
          title: 'Safe Batch Operations',
          desc: 'Bulk status update and multi-select deletion protected by safety confirmation modals.'
        },
        {
          title: 'Audit Log & History Trail',
          desc: 'Automatic logging of price adjustments, status transitions, technician reassignments, and notes.'
        }
      ]
    },
    {
      id: 'dispatching',
      number: '05',
      titleAr: 'نظام إسناد الفنيين الميداني وكشف التفرغ اللحظي',
      titleEn: 'Field Technician Dispatch & Live Workload',
      categoryAr: 'field',
      categoryEn: 'field',
      icon: Wrench,
      badgeAr: 'ذكاء توزيع الميدان',
      badgeEn: 'Smart Field Routing',
      summaryAr: 'نظام متطور يمنع تراكم المهام ويحلل حالة الفنيين الميدانيين لحظياً مع كشف المتفرغين والمشغولين ورفع صور التوثيق.',
      summaryEn: 'Advanced dispatching module calculating live technician workload, distinguishing available from busy technicians, with photo upload steps.',
      featuresAr: [
        {
          title: 'كشف التفرغ الميداني اللحظي (Workload Analyzer)',
          desc: 'تحليل فوري لقائمة الفنيين: بطاقة خضراء (🟢 متفرغ / فاضي) وبطاقة كهرمانية (🟡 شغال) مع إظهار عدد المهام الجارية تحت تنفيذه.'
        },
        {
          title: 'حصر القائمة على الفنيين الميدانيين فقط',
          desc: 'تصفية ذكية تستبعد الحسابات الإدارية والمكتبية تلقائياً وتعرض الفنيين ذوي الدور الفني المسجل فقط.'
        },
        {
          title: 'توثيق مراحل العمل الميداني بالصور (Service Steps)',
          desc: 'إمكانية رفع صور من كاميرا الجوال مباشرة لمراحل العمل مع كابشن وصلاحية رؤية العميل أو الإدارة فقط.'
        },
        {
          title: 'وضع الإدخال اليدوي السريع',
          desc: 'إمكانية كتابة اسم الفني ورقم جواله يدوياً في حال لم يكن مسجلاً كحساب في لوحة التحكم.'
        }
      ],
      featuresEn: [
        {
          title: 'Real-Time Availability & Workload Analyzer',
          desc: 'Live calculation highlighting available technicians (🟢 Free) vs busy technicians (🟡 Working) with active job counters.'
        },
        {
          title: 'Technician-Only Filter',
          desc: 'Strictly excludes admins and desk dispatchers, presenting only verified field technicians.'
        },
        {
          title: 'Step-by-Step Photo Documentation',
          desc: 'Direct camera photo uploads for every job stage with descriptive captions and visibility toggles.'
        },
        {
          title: 'Quick Manual Assignment Mode',
          desc: 'Allows dispatchers to assign non-registered or third-party technicians directly by name and phone.'
        }
      ]
    },
    {
      id: 'calendar_module',
      number: '06',
      titleAr: 'التقويم التفاعلي وجدولة المواعيد',
      titleEn: 'Interactive Calendar & Appointment Scheduler',
      categoryAr: 'field',
      categoryEn: 'field',
      icon: CalendarCheck,
      badgeAr: 'توزيع زمني ذكي',
      badgeEn: 'Smart Timeline Grid',
      summaryAr: 'عرض شهري ويومي تفاعلي لجميع الحجوزات مع تلوين الحالات وسهولة إضافة وتعديل المواعيد بنقرة واحدة.',
      summaryEn: 'Interactive monthly and daily schedule view with status color-coding and quick appointment creation by clicking any date.',
      featuresAr: [
        {
          title: 'عرض تقويم شهري دقيق ومضبوط زمنياً',
          desc: 'حساب دقيق لأيام الشهر بدون أي انزياح زمني، مع شارات رقمية توضح عدد الحجوزات لكل يوم.'
        },
        {
          title: 'عزل حسابات الفنيين في التقويم',
          desc: 'عند تسجيل دخول فني ميداني، يعرض التقويم مواعيده ومهامه الخاصة به فقط للحفاظ على الخصوصية والتركيز.'
        },
        {
          title: 'إضافة موعد جديد مباشرة من اليوم المحدد',
          desc: 'الضغط على أي يوم في التقويم يفتح نموذج إضافة موعد مسبق التعبئة بتاريخ ذلك اليوم.'
        },
        {
          title: 'ترتيب المواعيد زمنياً',
          desc: 'فرز مواعيد اليوم من الأبكر إلى الأحدث مع تبيان الفني المسؤول وحالة المركبة.'
        }
      ],
      featuresEn: [
        {
          title: 'Accurate Calendar Grid',
          desc: 'Timezone-corrected calendar grid displaying daily request badges and appointment density.'
        },
        {
          title: 'Strict Technician Privacy View',
          desc: 'When logged in as a field technician, the calendar only displays the technician’s own assignments.'
        },
        {
          title: 'One-Click Slot Scheduling',
          desc: 'Clicking any date cell opens a booking form pre-populated with that selected day.'
        },
        {
          title: 'Chronological Daily Timeline',
          desc: 'Sorts daily tasks chronologically with vehicle model, location, and assigned staff.'
        }
      ]
    },
    {
      id: 'customer_crm',
      number: '07',
      titleAr: 'نظام إدارة العملاء (CRM) وسجل المركبات الموحد',
      titleEn: 'Customer CRM & Unified Vehicle Registry',
      categoryAr: 'crm',
      categoryEn: 'crm',
      icon: Users,
      badgeAr: 'ملف 360 درجة للعميل',
      badgeEn: '360° Customer Profile',
      summaryAr: 'قاعدة بيانات عملاء ذكية تتغذى تلقائياً من الحجوزات السابقة لتجمع سجل زيارات كل عميل ومركباته وإجمالي إنفاقه وتسهل التواصل المستمر معه.',
      summaryEn: 'Automated CRM accumulating customer profiles, multi-car garages, service frequency, total expenditure, and loyalty records.',
      featuresAr: [
        {
          title: 'المزامنة التلقائية مع سجلات الصيانة (Auto-Sync)',
          desc: 'تجميع ذكي لكل عميل برقم جواله، مع استخراج أسماء سياراته وتواريخ زياراته ومجموع ما دفعه في المركز.'
        },
        {
          title: 'سجل أسطول المركبات لكل عميل',
          desc: 'إمكانية ربط أكثر من سيارة بملف العميل الواحد (مثل: كامري 2022، تاهو 2020) مع أرقام اللوحات.'
        },
        {
          title: 'التواصل الفوري عبر الواتساب المنسق',
          desc: 'زر مراسلة واتساب يفتح محادثة مجهزة باسم العميل وترحيب رسمي من مركز DR.FIX بجدة.'
        },
        {
          title: 'تصدير بيانات العملاء إلى Excel / CSV',
          desc: 'إمكانية تصدير قوائم العملاء وأرقامهم لحملات التسويق وإعادة الاستهداف.'
        }
      ],
      featuresEn: [
        {
          title: 'Automatic Historical Aggregation',
          desc: 'Aggregates all bookings by customer phone number, calculating total spent and visit count.'
        },
        {
          title: 'Multi-Vehicle Garage per Customer',
          desc: 'Stores multiple vehicles (make, model, year, plate) under each customer profile.'
        },
        {
          title: 'One-Click Formatted WhatsApp Messaging',
          desc: 'Direct WhatsApp link pre-filled with professional greeting and customer name.'
        },
        {
          title: 'Customer Data Export',
          desc: 'Export customer lists to CSV / Excel for marketing and follow-up retention campaigns.'
        }
      ]
    },
    {
      id: 'warranty_complaints',
      number: '08',
      titleAr: 'نظام بطاقات الضمان وإدارة الشكاوى والبلاغات',
      titleEn: 'Digital Warranty & Complaints Management',
      categoryAr: 'crm',
      categoryEn: 'crm',
      icon: ShieldCheck,
      badgeAr: 'حماية وحق العميل',
      badgeEn: 'Customer Rights & Trust',
      summaryAr: 'نظام متكامل لإصدار بطاقات الضمان الإلكترونية بعد إتمام الصيانة، مع وحدة متابعة شكاوى العملاء وتكليف مسؤولي المتابعة وإغلاق البلاغات.',
      summaryEn: 'Integrated module issuing electronic warranty certificates post-repair, with a dedicated complaints tracker and escalation workflow.',
      featuresAr: [
        {
          title: 'إصدار بطاقة ضمان رقمية لكل صيانة',
          desc: 'تحديد مدة الضمان (مثلاً: 30 يوماً، 3 أشهر، 6 أشهر) وتفاصيل القطع والأجور المشمولة والشروط.'
        },
        {
          title: 'تسجيل بلاغات وشكاوى العملاء',
          desc: 'توثيق تاريخ الشكوى، تفاصيل المشكلة، درجة الأولوية (عاجلة 🔴، متوسطة 🟡، عادية 🟢).'
        },
        {
          title: 'تكليف موظف لمتابعة الشكوى',
          desc: 'إسناد البلاغ لموظف خدمة عملاء أو فني وتدوين حل المشكلة وتاريخ إغلاقها.'
        },
        {
          title: 'رابط ضمان مباشر يشاركه العميل',
          desc: 'إمكانية إرسال كود الضمان للعميل عبر واتساب للاحتفاظ بحقه والرجوع إليه في أي وقت.'
        }
      ],
      featuresEn: [
        {
          title: 'Electronic Warranty Certificate Generation',
          desc: 'Customizable warranty duration (30 days, 3 months, 6 months) with terms and covered parts.'
        },
        {
          title: 'Customer Complaints Logging',
          desc: 'Document complaint date, defect description, and priority level (Urgent 🔴, Medium 🟡, Normal 🟢).'
        },
        {
          title: 'Escalation & Resolution Tracking',
          desc: 'Assign complaints to staff members, log resolution notes, and track time-to-close.'
        },
        {
          title: 'Shareable Digital Warranty',
          desc: 'Send digital warranty links to customers via WhatsApp for instant proof and peace of mind.'
        }
      ]
    },
    {
      id: 'pricing_quotation',
      number: '09',
      titleAr: 'حاسبة عروض الأسعار وتفصيل التكاليف الميدانية',
      titleEn: 'Interactive Quotation & Pricing Breakdown',
      categoryAr: 'crm',
      categoryEn: 'crm',
      icon: DollarSign,
      badgeAr: 'تسعير دقيق وشفاف',
      badgeEn: 'Transparent Quotes',
      summaryAr: 'أداة احترافية لتفصيل التكاليف بين أجور اليد وقطع الغيار ورسوم الفحص والانتقال، مع حساب الضريبة المضافة (VAT) وإرسال عرض السعر للعميل.',
      summaryEn: 'Professional quotation builder breaking down labor, spare parts, and travel fees, calculating VAT, and generating customer approval links.',
      featuresAr: [
        {
          title: 'بناء بنود عرض السعر بنداً بنداً',
          desc: 'إضافة اسم كل قطعة أو عمل يدوي، الكمية، وسعر الوحدة مع إمكانية تمييز قطع الغيار الأصلية أو التجارية.'
        },
        {
          title: 'الحساب التلقائي للضريبة والخصم',
          desc: 'حساب ضريبة القيمة المضافة (15%) أو تطبيق كود خصم خاص بالعميل بضغطة زر.'
        },
        {
          title: 'إرسال عرض السعر للموافقة الفورية',
          desc: 'إنشاء رابط موافقة رسمي يتيح للعميل قبول أو رفض عرض السعر مع توثيق ذلك في سجل الطلب.'
        },
        {
          title: 'الترحيل التلقائي لتكلفة الصيانة',
          desc: 'بمجرد اعتماد عرض السعر، يتم تحديث التكلفة الإجمالية في سجل الحجز والتقارير المالية آلياً.'
        }
      ],
      featuresEn: [
        {
          title: 'Itemized Quotation Breakdown',
          desc: 'Add individual items, labor rates, spare parts, quantities, and unit costs with genuine/aftermarket tags.'
        },
        {
          title: 'Automated VAT & Discounts',
          desc: 'Calculates 15% VAT and promotional discounts with instant net total calculation.'
        },
        {
          title: 'Customer Approval Portal Link',
          desc: 'Generates official quotation link where car owners can review, accept, or decline the repair estimate.'
        },
        {
          title: 'Auto-Sync to Booking Cost',
          desc: 'Upon customer approval, the final agreed amount automatically syncs to booking records.'
        }
      ]
    },
    {
      id: 'reports_generator',
      number: '10',
      titleAr: 'التقارير وسندات الصيانة الرسمية (Word & PDF)',
      titleEn: 'Reports & Work Order Bonds (Word & PDF)',
      categoryAr: 'admin',
      categoryEn: 'admin',
      icon: Printer,
      badgeAr: 'سندات رسمية بلمسة واحدة',
      badgeEn: '1-Click Formal Bonds',
      summaryAr: 'وحدة تقارير متطورة تصدر سندات تسليم واستلام الصيانة بصيغة Microsoft Word (.docx) أو PDF قابلة للطباعة فوراً، وتقارير شاملة لأداء الفنيين.',
      summaryEn: 'Comprehensive document generation creating official Microsoft Word (.docx) and printable PDF service bonds, plus technician performance audits.',
      featuresAr: [
        {
          title: 'تصدير سند استلام / تسليم رسمي بصيغة Word (.docx)',
          desc: 'مستند مجهز بشعار DR.FIX وبيانات العميل، تفاصيل المركبة، جدول الأعمال المنفذة، التكلفة، وختم وتوقيع المركز.'
        },
        {
          title: 'تصدير تقرير العمليات الميدانية الشامل',
          desc: 'تصدير كافة الحجوزات المحددة في جدول منظم ومفهرس مع مجاميع الإيرادات والنسب.'
        },
        {
          title: 'تقرير كفاءة وأداء الفنيين الميدانيين',
          desc: 'إحصائيات لكل فني: عدد الحجوزات المنجزة، متوسط التكلفة، تقييمات العملاء، ونسبة إتمام الأعمال في الوقت المحدد.'
        },
        {
          title: 'جاهزية الطباعة الفورية المتوافقة مع ورق A4',
          desc: 'تنسيق طباعة أنيق يتطابق مع المعايير التجارية الرسمية في المملكة العربية السعودية.'
        }
      ],
      featuresEn: [
        {
          title: 'Official Word Document Export (.docx)',
          desc: 'Formatted with DR.FIX logo, customer data, vehicle specs, repair table, total cost, and signature seal.'
        },
        {
          title: 'Complete Operations Report',
          desc: 'Export selected bookings into structured tables with financial totals and breakdown summaries.'
        },
        {
          title: 'Technician KPI & Performance Audit',
          desc: 'Tracks completed jobs per technician, revenue generated, customer satisfaction, and on-time delivery.'
        },
        {
          title: 'Print-Ready A4 Standardization',
          desc: 'Formatted cleanly for instant physical printing on standard Saudi automotive invoice stationery.'
        }
      ]
    },
    {
      id: 'analytics_kpis',
      number: '11',
      titleAr: 'التحليلات البيانية ومؤشرات الأداء (KPIs)',
      titleEn: 'Business Analytics & Growth KPIs',
      categoryAr: 'admin',
      categoryEn: 'admin',
      icon: TrendingUp,
      badgeAr: 'رؤية مالية وتشغيلية',
      badgeEn: 'Financial & Operational Insights',
      summaryAr: 'رسوم بيانية تفاعلية تستعرض حركة الحجوزات اليومية، حجم الإيرادات، وتوزيع الخدمات الأكثر طلباً لاتخاذ قرارات تشغيلية مدروسة.',
      summaryEn: 'Interactive analytics visualizing daily booking velocity, revenue streams, peak service hours, and growth metrics.',
      featuresAr: [
        {
          title: 'منحنى نمو الحجوزات خلال الأسبوع والشهر',
          desc: 'رسم بياني تفاعلي (Area & Bar Charts) يوضح أيام الذروة ومعدلات الطلب المتزايدة.'
        },
        {
          title: 'الخدمات الأكثر طلباً في جدة',
          desc: 'مخطط دائري (Donut Chart) يوضح نسب الإقبال على خدمات الزيوت، فحص الكمبيوتر، وصيانة البطاريات.'
        },
        {
          title: 'تحليل الإيرادات ونسبة الإنجاز',
          desc: 'مقارنة بين الطلبات المكتملة والإيرادات المحققة ونسب الإلغاء وتحديد أسبابها.'
        },
        {
          title: 'مؤشر تقييمات ورضا العملاء',
          desc: 'رصد متوسط التقييمات الإجمالية من 5 نجوم مع تحليل آراء العملاء الإيجابية.'
        }
      ],
      featuresEn: [
        {
          title: 'Booking Velocity & Trend Curves',
          desc: 'Interactive charts mapping daily appointment volume and identifying peak demand periods.'
        },
        {
          title: 'Top Requested Services Breakdown',
          desc: 'Donut chart illustrating market demand across oil service, battery replacement, and diagnostics.'
        },
        {
          title: 'Revenue Realization & Completion Ratios',
          desc: 'Financial ratios comparing invoiced revenue against completed jobs and cancellation metrics.'
        },
        {
          title: 'Customer Satisfaction Score',
          desc: 'Monitors overall 5-star review average and highlights customer feedback trends.'
        }
      ]
    },
    {
      id: 'staff_rbac',
      number: '12',
      titleAr: 'إدارة فريق العمل والأدوار والصلاحيات (RBAC)',
      titleEn: 'Staff Management & Role-Based Access Control',
      categoryAr: 'admin',
      categoryEn: 'admin',
      icon: Lock,
      badgeAr: 'أمان وصلاحيات دقيقة',
      badgeEn: 'Granular Permissions',
      summaryAr: 'نظام إدارة موظفين محكم يتيح إنشاء حسابات وتعيين صلاحيات مخصصة لكل موظف مع عزل شاشات الفنيين الميدانيين وإرسال بيانات الدخول واتساب.',
      summaryEn: 'Robust staff access management with predefined and custom roles, isolating field views, and delivering credentials via WhatsApp.',
      featuresAr: [
        {
          title: 'أدوار معتمدة مسبقاً (Role Presets)',
          desc: 'مدير عام (Super Admin)، مسؤول عمليات واستقبال (Dispatcher)، فني صيانة ميداني (Technician)، وخدمة عملاء (Support).'
        },
        {
          title: 'مصفوفة صلاحيات تفصيلية (12 مفتاح تحكم)',
          desc: 'التحكم الدقيق في رؤية وتعديل الحجوزات، التقويم، العملاء، التقارير، الإعدادات، وإدارة الموظفين.'
        },
        {
          title: 'عزل حساب الفني الميداني تلقائياً',
          desc: 'الفني يرى في لوحته وتقويمه المهام المسندة له فقط، ولا يستطيع الاطلاع على أرقام أو حجوزات الفنيين الآخرين.'
        },
        {
          title: 'إرسال بيانات الدخول بنقرة زر على واتساب',
          desc: 'توليد رسالة رسمية تتضمن رابط اللوحة، اسم المستخدم، وكلمة المرور المؤقتة وإرسالها للموظف مباشرة.'
        }
      ],
      featuresEn: [
        {
          title: 'Predefined Role Templates',
          desc: 'Super Admin, Operations Dispatcher, Field Technician, Customer Support, or Custom tailored role.'
        },
        {
          title: 'Granular 12-Point Permission Matrix',
          desc: 'Toggle access to Dashboard, Bookings, Calendar, Customers, Reports, Settings, and Staff.'
        },
        {
          title: 'Automatic Field Technician Isolation',
          desc: 'Technicians can only access and view records explicitly assigned to their employee profile.'
        },
        {
          title: 'Instant WhatsApp Credential Delivery',
          desc: 'Generates formatted WhatsApp message containing login URL, username, and secure password.'
        }
      ]
    },
    {
      id: 'inventory_control',
      number: '13',
      titleAr: 'إدارة المستودع وقطع الغيار والزيوت',
      titleEn: 'Inventory & Spare Parts Management',
      categoryAr: 'admin',
      categoryEn: 'admin',
      icon: Package,
      badgeAr: 'ضبط المخزون',
      badgeEn: 'Stock Optimization',
      summaryAr: 'نظام متكامل لتتبع مستودع الزيوت والفلاتر والبطاريات والقطع الاستهلاكية مع تنبيهات عند اقتراب نفاد الكميات.',
      summaryEn: 'Complete automotive stock management tracking oils, filters, batteries, and fast-moving items with low-stock alerts.',
      featuresAr: [
        {
          title: 'بطاقات تعريف الأصناف ورموز SKU',
          desc: 'تسجيل اسم الصنف، الشركة المصنعة، رمز التخزين، سعر التكلفة، وسعر البيع للعميل.'
        },
        {
          title: 'تنبيهات انخفاض المخزون (Low Stock Alerts)',
          desc: 'إشعار مرئي عند وصول أي صنف إلى حد الطلب الحرج لتجنب انقطاع القطع أثناء الزيارات الميدانية.'
        },
        {
          title: 'سجل حركات الصرف والإضافة',
          desc: 'توثيق تاريخ صرف كل قطعة واسم الفني المستلم ورقم أمر الصيانة المرتبط بها.'
        }
      ],
      featuresEn: [
        {
          title: 'SKU & Spare Part Item Catalog',
          desc: 'Record brand, SKU code, cost price, and customer selling price with stock thresholds.'
        },
        {
          title: 'Low-Stock Reorder Alerts',
          desc: 'Visual warning badges when critical lubricants or parts drop below safety thresholds.'
        },
        {
          title: 'Stock Movements & Technician Receipts',
          desc: 'Tracks every dispatch and replenishment with technician name and associated work order ID.'
        }
      ]
    },
    {
      id: 'notifications_telegram',
      number: '14',
      titleAr: 'نظام التنبيهات الفورية وبوت تيليجرام',
      titleEn: 'Instant Alerts & Telegram Bot Integration',
      categoryAr: 'admin',
      categoryEn: 'admin',
      icon: Bell,
      badgeAr: 'إشعار فوري 0 ثانية',
      badgeEn: 'Zero-Second Alerts',
      summaryAr: 'ربط مباشر مع بوت تيليجرام لإرسال تفاصيل الحجوزات الجديدة فوراً لمجموعة العمليات، مع صوت تنبيهي ترحيبي داخل اللوحة.',
      summaryEn: 'Automated Telegram Bot relaying new bookings to the operations dispatch channel instantly with sound chime alerts.',
      featuresAr: [
        {
          title: 'إشعار فوري على تيليجرام عند كل حجز جديد',
          desc: 'رسالة منسقة تتضمن: رقم الحجز، اسم العميل، رقم الجوال، موديل السيارة، نوع الخدمة، والحي في جدة.'
        },
        {
          title: 'التنبيه الصوتي الداخلي (Chime Alert)',
          desc: 'نغمة تنبيه لطيفة تنطلق في متصفح مسؤول العمليات عند وصول أي حجز جديد أثناء تصفحه للوحة.'
        },
        {
          title: 'تخصيص توكن البوت ومعرف المجموعة (Chat ID)',
          desc: 'إمكانية إدخال واختبار إعدادات التيليجرام بضغطة زر والتأكد من نجاح الإرسال.'
        }
      ],
      featuresEn: [
        {
          title: 'Instant Telegram Group Notifications',
          desc: 'Pushes booking details (ID, customer name, phone, car model, service, Jeddah location) directly to Telegram.'
        },
        {
          title: 'Dashboard Sound Chime Alert',
          desc: 'Audible notification chime plays on the dispatcher’s browser the moment a new booking arrives.'
        },
        {
          title: 'Telegram Bot Token & Chat ID Settings',
          desc: 'Configure and test Telegram credentials with a 1-click test ping button.'
        }
      ]
    },
    {
      id: 'settings_identity',
      number: '15',
      titleAr: 'إعدادات الهوية وساعات العمل والتحكم بالمنصة',
      titleEn: 'Identity Settings, Business Hours & System Mode',
      categoryAr: 'admin',
      categoryEn: 'admin',
      icon: Settings,
      badgeAr: 'تحكم مركزي كامل',
      badgeEn: 'Full Central Control',
      summaryAr: 'لوحة إعدادات شاملة تتيح تعديل أرقام التواصل، روابط السوشيال ميديا، ساعات العمل، وتفعيل وضع الصيانة المؤقت.',
      summaryEn: 'Central settings suite managing contact phone numbers, WhatsApp, social profiles, operational hours, and maintenance switch.',
      featuresAr: [
        {
          title: 'تخصيص أرقام الهاتف والواتساب الموحد',
          desc: 'تعديل رقم الاتصال المباشر ورقم واتساب المركز الذي تتصل به كافة أزرار الموقع والتقارير تلقائياً.'
        },
        {
          title: 'روابط السوشيال ميديا الرسمية',
          desc: 'تخصيص حسابات المركز على (سناب شات، تيك توك، إنستغرام، وإكس) مع أيقونات ملونة وأصلية.'
        },
        {
          title: 'وضع الصيانة الذكي (Maintenance Mode)',
          desc: 'إمكانية تفعيل وضع الصيانة لإجراء التحديثات مع إخفاء الإشعار عن واجهة العميل لتبقى نظيفة وفخمة.'
        },
        {
          title: 'شريط الأخبار المتحرك (Ticker)',
          desc: 'إدارة نصوص العروض المتحركة أعلى الموقع مع ضبطها لتستمر بالحركة دون التأثر باللمس أو التمرير.'
        },
        {
          title: 'التحكم بالرؤية والمزامنة اللحظية للروابط السريعة (Quick Links Sync)',
          desc: 'ربط ذكي ومباشر بين مفاتيح التحكم في ظهور الأقسام (شركاء النجاح، العروض، الخدمات، المعرض) وبين قوائم الروابط السريعة في الفوتر وشريط التنقل العلوي، مع إعادة توجيه المسارات المباشرة للصفحة الرئيسية تلقائياً عند إخفاء أي قسم لمنع الصفحات المعطلة.'
        }
      ],
      featuresEn: [
        {
          title: 'Unified Phone & WhatsApp Config',
          desc: 'Centralized phone and WhatsApp numbers automatically powering all buttons and reports site-wide.'
        },
        {
          title: 'Official Social Media Handles',
          desc: 'Manage Snapchat, TikTok, Instagram, and X links with authentic high-res vector badges.'
        },
        {
          title: 'Smart Maintenance Mode',
          desc: 'Enables maintenance workflow while cleanly hiding warning badges from customer-facing screens.'
        },
        {
          title: 'Non-Blocking Announcement Ticker',
          desc: 'Controls promotional ticker texts with touch-proof smooth continuous marquee animation.'
        },
        {
          title: 'Dynamic Visibility & Quick Links Auto-Sync',
          desc: 'Direct synchronization between section visibility toggles (Partners, Offers, Services, Gallery) and footer Quick Links, header menus, and drawer navigation with automatic route-guard redirection to home.'
        }
      ]
    },
    {
      id: 'partners_network',
      number: '16',
      titleAr: 'شبكة شركاء النجاح والورش المعتمدة والمزامنة التلقائية',
      titleEn: 'Success Partners Network & Dynamic Quick Links Control',
      categoryAr: 'admin',
      categoryEn: 'admin',
      icon: Handshake,
      badgeAr: 'ربط ذكي وتلقائي',
      badgeEn: 'Smart Dynamic Sync',
      summaryAr: 'منظومة إدارة شبكة الورش الشريكة ومحلات قطع الغيار المعتمدة لدى Dr.Fix، مع أتمتة كاملة لإظهار أو إخفاء القسم وحذف رابطه فورياً من الروابط السريعة وقوائم الموقع.',
      summaryEn: 'Management hub for verified partner workshops and parts suppliers in Jeddah, featuring live visibility toggles that automatically synchronize with footer Quick Links and site navigation.',
      featuresAr: [
        {
          title: 'دليل ورش ومراكز الشركاء المعتمدة',
          desc: 'إضافة وتعديل بيانات الورش (الاسم، الشعار، التصنيف: ميكانيكا/كهرباء/إطارات، العنوان الجغرافي، رابط موقع Google Maps، ونسبة الخصم الحصرية الممنوحة لعملاء Dr.Fix).'
        },
        {
          title: 'مزامنة الإخفاء التلقائي مع الروابط السريعة والقوائم',
          desc: 'عند النقر على زر "إخفاء قسم شركاء النجاح" في لوحة التحكم، يختفي فورياً رابط "شركاء النجاح" من: (1) شريط التنقل العلوي (Navbar)، (2) قائمة الجوال المنسدلة، (3) قائمة "الروابط السريعة" في الفوتر، (4) مسار الرابط المباشر /partners حيث يتم تحويل الزائر تلقائياً للصفحة الرئيسية.'
        },
        {
          title: 'الحجز المباشر المنسق مع الورشة الشريكة',
          desc: 'يستطيع العميل الضغط على "احجز صيانة بالتنسيق مع الشريك" ليتم نقله لنموذج الحجز وتثبيت اسم الورشة الشريكة تلقائياً في بيانات التذكرة.'
        },
        {
          title: 'التواصل المباشر وطلب الانضمام للشبكة',
          desc: 'أزرار اتصال وواتساب مباشرة بكل شريك، مع زر مخصص لأصحاب الورش الراغبين في الانضمام لشبكة شركاء النجاح يفتح محادثة واتساب مجهزة برسالة طلب الانضمام.'
        }
      ],
      featuresEn: [
        {
          title: 'Authorized Partner Workshops & Stores Directory',
          desc: 'Manage verified garages and spare parts suppliers with logo, specialty category, geolocation Google Maps link, and exclusive Dr.Fix customer discount rates.'
        },
        {
          title: 'Instant Quick Links & Navigation Auto-Sync',
          desc: 'Toggling the partner section visibility off in admin immediately strips the "Success Partners" link from: (1) Desktop Navbar, (2) Mobile Drawer Menu, (3) Footer Quick Links list, and (4) Guards /partners route to automatically redirect visitors to the home page.'
        },
        {
          title: 'Direct Partner-Coordinated Booking',
          desc: 'Clients can tap "Book through Partner" to open the appointment form with the partner garage automatically tagged in the job order.'
        },
        {
          title: 'Instant WhatsApp & Network Join Requests',
          desc: 'Direct call/WhatsApp communication triggers with pre-populated inquiry templates for customers and garage owners wanting to join the partner network.'
        }
      ]
    },
    {
      id: 'offers_packages',
      number: '17',
      titleAr: 'إدارة العروض الترويجية والخصومات والمزامنة الذكية',
      titleEn: 'Promotional Offers, Packages & Dynamic Quick Links Control',
      categoryAr: 'core',
      categoryEn: 'core',
      icon: Tag,
      badgeAr: 'تخفيضات ومزامنة',
      badgeEn: 'Discounts & Sync',
      summaryAr: 'إدارة باقات العروض الترويجية وخصومات الصيانة الموسمية مع تحكم ديناميكي فوري يزيل العروض من الصفحة الرئيسية وقوائم الروابط السريعة عند التعطيل.',
      summaryEn: 'Comprehensive promotional offers engine for seasonal mobile car maintenance packages, with automated synchronization that clears quick links and pages when disabled.',
      featuresAr: [
        {
          title: 'باقات وعروض الصيانة الحصرية',
          desc: 'إنشاء عروض ترويجية مخصصة تشمل السعر قبل الخصم، السعر النهائي، نسبة التوفير، وشارات لافتة (عرض محدود، الأكثر طلباً، باقة VIP) مع قائمة المزايا المشمولة.'
        },
        {
          title: 'التحكم بالظهور والمزامنة اللحظية مع الروابط السريعة',
          desc: 'عند إخفاء قسم العروض (showOffers = false) من لوحة التحكم، يختفي فورياً قسم العروض من الصفحة الرئيسية، ويتم إخفاء رابطه تلقائياً من شريط التنقل، قائمة الجوال، وقائمة "الروابط السريعة" في الفوتر، مع إعادة توجيه رابط /offers للصفحة الرئيسية.'
        },
        {
          title: 'التطبيق الفوري للعرض في نموذج الحجز',
          desc: 'عند اختيار العميل لأي عرض ترويجي، يتم توجيهه تلقائياً إلى نموذج الحجز مع تثبيت وتطبيق تفاصيل العرض والسعر المخفض في سجل الحجز دون حاجة لإدخال يدوي.'
        },
        {
          title: 'تحديد فترات وصلاحية العروض',
          desc: 'إمكانية تعيين تاريخ سريان وانتهاء العروض لضمان مصداقية الحملات الترويجية وموسميتها.'
        }
      ],
      featuresEn: [
        {
          title: 'Custom Promotional Maintenance Bundles',
          desc: 'Create attractive service packages with original price, discounted price, savings badge (Limited Time, Most Popular, VIP Pack), and feature checklists.'
        },
        {
          title: 'Live Quick Links & Route Auto-Removal',
          desc: 'Disabling the offers section (showOffers = false) instantly hides the carousel from the homepage, removes the link from top navigation and footer Quick Links, and routes /offers traffic back to /.'
        },
        {
          title: 'Seamless Booking & Automatic Discount Tagging',
          desc: 'Selecting any package pre-fills the booking ticket with the chosen bundle name and discounted price automatically.'
        },
        {
          title: 'Campaign Scheduling & Validity Limits',
          desc: 'Set start and expiration dates on offers to automate seasonal campaigns effortlessly.'
        }
      ]
    }
  ], []);

  const filteredSections = useMemo(() => {
    return manualSections.filter(sec => {
      const matchCategory = selectedCategory === 'all' || sec.categoryAr === selectedCategory || sec.categoryEn === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCategory;
      const textAr = `${sec.number} ${sec.titleAr} ${sec.summaryAr} ${sec.featuresAr.map(f => f.title + ' ' + f.desc).join(' ')}`.toLowerCase();
      const textEn = `${sec.number} ${sec.titleEn} ${sec.summaryEn} ${sec.featuresEn.map(f => f.title + ' ' + f.desc).join(' ')}`.toLowerCase();
      return matchCategory && (textAr.includes(q) || textEn.includes(q));
    });
  }, [manualSections, selectedCategory, searchQuery]);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const activeSection = useMemo(() => {
    return manualSections.find(s => s.id === activeSectionId) || manualSections[0];
  }, [manualSections, activeSectionId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tocDropdownRef.current && !tocDropdownRef.current.contains(event.target as Node)) {
        setIsTocDropdownOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsTocDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleSelectSectionFromDropdown = (secId: string) => {
    setActiveSectionId(secId);
    setExpandedSections(prev => ({ ...prev, [secId]: true }));
    setIsTocDropdownOpen(false);

    setTimeout(() => {
      const el = document.getElementById(`section-${secId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const handleCopyLink = (secId: string) => {
    const sec = manualSections.find(s => s.id === secId);
    if (!sec) return;
    const textToCopy = isAr 
      ? `مركز DR.FIX للصيانة المتنقلة بجدة - ${sec.number}. ${sec.titleAr}\n\n${sec.summaryAr}\n\nالمزايا الرئيسية:\n${sec.featuresAr.map(f => `• ${f.title}: ${f.desc}`).join('\n')}`
      : `DR.FIX Mobile Auto Center Jeddah - ${sec.number}. ${sec.titleEn}\n\n${sec.summaryEn}\n\nKey Capabilities:\n${sec.featuresEn.map(f => `• ${f.title}: ${f.desc}`).join('\n')}`;

    navigator.clipboard.writeText(textToCopy);
    setCopiedSection(secId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="space-y-8 animate-fadeIn" id="system-manual-root">
      {/* Luxury Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-neutral-900 via-brand-black to-neutral-950 border border-white/10 p-6 sm:p-10 shadow-2xl">
        {/* Glow Accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none -ml-10 -mb-10" />

        <div className="relative z-10 max-w-4xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-red/20 border border-brand-red/40 text-brand-red text-xs font-black uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5" />
            <span>{isAr ? 'الدليل الشامل والمرجع الرسمي للمنصة' : 'Official System Manual & Reference Guide'}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-display font-black text-white leading-tight">
            {isAr ? (
              <>دليل نظام ومزايا <span className="text-brand-red italic">DR.FIX</span> المتكامل</>
            ) : (
              <>Comprehensive <span className="text-brand-red italic">DR.FIX</span> System Manual</>
            )}
          </h1>

          <p className="text-gray-300 text-sm sm:text-base leading-relaxed max-w-3xl">
            {isAr 
              ? 'مرجع مفصل وشامل لجميع الوحدات البرمجية، التدفقات التشغيلية، بوابات الحجز، إدارة الفنيين الميدانيين، نظام الضمان، وإصدار التقارير الرسمية وسندات الصيانة.'
              : 'Detailed, authoritative documentation of all functional modules, field technician dispatching, customer tracking, warranty tracking, and Word/PDF reporting workflows.'}
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/10">
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-xl sm:text-2xl font-black text-white">{manualSections.length}+</div>
              <div className="text-[11px] font-bold text-gray-400">{isAr ? 'وحدة تشغيلية متكاملة' : 'Integrated Modules'}</div>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-xl sm:text-2xl font-black text-brand-red">100%</div>
              <div className="text-[11px] font-bold text-gray-400">{isAr ? 'مزامنة سحابية لحظية' : 'Realtime Cloud Sync'}</div>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-xl sm:text-2xl font-black text-white">AR / EN</div>
              <div className="text-[11px] font-bold text-gray-400">{isAr ? 'دعم ثنائي اللغة كامل' : 'Bilingual Engine'}</div>
            </div>
            <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
              <div className="text-xl sm:text-2xl font-black text-emerald-400">PWA</div>
              <div className="text-[11px] font-bold text-gray-400">{isAr ? 'تطبيق جوال مثبت' : 'Mobile Web App'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Search & Category Filter Bar */}
      <div className="bg-neutral-900/90 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في محتويات الدليل، المزايا، خطوات العمل، التقارير...' : 'Search manual modules, features, reports, workflows...'}
              className="w-full bg-black/50 border border-white/10 rounded-xl pr-10 pl-4 py-2.5 text-xs sm:text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-red transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white px-2 py-0.5"
              >
                {isAr ? 'مسح' : 'Clear'}
              </button>
            )}
          </div>

          <div className="text-xs text-gray-400 shrink-0 font-bold">
            {filteredSections.length} {isAr ? 'قسم مفهرس' : 'indexed sections'}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 border whitespace-nowrap",
                  isSelected
                    ? "bg-brand-red text-white border-brand-red shadow-md shadow-brand-red/20"
                    : "bg-white/5 text-gray-400 border-white/10 hover:text-white hover:bg-white/10"
                )}
              >
                {isAr ? cat.nameAr : cat.nameEn}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dropdown Navigation Bar (فهرس أقسام النظام - قائمة منسدلة) */}
      <div className="sticky top-4 z-30 bg-neutral-900/95 border border-white/10 rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-2xl">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3" ref={tocDropdownRef}>
          {/* Dropdown Menu Trigger */}
          <div className="relative w-full sm:w-auto flex-1 max-w-xl">
            <button
              type="button"
              id="toc-dropdown-trigger"
              onClick={() => setIsTocDropdownOpen(prev => !prev)}
              className={cn(
                "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer shadow-md",
                isTocDropdownOpen
                  ? "bg-neutral-800 border-brand-red text-white ring-2 ring-brand-red/30"
                  : "bg-black/60 border-white/10 text-gray-200 hover:border-white/20 hover:bg-neutral-800/80"
              )}
              aria-expanded={isTocDropdownOpen}
              aria-label={isAr ? 'فهرس أقسام النظام - قائمة منسدلة' : 'System Sections Index - Dropdown Menu'}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="text-right min-w-0">
                  <span className="text-[10px] text-gray-400 block font-normal">
                    {isAr ? 'فهرس أقسام النظام (قائمة منسدلة للانتقال السريع)' : 'Table of Contents (Dropdown Quick-Jump)'}
                  </span>
                  <span className="font-bold text-white text-xs sm:text-sm truncate block">
                    {activeSection 
                      ? `${activeSection.number}. ${isAr ? activeSection.titleAr : activeSection.titleEn}` 
                      : (isAr ? 'اختر قسماً للانتقال إليه...' : 'Select a section to jump...')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-brand-red/20 text-brand-red border border-brand-red/30 hidden sm:inline-block">
                  {manualSections.length} {isAr ? 'أبواب' : 'Chapters'}
                </span>
                <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform duration-200", isTocDropdownOpen && "rotate-180 text-brand-red")} />
              </div>
            </button>

            {/* Dropdown Menu Popover */}
            {isTocDropdownOpen && (
              <div 
                id="toc-dropdown-menu"
                className="absolute top-full right-0 left-0 sm:left-auto sm:w-[460px] mt-2 bg-neutral-950/98 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-2xl p-2 z-50 max-h-[60vh] overflow-y-auto scrollbar-thin animate-fadeIn space-y-1"
              >
                <div className="px-3 py-2 text-[11px] font-bold text-gray-400 border-b border-white/10 flex items-center justify-between">
                  <span>{isAr ? 'اختر القسم المطلوب للانتقال الفوري إليه:' : 'Select a section to jump immediately:'}</span>
                  <span className="text-[10px] text-brand-red font-mono">{filteredSections.length} {isAr ? 'أقسام' : 'sections'}</span>
                </div>

                {filteredSections.map((sec) => {
                  const isActive = activeSectionId === sec.id;
                  const Icon = sec.icon;

                  return (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleSelectSectionFromDropdown(sec.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-xl text-xs font-bold transition-all text-right cursor-pointer group",
                        isActive
                          ? "bg-brand-red text-white shadow-md shadow-brand-red/20"
                          : "text-gray-300 hover:text-white hover:bg-white/10"
                      )}
                    >
                      <span className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-black shrink-0",
                        isActive ? "bg-black/40 text-white" : "bg-white/5 text-gray-400 group-hover:text-brand-red"
                      )}>
                        {sec.number}
                      </span>
                      <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-white" : "text-gray-400 group-hover:text-white")} />
                      <div className="flex-1 min-w-0 text-right">
                        <div className="truncate text-xs font-bold">{isAr ? sec.titleAr : sec.titleEn}</div>
                        <div className={cn("text-[10px] font-normal truncate", isActive ? "text-white/80" : "text-gray-400")}>
                          {isAr ? sec.badgeAr : sec.badgeEn}
                        </div>
                      </div>
                      {isActive && (
                        <Check className="w-4 h-4 text-white shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions: Expand All / Collapse All */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="toggle-all-sections-btn"
              onClick={() => {
                const allExpanded = Object.values(expandedSections).every(Boolean);
                const newState: Record<string, boolean> = {};
                manualSections.forEach(s => { newState[s.id] = !allExpanded; });
                setExpandedSections(newState);
              }}
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>{Object.values(expandedSections).every(Boolean) ? (isAr ? 'طي جميع الأقسام' : 'Collapse All') : (isAr ? 'توسيع جميع الأقسام' : 'Expand All')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Detailed Sections (Full-Width, Clean Layout) */}
      <div className="space-y-6">
          {filteredSections.length === 0 ? (
            <div className="p-12 text-center bg-neutral-900/60 border border-white/10 rounded-2xl space-y-3">
              <Search className="w-8 h-8 text-gray-500 mx-auto" />
              <div className="text-white font-bold">{isAr ? 'لم يتم العثور على أقسام مطابقة' : 'No matching sections found'}</div>
              <p className="text-gray-400 text-xs">{isAr ? 'جرب البحث بكلمات أخرى مثل "فني"، "تقرير"، "واتساب"، أو "تقويم".' : 'Try searching for terms like "technician", "report", "whatsapp", or "calendar".'}</p>
            </div>
          ) : (
            filteredSections.map((sec) => {
              const isExpanded = expandedSections[sec.id] ?? false;
              const Icon = sec.icon;

              return (
                <div
                  key={sec.id}
                  id={`section-${sec.id}`}
                  className="bg-neutral-900/90 border border-white/10 hover:border-white/20 rounded-3xl p-5 sm:p-7 shadow-xl transition-all space-y-5"
                >
                  {/* Section Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red font-black text-lg shrink-0 shadow-inner">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono font-bold text-brand-red">#{sec.number}</span>
                          <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300">
                            {isAr ? sec.badgeAr : sec.badgeEn}
                          </span>
                        </div>
                        <h2 className="text-lg sm:text-xl font-display font-black text-white">
                          {isAr ? sec.titleAr : sec.titleEn}
                        </h2>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleCopyLink(sec.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer text-xs font-bold inline-flex items-center gap-1.5"
                        title={isAr ? 'نسخ ملخص هذا الباب' : 'Copy section summary'}
                      >
                        {copiedSection === sec.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{isAr ? 'تم النسخ' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isAr ? 'نسخ' : 'Copy'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleSection(sec.id)}
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
                        aria-label="Toggle section"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
                    {isAr ? sec.summaryAr : sec.summaryEn}
                  </p>

                  {/* Collapsible Features & Steps */}
                  {isExpanded && (
                    <div className="space-y-5 animate-fadeIn">
                      {/* Features Grid */}
                      <div className="space-y-2.5">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-brand-red" />
                          <span>{isAr ? 'أبرز المزايا والوظائف المتاحة:' : 'Key Capabilities & Features:'}</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {(isAr ? sec.featuresAr : sec.featuresEn).map((feat, fIdx) => (
                            <div
                              key={fIdx}
                              className="p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/15 transition-all space-y-1.5"
                            >
                              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-red" />
                                <span>{feat.title}</span>
                              </div>
                              <p className="text-[11px] text-gray-400 leading-relaxed">
                                {feat.desc}
                              </p>
                              {feat.tip && (
                                <div className="text-[10px] text-red-200 bg-brand-red/10 p-1.5 rounded-lg border border-brand-red/20 mt-1">
                                  💡 {feat.tip}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Workflow Steps if present */}
                      {sec.workflowStepsAr && (
                        <div className="space-y-2.5 pt-2 border-t border-white/5">
                          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                            <Sliders className="w-3.5 h-3.5 text-brand-red" />
                            <span>{isAr ? 'دورة العمل التشغيلية خطوة بخطوة:' : 'Operational Workflow Step-by-Step:'}</span>
                          </div>

                          <div className="space-y-2">
                            {(isAr ? sec.workflowStepsAr : sec.workflowStepsEn || []).map((step, sIdx) => (
                              <div
                                key={sIdx}
                                className="flex items-start gap-3 p-2.5 rounded-xl bg-black/40 border border-white/5 text-xs text-gray-300"
                              >
                                <span className="w-5 h-5 rounded-full bg-brand-red/20 text-brand-red font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                                  {sIdx + 1}
                                </span>
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
    </div>
  );
};
