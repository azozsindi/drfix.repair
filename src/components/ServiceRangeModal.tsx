import React, { useState } from 'react';
import { 
  MapPin, 
  Navigation, 
  ShieldCheck, 
  AlertTriangle, 
  DollarSign, 
  X, 
  CheckCircle2, 
  Search, 
  Settings2, 
  Sliders, 
  Compass,
  Info,
  Car
} from 'lucide-react';
import { ServiceZone, ServiceRangeConfig, ZoneCheckResult } from '../types';

// Default Jeddah Service Zones
export const DEFAULT_SERVICE_RANGE_CONFIG: ServiceRangeConfig = {
  centerLat: 21.5433, // Jeddah Base Workshop
  centerLng: 39.1728,
  centerName: 'مقر DR.FIX الرئيسي - جدة (طريق المدينة)',
  autoRejectOutOfRange: true, // رفض الطلب تلقائياً إذا كان خارج النطاق
  maxServiceRadiusKm: 50,
  zones: [
    {
      id: 'central_jeddah',
      nameAr: 'النطاق الأساسي (وسط وشمال جدة)',
      nameEn: 'Central & North Jeddah (Standard)',
      type: 'standard',
      maxRadiusKm: 20,
      travelFee: 0, // مشمول مجاناً ضمن الخدمة
      color: '#10b981', // Green
      descriptionAr: 'تغطية فورية مجانية بدون رسوم انتقال إضافية. وصول الفني خلال 20 - 45 دقيقة.',
      districtsAr: [
        'الروضة', 'السلامة', 'الزهراء', 'الشاطئ', 'الصفا', 'المروة', 
        'البوادي', 'الفيصلية', 'الربوة', 'الحمراء', 'الأندلس', 'مشرفة',
        'العزيزية', 'الرحاب', 'النزهة', 'المحمدية', 'النعيم', 'النهضة'
      ]
    },
    {
      id: 'extended_jeddah',
      nameAr: 'النطاق الممتد (أبحر والحمدانية والسامر)',
      nameEn: 'Extended Jeddah (Suburbs)',
      type: 'extended',
      maxRadiusKm: 35,
      travelFee: 35, // رسوم انتقال إضافية 35 ر.س
      color: '#3b82f6', // Blue
      descriptionAr: 'تغطية متاحة مع احتساب رسوم انتقال للمناطق الممتدة (+35 ر.س). وصول الفني خلال 45 - 60 دقيقة.',
      districtsAr: [
        'أبحر الشمالية', 'أبحر الجنوبية', 'الحمدانية', 'السامر', 'الكوثر',
        'الأصالة', 'البساتين', 'المرجان', 'الشراع', 'الفلاح', 'المنار',
        'بريمان', 'الأجاويد', 'السنابل', 'الروابي', 'الوزيرية'
      ]
    },
    {
      id: 'remote_jeddah',
      nameAr: 'النطاق البعيد (ذهبان، الخمرة، عسفان)',
      nameEn: 'Remote Outskirts (Dhahban / Khumrah)',
      type: 'remote',
      maxRadiusKm: 50,
      travelFee: 65, // رسوم انتقال إضافية 65 ر.س
      color: '#DC2626', // Red
      descriptionAr: 'تغطية للمناطق والأطراف البعيدة مع رسوم انتقال (+65 ر.س). وصول الفني خلال 60 - 90 دقيقة.',
      districtsAr: [
        'ذهبان', 'الخمرة', 'عسفان', 'طيبة', 'جوهرة العروس', 'القرينية', 'خليص الجنوبية'
      ]
    },
    {
      id: 'out_of_range',
      nameAr: 'خارج نطاق التغطية (خارج جدة)',
      nameEn: 'Out of Coverage Area',
      type: 'excluded',
      maxRadiusKm: 999,
      travelFee: 0,
      color: '#ef4444', // Red
      descriptionAr: 'خارج حدود الخدمة الميدانية لـ DR.FIX. يتم الاعتذار ورفض الطلب تلقائياً لحين فتح فروع جديدة.',
      districtsAr: [
        'مكة المكرمة', 'المدينة المنورة', 'رابغ', 'بحرة', 'الجموم', 'الطائف', 'ثول'
      ]
    }
  ]
};

// Calculate Haversine distance in Kilometers
export const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
};

// Check Location against Coverage Configuration
export const checkServiceLocation = (
  coords?: { latitude: number; longitude: number } | null,
  districtOrAddress?: string,
  config: ServiceRangeConfig = DEFAULT_SERVICE_RANGE_CONFIG
): ZoneCheckResult => {
  const cleanInput = (districtOrAddress || '').toLowerCase().trim();

  // 1. Direct district text matching if entered
  if (cleanInput) {
    // Check excluded first
    const excludedZone = config.zones.find(z => z.type === 'excluded');
    if (excludedZone?.districtsAr.some(d => cleanInput.includes(d.toLowerCase()))) {
      return {
        isInRange: false,
        zone: excludedZone,
        distanceKm: 65,
        travelFee: 0,
        statusMessage: 'نعتذر منك، منطقتك تقع خارج نطاق خدمة DR.FIX الميدانية حالياً.',
        canBook: false
      };
    }

    // Check standard
    const standardZone = config.zones.find(z => z.type === 'standard');
    if (standardZone?.districtsAr.some(d => cleanInput.includes(d.toLowerCase()))) {
      return {
        isInRange: true,
        zone: standardZone,
        distanceKm: 12,
        travelFee: standardZone.travelFee,
        statusMessage: 'موقعك ضمن النطاق الأساسي المعتمد بدون أي رسوم انتقال إضافية.',
        canBook: true
      };
    }

    // Check extended
    const extZone = config.zones.find(z => z.type === 'extended');
    if (extZone?.districtsAr.some(d => cleanInput.includes(d.toLowerCase()))) {
      return {
        isInRange: true,
        zone: extZone,
        distanceKm: 28,
        travelFee: extZone.travelFee,
        statusMessage: `موقعك ضمن النطاق الممتد. يتم احتساب رسوم انتقال للمنطقة قدرها (${extZone.travelFee} ر.س).`,
        canBook: true
      };
    }

    // Check remote
    const remoteZone = config.zones.find(z => z.type === 'remote');
    if (remoteZone?.districtsAr.some(d => cleanInput.includes(d.toLowerCase()))) {
      return {
        isInRange: true,
        zone: remoteZone,
        distanceKm: 42,
        travelFee: remoteZone.travelFee,
        statusMessage: `موقعك ضمن النطاق البعيد. يتم احتساب رسوم انتقال للمنطقة قدرها (${remoteZone.travelFee} ر.س).`,
        canBook: true
      };
    }
  }

  // 2. GPS coordinates evaluation
  if (coords && coords.latitude && coords.longitude) {
    const dist = calculateDistanceKm(config.centerLat, config.centerLng, coords.latitude, coords.longitude);
    
    if (dist <= 20) {
      const z = config.zones.find(z => z.type === 'standard') || config.zones[0];
      return {
        isInRange: true,
        zone: z,
        distanceKm: dist,
        travelFee: z.travelFee,
        statusMessage: `الموقع على بعد ${dist} كم (النطاق الأساسي - رسوم انتقال 0 ر.س).`,
        canBook: true
      };
    } else if (dist <= 35) {
      const z = config.zones.find(z => z.type === 'extended') || config.zones[1];
      return {
        isInRange: true,
        zone: z,
        distanceKm: dist,
        travelFee: z.travelFee,
        statusMessage: `الموقع على بعد ${dist} كم (النطاق الممتد - رسوم انتقال +${z.travelFee} ر.س).`,
        canBook: true
      };
    } else if (dist <= config.maxServiceRadiusKm) {
      const z = config.zones.find(z => z.type === 'remote') || config.zones[2];
      return {
        isInRange: true,
        zone: z,
        distanceKm: dist,
        travelFee: z.travelFee,
        statusMessage: `الموقع على بعد ${dist} كم (أطراف جدة البعيدة - رسوم انتقال +${z.travelFee} ر.س).`,
        canBook: true
      };
    } else {
      const z = config.zones.find(z => z.type === 'excluded') || config.zones[config.zones.length - 1];
      return {
        isInRange: false,
        zone: z,
        distanceKm: dist,
        travelFee: 0,
        statusMessage: `الموقع على بعد ${dist} كم، وهو خارج نطاق التغطية الأقصى (${config.maxServiceRadiusKm} كم). يتم رفض الطلب تلقائياً.`,
        canBook: !config.autoRejectOutOfRange
      };
    }
  }

  // Default fallback (assume central standard if undetermined)
  const defaultZone = config.zones[0];
  return {
    isInRange: true,
    zone: defaultZone,
    distanceKm: 0,
    travelFee: defaultZone.travelFee,
    statusMessage: 'سيتم تحديد النطاق الدقيق ورسوم الانتقال تلقائياً عند إدخال موقعك.',
    canBook: true
  };
};

interface ServiceRangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  initialCoords?: { latitude: number; longitude: number } | null;
  onSelectZoneFee?: (fee: number, zoneName: string) => void;
}

export const ServiceRangeModal: React.FC<ServiceRangeModalProps> = ({
  isOpen,
  onClose,
  isAdmin = false,
  initialCoords,
  onSelectZoneFee
}) => {
  if (!isOpen) return null;

  const [config, setConfig] = useState<ServiceRangeConfig>(() => {
    const saved = localStorage.getItem('drfix_service_range_config');
    return saved ? JSON.parse(saved) : DEFAULT_SERVICE_RANGE_CONFIG;
  });

  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [activeZoneTab, setActiveZoneTab] = useState<string>('all');
  const [searchDistrict, setSearchDistrict] = useState<string>('');
  const [testedCoords, setTestedCoords] = useState<{ lat: number; lng: number } | null>(
    initialCoords ? { lat: initialCoords.latitude, lng: initialCoords.longitude } : null
  );
  const [testResult, setTestResult] = useState<ZoneCheckResult | null>(null);

  const handleTestDistrict = (district: string) => {
    setSelectedDistrict(district);
    const result = checkServiceLocation(null, district, config);
    setTestResult(result);
    if (onSelectZoneFee && result.canBook) {
      onSelectZoneFee(result.travelFee, result.zone.nameAr);
    }
  };

  const handleSaveConfig = () => {
    localStorage.setItem('drfix_service_range_config', JSON.stringify(config));
    alert('تم حفظ إعدادات نطاق الخدمة والرسوم بنجاح');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0f0f12] border border-white/15 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto text-right">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>تحديد نطاق تغطية DR.FIX ورسوم المناطق</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                  جدة وضواحيها
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                خريطة تفاعلية للمناطق المعتمدة، حساب رسوم الانتقال التلقائي، والرفض الآلي خارج النطاق
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-white/10 text-gray-400 hover:text-white rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-7 overflow-y-auto flex-1 space-y-6">

          {/* Coverage Summary Alert */}
          <div className="bg-gradient-to-r from-brand-red/10 via-white/5 to-emerald-500/10 border border-white/10 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>المركز الميداني: {config.centerName}</span>
              </div>
              <p className="text-xs text-gray-400">
                أقصى دائرة تغطية: {config.maxServiceRadiusKm} كم • الرفض التلقائي خارج النطاق: 
                <span className={config.autoRejectOutOfRange ? "text-emerald-400 font-bold mx-1" : "text-brand-red font-bold mx-1"}>
                  {config.autoRejectOutOfRange ? 'مفعل ومحمي 🔒' : 'معطل'}
                </span>
              </p>
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2 text-xs font-bold text-gray-300 cursor-pointer select-none">
                <input 
                  type="checkbox"
                  checked={config.autoRejectOutOfRange}
                  onChange={e => setConfig({ ...config, autoRejectOutOfRange: e.target.checked })}
                  className="w-4 h-4 rounded border-white/20 bg-black/40 text-brand-red focus:ring-brand-red cursor-pointer accent-brand-red"
                />
                <span>تفعيل الرفض التلقائي للطلبات خارج النطاق</span>
              </label>
            )}
          </div>

          {/* Interactive Visual Map Representation */}
          <div className="glass-card p-5 border-white/10 rounded-2xl space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-red" />
                <h4 className="text-sm font-bold text-white">خريطة النطاقات الميدانية التفاعلية لمدينة جدة</h4>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  أساسي (0 ر.س)
                </span>
                <span className="flex items-center gap-1 text-blue-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  ممتد (+{config.zones[1]?.travelFee} ر.س)
                </span>
                <span className="flex items-center gap-1 text-white">
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-red inline-block" />
                  بعيد (+{config.zones[2]?.travelFee} ر.س)
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                  خارج النطاق (مرفوض)
                </span>
              </div>
            </div>

            {/* SVG Visual Map Canvas with Concentric Radar Circles & Key Landmarks */}
            <div className="relative w-full h-72 sm:h-80 bg-[#08080c] rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center p-2">
              {/* Grid Background */}
              <div className="absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:16px_16px]" />
              
              {/* SVG Drawing */}
              <svg className="w-full h-full" viewBox="0 0 500 320">
                {/* Coastline (Red Sea on the Left) */}
                <path 
                  d="M 120,0 Q 140,80 130,160 T 150,320 L 0,320 L 0,0 Z" 
                  fill="#0c1b2b" 
                  stroke="#1e3a5f" 
                  strokeWidth="1.5"
                />
                <text x="35" y="160" fill="#3b82f6" fontSize="11" fontWeight="bold" opacity="0.6">البحر الأحمر</text>

                {/* Concentric Coverage Radar Circles Centered on Workshop Base (x: 270, y: 160) */}
                {/* Outer Out of Bounds Zone (45+ km) */}
                <circle cx="270" cy="160" r="140" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.4" />
                <text x="390" y="45" fill="#ef4444" fontSize="10" fontWeight="bold">حدود الرفض الأقصى (50 كم)</text>

                {/* Remote Zone (35 - 50 km) */}
                <circle cx="270" cy="160" r="115" fill="rgba(220, 38, 38, 0.08)" stroke="#DC2626" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="375" y="100" fill="#DC2626" fontSize="9" fontWeight="bold">النطاق البعيد (+65 ر.س)</text>

                {/* Extended Zone (20 - 35 km) */}
                <circle cx="270" cy="160" r="80" fill="rgba(59, 130, 246, 0.12)" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="330" y="125" fill="#3b82f6" fontSize="9" fontWeight="bold">النطاق الممتد (+35 ر.س)</text>

                {/* Standard Central Zone (0 - 20 km) */}
                <circle cx="270" cy="160" r="45" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981" strokeWidth="2" />
                <text x="245" y="130" fill="#10b981" fontSize="9" fontWeight="bold">النطاق الأساسي (0 ر.س)</text>

                {/* Central Base Marker */}
                <circle cx="270" cy="160" r="6" fill="#ef4444" />
                <circle cx="270" cy="160" r="12" fill="none" stroke="#ef4444" strokeWidth="2" opacity="0.8">
                  <animate attributeName="r" values="6;16;6" dur="2s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite" />
                </circle>
                <text x="270" y="182" fill="#ffffff" fontSize="10" fontWeight="black" textAnchor="middle">ورشة DR.FIX</text>

                {/* Landmark Pins / District Labels */}
                {/* North: Obhur & Dahaban */}
                <circle cx="230" cy="60" r="3.5" fill="#3b82f6" />
                <text x="230" y="52" fill="#93c5fd" fontSize="9" textAnchor="middle">أبحر الشمالية</text>

                <circle cx="280" cy="30" r="3.5" fill="#DC2626" />
                <text x="280" y="22" fill="#fcd34d" fontSize="9" textAnchor="middle">ذهبان</text>

                {/* Northeast: Hamdaniyah */}
                <circle cx="330" cy="85" r="3.5" fill="#3b82f6" />
                <text x="330" y="77" fill="#93c5fd" fontSize="9" textAnchor="middle">الحمدانية</text>

                {/* Central: Rawdah, Salamah, Zahra */}
                <circle cx="220" cy="145" r="3.5" fill="#10b981" />
                <text x="220" y="137" fill="#a7f3d0" fontSize="9" textAnchor="middle">الروضة / السلامة</text>

                <circle cx="290" cy="135" r="3.5" fill="#10b981" />
                <text x="290" y="127" fill="#a7f3d0" fontSize="9" textAnchor="middle">الصفا / المروة</text>

                {/* South: Balad & Khumrah */}
                <circle cx="250" cy="225" r="3.5" fill="#3b82f6" />
                <text x="250" y="240" fill="#93c5fd" fontSize="9" textAnchor="middle">البلد / الجامعة</text>

                <circle cx="270" cy="275" r="3.5" fill="#DC2626" />
                <text x="270" y="290" fill="#fcd34d" fontSize="9" textAnchor="middle">الخمرة</text>

                {/* Out of bounds marker */}
                <circle cx="430" cy="220" r="3.5" fill="#ef4444" />
                <text x="430" y="235" fill="#fca5a5" fontSize="9" textAnchor="middle">خارج النطاق (مكة/بحرة)</text>
              </svg>

              {/* Floating Quick Action */}
              <div className="absolute bottom-3 right-3 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[11px] text-gray-300">
                📍 النطاق يغطي جدة من أبحر وذهبان شمالاً إلى الخمرة جنوباً
              </div>
            </div>
          </div>

          {/* Interactive District Search & Instant Distance Calculator */}
          <div className="glass-card p-5 border-white/10 rounded-2xl space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-brand-red" />
              <span>فحص تغطية حيك أو منطقتك فوراً</span>
            </h4>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input 
                  type="text"
                  value={searchDistrict}
                  onChange={e => setSearchDistrict(e.target.value)}
                  placeholder="ابحث باسم الحي (مثال: الروضة، أبحر الشمالية، الحمدانية، الخمرة)..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl pr-4 pl-4 py-3 text-xs text-white outline-none focus:border-brand-red"
                />
              </div>
              <button
                type="button"
                onClick={() => handleTestDistrict(searchDistrict)}
                disabled={!searchDistrict.trim()}
                className="px-6 py-3 bg-brand-red hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer shrink-0"
              >
                فحص الحي
              </button>
            </div>

            {/* Test Result Display */}
            {testResult && (
              <div className={`p-4 rounded-2xl border transition-all ${
                !testResult.canBook 
                  ? 'bg-red-500/10 border-red-500/30 text-red-300' 
                  : testResult.travelFee > 0 
                  ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' 
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              }`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">
                      {!testResult.canBook ? '🚫' : testResult.travelFee > 0 ? '🚗' : '✅'}
                    </span>
                    <div className="space-y-1 text-right">
                      <div className="font-bold text-sm text-white flex items-center gap-2">
                        <span>{testResult.zone.nameAr}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-black/40 font-mono">
                          {testResult.distanceKm > 0 ? `${testResult.distanceKm} كم` : 'محدد بالحي'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-200 leading-relaxed">
                        {testResult.statusMessage}
                      </p>
                      {testResult.canBook ? (
                        <div className="text-xs font-bold mt-1 text-emerald-400">
                          {testResult.travelFee === 0 
                            ? '✨ رسوم انتقال مجانية ومشمولة بالطلب' 
                            : `💰 رسوم انتقال للمنطقة البعيدة: +${testResult.travelFee} ر.س`}
                        </div>
                      ) : (
                        <div className="text-xs font-bold mt-1 text-red-400">
                          ⚠️ لن يتم استقبال هذا الطلب تلقائياً لأنه يقع خارج نطاق الخدمة المعتمد.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Zones List & Included Districts */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-white">تفاصيل النطاقات والأحياء المشمولة:</h4>
            <div className="grid md:grid-cols-3 gap-4">
              {config.zones.map(zone => (
                <div 
                  key={zone.id}
                  className="glass-card p-4 border-white/10 rounded-2xl flex flex-col justify-between hover:border-white/20 transition-all text-right"
                  style={{ borderTop: `3px solid ${zone.color}` }}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-white">{zone.nameAr}</span>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
                      >
                        {zone.type === 'excluded' ? 'مرفوض آلياً' : zone.travelFee === 0 ? 'مجاناً' : `+${zone.travelFee} ر.س`}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {zone.descriptionAr}
                    </p>
                    
                    {/* Districts tags */}
                    <div className="pt-2 border-t border-white/5">
                      <div className="text-[10px] text-gray-500 font-bold mb-1.5">أبرز الأحياء:</div>
                      <div className="flex flex-wrap gap-1">
                        {zone.districtsAr.slice(0, 8).map((d, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => handleTestDistrict(d)}
                            className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all cursor-pointer"
                          >
                            {d}
                          </button>
                        ))}
                        {zone.districtsAr.length > 8 && (
                          <span className="text-[10px] text-gray-500 self-center">
                            +{zone.districtsAr.length - 8} أحياء
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className="text-gray-400 text-[11px]">رسوم الانتقال:</span>
                      <input 
                        type="number"
                        value={zone.travelFee}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setConfig({
                            ...config,
                            zones: config.zones.map(z => z.id === zone.id ? { ...z, travelFee: val } : z)
                          });
                        }}
                        className="w-16 bg-black/60 border border-white/10 rounded-lg px-2 py-1 text-center text-xs text-white font-bold"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center justify-between shrink-0">
          <div className="text-xs text-gray-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-brand-red shrink-0" />
            <span>يتم تطبيق حساب المسافة والرسوم فورياً عند إدخال موقع العميل</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={handleSaveConfig}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                حفظ الإعدادات
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-brand-red hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
