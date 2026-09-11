import React, { useState, useEffect, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Map as MapIcon, 
  Compass, 
  Search, 
  CheckCircle2, 
  X, 
  ExternalLink, 
  Info, 
  RefreshCw,
  Sliders,
  Check,
  Building,
  Maximize2
} from 'lucide-react';
import { useScrollLock } from '../lib/scrollLock';
import { ServiceRangeModal, DEFAULT_SERVICE_RANGE_CONFIG, calculateDistanceKm } from './ServiceRangeModal';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
}

export interface JeddahDistrict {
  id: string;
  nameAr: string;
  nameEn: string;
  zoneId: 'central_jeddah' | 'extended_jeddah' | 'remote_jeddah';
  zoneNameAr: string;
  travelFee: number;
  lat: number;
  lng: number;
}

export const POPULAR_JEDDAH_DISTRICTS: JeddahDistrict[] = [
  // Central & North Jeddah (Standard - 0 SAR)
  { id: 'rawdah', nameAr: 'حي الروضة', nameEn: 'Al Rawdah', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5606, lng: 39.1558 },
  { id: 'salamah', nameAr: 'حي السلامة', nameEn: 'Al Salamah', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5833, lng: 39.1550 },
  { id: 'zahra', nameAr: 'حي الزهراء', nameEn: 'Al Zahra', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5888, lng: 39.1350 },
  { id: 'shatee', nameAr: 'حي الشاطئ', nameEn: 'Al Shati', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.6033, lng: 39.1120 },
  { id: 'safa', nameAr: 'حي الصفا', nameEn: 'Al Safa', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5794, lng: 39.2025 },
  { id: 'marwah', nameAr: 'حي المروة', nameEn: 'Al Marwah', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.6144, lng: 39.2045 },
  { id: 'bawadi', nameAr: 'حي البوادي', nameEn: 'Al Bawadi', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.6033, lng: 39.1670 },
  { id: 'faisaliyah', nameAr: 'حي الفيصلية', nameEn: 'Al Faisaliyah', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5583, lng: 39.1750 },
  { id: 'naeem', nameAr: 'حي النعيم', nameEn: 'Al Naeem', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.6322, lng: 39.1540 },
  { id: 'nahdah', nameAr: 'حي النهضة', nameEn: 'Al Nahdah', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.6250, lng: 39.1300 },
  { id: 'mohammadiyah', nameAr: 'حي المحمدية', nameEn: 'Al Mohammadiyyah', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.6500, lng: 39.1350 },
  { id: 'hamra', nameAr: 'حي الحمراء', nameEn: 'Al Hamra', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5200, lng: 39.1550 },
  { id: 'andalus', nameAr: 'حي الأندلس', nameEn: 'Al Andalus', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5450, lng: 39.1550 },
  { id: 'rehab', nameAr: 'حي الرحاب', nameEn: 'Al Rehab', zoneId: 'central_jeddah', zoneNameAr: 'النطاق الأساسي (مجاني)', travelFee: 0, lat: 21.5550, lng: 39.2100 },

  // Extended Jeddah (Suburbs - 35 SAR)
  { id: 'obhur_north', nameAr: 'أبحر الشمالية', nameEn: 'North Obhur', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.7450, lng: 39.1200 },
  { id: 'obhur_south', nameAr: 'أبحر الجنوبية', nameEn: 'South Obhur', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.7100, lng: 39.1150 },
  { id: 'hamdaniyah', nameAr: 'حي الحمدانية', nameEn: 'Al Hamdaniyah', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.7380, lng: 39.2150 },
  { id: 'samer', nameAr: 'حي السامر', nameEn: 'Al Samer', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.5950, lng: 39.2300 },
  { id: 'murjan', nameAr: 'حي المرجان', nameEn: 'Al Murjan', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.6850, lng: 39.1100 },
  { id: 'basateen', nameAr: 'حي البساتين', nameEn: 'Al Basateen', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.6650, lng: 39.1200 },
  { id: 'kawthar', nameAr: 'حي الكوثر', nameEn: 'Al Kawthar', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.7550, lng: 39.2250 },
  { id: 'naseem', nameAr: 'حي النسيم', nameEn: 'Al Naseem', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.5050, lng: 39.2300 },
  { id: 'fayha', nameAr: 'حي الفيحاء', nameEn: 'Al Fayhaa', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.4950, lng: 39.2200 },
  { id: 'sanabil', nameAr: 'حي السنابل', nameEn: 'Al Sanabil', zoneId: 'extended_jeddah', zoneNameAr: 'النطاق الممتد (+35 ر.س)', travelFee: 35, lat: 21.3650, lng: 39.2600 },

  // Remote Outskirts (65 SAR)
  { id: 'dhahban', nameAr: 'ذهبان', nameEn: 'Dhahban', zoneId: 'remote_jeddah', zoneNameAr: 'النطاق البعيد (+65 ر.س)', travelFee: 65, lat: 21.8900, lng: 39.1400 },
  { id: 'khumrah', nameAr: 'الخمرة', nameEn: 'Al Khumrah', zoneId: 'remote_jeddah', zoneNameAr: 'النطاق البعيد (+65 ر.س)', travelFee: 65, lat: 21.3000, lng: 39.2800 },
  { id: 'usfan', nameAr: 'عسفان', nameEn: 'Usfan', zoneId: 'remote_jeddah', zoneNameAr: 'النطاق البعيد (+65 ر.س)', travelFee: 65, lat: 21.9150, lng: 39.3450 }
];

interface InteractiveLocationPickerProps {
  coords: LocationCoordinates | null;
  locationName: string;
  locating: boolean;
  locationError: string | null;
  onGetLocation: () => void;
  onSetCoords: (coords: LocationCoordinates | null) => void;
  onSetLocationName: (name: string) => void;
  lang?: 'ar' | 'en';
}

export const InteractiveLocationPicker: React.FC<InteractiveLocationPickerProps> = ({
  coords,
  locationName,
  locating,
  locationError,
  onGetLocation,
  onSetCoords,
  onSetLocationName,
  lang = 'ar'
}) => {
  const isAr = lang === 'ar';
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [showAllDistricts, setShowAllDistricts] = useState(false);

  // Map pin state inside modal
  const [tempCoords, setTempCoords] = useState<LocationCoordinates>(() => {
    return coords || { latitude: DEFAULT_SERVICE_RANGE_CONFIG.centerLat, longitude: DEFAULT_SERVICE_RANGE_CONFIG.centerLng };
  });
  const [tempAddress, setTempAddress] = useState<string>(locationName || 'جدة');
  const [searchQuery, setSearchQuery] = useState('');

  // When modal opens, sync temp coords
  useEffect(() => {
    if (isMapModalOpen) {
      setTempCoords(coords || { latitude: 21.5606, longitude: 39.1558 });
      setTempAddress(locationName || 'جدة - حي الروضة');
    }
  }, [isMapModalOpen, coords, locationName]);

  // Handle selecting a district chip
  const handleSelectDistrict = (district: JeddahDistrict) => {
    onSetCoords({ latitude: district.lat, longitude: district.lng });
    const fullLoc = `جدة - ${district.nameAr}`;
    onSetLocationName(fullLoc);
  };

  // Determine current zone info
  const getCurrentZoneInfo = () => {
    if (!coords) return null;
    const distance = calculateDistanceKm(
      DEFAULT_SERVICE_RANGE_CONFIG.centerLat,
      DEFAULT_SERVICE_RANGE_CONFIG.centerLng,
      coords.latitude,
      coords.longitude
    );

    if (distance <= 20) {
      return { name: 'النطاق الأساسي', fee: 0, text: 'انتقال مجاني', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' };
    } else if (distance <= 35) {
      return { name: 'النطاق الممتد', fee: 35, text: '+35 ر.س رسوم انتقال', color: 'text-blue-400 border-blue-500/30 bg-blue-500/10' };
    } else if (distance <= 50) {
      return { name: 'النطاق البعيد', fee: 65, text: '+65 ر.س رسوم انتقال', color: 'text-amber-400 border-amber-500/30 bg-amber-500/10' };
    } else {
      return { name: 'خارج النطاق المعتاد', fee: 0, text: 'يرجى التنسيق', color: 'text-red-400 border-red-500/30 bg-red-500/10' };
    }
  };

  const zoneInfo = getCurrentZoneInfo();

  // Scroll lock for Map Modal
  useScrollLock(isMapModalOpen);

  return (
    <div className="space-y-3">
      {/* Primary Location Box */}
      <div 
        className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden ${
          coords 
            ? 'bg-gradient-to-br from-emerald-950/20 via-black/60 to-black/40 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.12)]' 
            : 'bg-black/40 border-white/10'
        }`}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Status and title */}
          <div className="flex items-start gap-3 text-right flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${
              coords 
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' 
                : 'bg-brand-red/15 border-brand-red/30 text-brand-red'
            }`}>
              <MapPin className="w-5 h-5" />
            </div>

            <div className="space-y-1 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm sm:text-base font-bold text-white">
                  {isAr ? 'تحديد موقع السيارة في جدة' : 'Set Vehicle Location in Jeddah'}
                </span>

                {coords && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{isAr ? 'تم تثبيت الإحداثيات (GPS)' : 'GPS Captured'}</span>
                  </span>
                )}

                {zoneInfo && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${zoneInfo.color}`}>
                    <span>{zoneInfo.name}</span>
                    <span>•</span>
                    <span>{zoneInfo.text}</span>
                  </span>
                )}
              </div>

              <p className="text-xs text-gray-300 leading-relaxed">
                {coords ? (
                  <span className="text-emerald-300 font-medium">
                    {locationName || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
                  </span>
                ) : (
                  <span>
                    {isAr 
                      ? 'حدد موقع سيارتك ليصلك الفني المتنقل مباشرة (عبر GPS، أو اختيار الحي، أو الخريطة).' 
                      : 'Choose your location via GPS, district selector, or interactive map.'}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
            {/* GPS Detection Button */}
            <button
              type="button"
              onClick={onGetLocation}
              disabled={locating}
              className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm ${
                locating
                  ? 'bg-brand-red/30 text-white cursor-wait'
                  : 'bg-brand-red text-white hover:bg-red-700 active:scale-95 shadow-brand-red/20'
              }`}
            >
              {locating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>{isAr ? 'جاري تحديد GPS...' : 'Locating...'}</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>{isAr ? '📍 موقعي الحالي' : 'My GPS'}</span>
                </>
              )}
            </button>

            {/* Interactive Map Picker Modal Button */}
            <button
              type="button"
              onClick={() => setIsMapModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            >
              <MapIcon className="w-3.5 h-3.5 text-brand-red" />
              <span>{isAr ? '🗺️ الخريطة' : 'Map Pin'}</span>
            </button>

            {/* Service Range Info Button */}
            <button
              type="button"
              onClick={() => setIsRangeModalOpen(true)}
              className="px-3 py-2.5 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 transition-all flex items-center justify-center gap-1 cursor-pointer"
              title="فحص رسوم ونطاق التغطية"
            >
              <Compass className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{isAr ? 'النطاق' : 'Zones'}</span>
            </button>

            {coords && (
              <a
                href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-2.5 rounded-xl text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 transition-all flex items-center justify-center"
                title="عرض في خرائط Google"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* Browser Geolocation Error/Help Banner */}
        {locationError && (
          <div className="mt-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-2 text-right">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-amber-300">{locationError}</div>
                <div className="text-[11px] text-gray-300 leading-relaxed">
                  {isAr 
                    ? 'لا تشيل هم! يمكنك ببساطة اختيار حيك في جدة من القائمة السريعة بالأسفل بنقرة واحدة بدون الحاجة لتفعيل الـ GPS.' 
                    : 'No problem! Simply select your district from the quick buttons below.'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Jeddah Districts Chips (Clickable) */}
        <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-gray-300 flex items-center gap-1.5">
              <span>⚡</span>
              <span>{isAr ? 'أحياء جدة الأكثر طلباً (انقر للاختيار المباشر):' : 'Popular Jeddah Districts:'}</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAllDistricts(!showAllDistricts)}
              className="text-brand-red hover:underline text-[11px] font-bold cursor-pointer"
            >
              {showAllDistricts ? (isAr ? 'عرض أقل' : 'Show less') : (isAr ? 'عرض كل الأحياء (+15)' : 'Show all (+15)')}
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {(showAllDistricts ? POPULAR_JEDDAH_DISTRICTS : POPULAR_JEDDAH_DISTRICTS.slice(0, 10)).map((district) => {
              const isSelected = locationName.includes(district.nameAr);
              return (
                <button
                  key={district.id}
                  type="button"
                  onClick={() => handleSelectDistrict(district)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-brand-red text-white shadow-md shadow-brand-red/30 scale-105 border border-brand-red'
                      : 'bg-white/5 hover:bg-white/15 text-gray-300 border border-white/10 hover:border-white/20'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                  <span>{district.nameAr}</span>
                  {district.travelFee > 0 && (
                    <span className={`text-[9px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-black/30 text-white' : 'bg-blue-500/20 text-blue-300'}`}>
                      +{district.travelFee}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Detailed Address / Street / Landmark Input */}
        <div className="mt-3.5 pt-3 border-t border-white/5 space-y-1.5">
          <label className="text-[11px] font-bold text-gray-400 block text-right">
            {isAr ? 'العنوان التفصيلي / الشارع / معلم قريب للسيارة:' : 'Street Address / Nearby Landmark:'}
          </label>
          <div className="relative">
            <input
              type="text"
              value={locationName}
              onChange={(e) => onSetLocationName(e.target.value)}
              placeholder={isAr ? 'مثال: جدة، حي الروضة - شارع الكيال، بجوار مدرسة البيان' : 'e.g. Jeddah, Al Rawdah - Kayyal St.'}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-500 text-right pr-9"
            />
            <Building className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* INTERACTIVE MAP PICKER MODAL (Jeddah Interactive Map) */}
      {/* ========================================================================= */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-neutral-900 border border-brand-red/30 rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
              <div className="flex items-center gap-2.5 text-right">
                <div className="w-9 h-9 rounded-xl bg-brand-red/20 border border-brand-red/30 flex items-center justify-center text-brand-red">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-display">
                    {isAr ? 'تحديد موقع السيارة على الخريطة التفاعلية' : 'Pick Location on Map'}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {isAr ? 'انقر على الحي المطلوب أو حرّك الدبوس لتثبيت موقعك بدقة' : 'Click a district or move pin'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMapModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Search Bar */}
            <div className="p-3 bg-black/60 border-b border-white/10">
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAr ? 'ابحث عن اسم الحي في جدة (مثال: الروضة، أبحر، الصفا...)' : 'Search district in Jeddah...'}
                  className="w-full bg-neutral-800/80 border border-white/10 rounded-xl pr-10 pl-4 py-2 text-xs sm:text-sm text-white focus:border-brand-red focus:outline-none transition-all placeholder:text-gray-500 text-right"
                />
              </div>

              {/* Filtered suggestions */}
              {searchQuery.trim() && (
                <div className="mt-2 flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {POPULAR_JEDDAH_DISTRICTS.filter(d => 
                    d.nameAr.includes(searchQuery) || d.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
                  ).map(d => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => {
                        setTempCoords({ latitude: d.lat, longitude: d.lng });
                        setTempAddress(`جدة - ${d.nameAr}`);
                        setSearchQuery('');
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs bg-brand-red/20 hover:bg-brand-red text-white border border-brand-red/30 transition-all"
                    >
                      {d.nameAr}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Map Visual Area */}
            <div className="relative flex-1 min-h-[260px] sm:min-h-[320px] bg-neutral-950 overflow-hidden flex flex-col items-center justify-center">
              {/* Jeddah City Visual Map Canvas / Grid representation */}
              <div 
                className="w-full h-full relative cursor-crosshair select-none overflow-hidden"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.05) 0%, transparent 80%),
                    linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
                  `,
                  backgroundSize: '100% 100%, 30px 30px, 30px 30px'
                }}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const xRatio = (e.clientX - rect.left) / rect.width;
                  const yRatio = (e.clientY - rect.top) / rect.height;

                  // Interpolate around Jeddah Lat (21.30 to 21.85), Lng (39.10 to 39.28)
                  const newLat = 21.85 - (yRatio * 0.55);
                  const newLng = 39.10 + (xRatio * 0.18);
                  setTempCoords({ latitude: Number(newLat.toFixed(4)), longitude: Number(newLng.toFixed(4)) });

                  // Find nearest district
                  let nearest = POPULAR_JEDDAH_DISTRICTS[0];
                  let minDistance = 999;
                  POPULAR_JEDDAH_DISTRICTS.forEach(d => {
                    const dist = calculateDistanceKm(newLat, newLng, d.lat, d.lng);
                    if (dist < minDistance) {
                      minDistance = dist;
                      nearest = d;
                    }
                  });
                  setTempAddress(`جدة - ${nearest.nameAr}`);
                }}
              >
                {/* Visual Jeddah Coastline & Red Sea Indicator (Left Side) */}
                <div className="absolute top-0 bottom-0 left-0 w-16 sm:w-24 bg-gradient-to-r from-blue-950/40 to-transparent pointer-events-none flex items-center justify-center">
                  <span className="text-[10px] text-blue-400/50 uppercase tracking-widest -rotate-90 select-none">
                    البحر الأحمر • Red Sea
                  </span>
                </div>

                {/* Workshop Base Pin (Main Branch) */}
                <div 
                  className="absolute p-1.5 rounded-full bg-brand-red/30 border border-brand-red text-white flex items-center justify-center -translate-x-1/2 -translate-y-1/2 shadow-lg pointer-events-none"
                  style={{ top: '48%', left: '46%' }}
                  title="ورشة DR.FIX المركزية"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-brand-red animate-ping" />
                  <span className="absolute -bottom-5 text-[9px] font-bold text-brand-red bg-black/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                    ورشة DR.FIX
                  </span>
                </div>

                {/* District Hotspots */}
                {POPULAR_JEDDAH_DISTRICTS.slice(0, 12).map((d) => {
                  // Map lat/lng to percentage in container
                  const topPercent = Math.max(10, Math.min(90, ((21.85 - d.lat) / 0.55) * 100));
                  const leftPercent = Math.max(15, Math.min(85, ((d.lng - 39.10) / 0.18) * 100));
                  const isSelected = tempAddress.includes(d.nameAr);

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setTempCoords({ latitude: d.lat, longitude: d.lng });
                        setTempAddress(`جدة - ${d.nameAr}`);
                      }}
                      style={{ top: `${topPercent}%`, left: `${leftPercent}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-md cursor-pointer ${
                        isSelected 
                          ? 'bg-brand-red text-white scale-110 z-20 shadow-brand-red/40 border border-white/40' 
                          : 'bg-black/70 hover:bg-neutral-800 text-gray-300 border border-white/10 z-10'
                      }`}
                    >
                      <MapPin className="w-2.5 h-2.5 text-brand-red shrink-0" />
                      <span>{d.nameAr.replace('حي ', '')}</span>
                    </button>
                  );
                })}

                {/* Selected Active Pin Marker */}
                <div 
                  className="absolute -translate-x-1/2 -translate-y-full z-30 pointer-events-none flex flex-col items-center transition-all duration-200"
                  style={{ 
                    top: `${Math.max(15, Math.min(85, ((21.85 - tempCoords.latitude) / 0.55) * 100))}%`, 
                    left: `${Math.max(20, Math.min(85, ((tempCoords.longitude - 39.10) / 0.18) * 100))}%` 
                  }}
                >
                  <div className="bg-emerald-500 text-white text-[11px] font-black px-2 py-0.5 rounded-md shadow-lg flex items-center gap-1 whitespace-nowrap mb-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>موقع سيارتك</span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-emerald-500/50">
                    <MapPin className="w-4 h-4 fill-white" />
                  </div>
                  <div className="w-2 h-2 bg-emerald-500 rotate-45 -mt-1" />
                </div>
              </div>

              {/* Bottom Info Bar inside Map */}
              <div className="w-full bg-neutral-900/90 border-t border-white/10 p-3 sm:p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-right">
                <div className="space-y-0.5 w-full sm:w-auto">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{tempAddress}</span>
                  </div>
                  <div className="text-[11px] text-gray-400 font-mono">
                    GPS: {tempCoords.latitude.toFixed(4)}, {tempCoords.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setIsMapModalOpen(false)}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold transition-all cursor-pointer"
                  >
                    {isAr ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSetCoords(tempCoords);
                      onSetLocationName(tempAddress);
                      setIsMapModalOpen(false);
                    }}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-brand-red hover:bg-red-700 text-white text-xs font-bold transition-all shadow-lg shadow-brand-red/30 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isAr ? 'تثبيت هذا الموقع' : 'Confirm Location'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SERVICE RANGE & DELIVERY ZONES MODAL */}
      {/* ========================================================================= */}
      <ServiceRangeModal
        isOpen={isRangeModalOpen}
        onClose={() => setIsRangeModalOpen(false)}
        initialCoords={coords}
        onSelectZoneFee={(fee, zoneName) => {
          // If customer picks a district inside range modal, close and notify
          setIsRangeModalOpen(false);
        }}
      />
    </div>
  );
};
