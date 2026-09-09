import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MapPin, 
  ExternalLink, 
  Phone, 
  MessageCircle, 
  Search, 
  Star, 
  ShieldCheck, 
  Tag, 
  Clock, 
  Sparkles,
  Handshake,
  CheckCircle2,
  Filter,
  ArrowRight,
  Store,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Partner } from '../types';

interface PartnersPageProps {
  partners: Partner[];
  settings?: any;
  onSelectPartnerForBooking?: (partner: Partner) => void;
}

export const PartnersPage: React.FC<PartnersPageProps> = ({ 
  partners, 
  settings,
  onSelectPartnerForBooking 
}) => {
  const navigate = useNavigate();

  // If partners section is hidden by admin, redirect to home
  if (settings && settings.showPartners === false) {
    return <Navigate to="/" replace />;
  }

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    partners.forEach(p => {
      if (p.category && p.category.trim()) {
        cats.add(p.category.trim());
      }
    });
    return Array.from(cats);
  }, [partners]);

  // Filter partners
  const filteredPartners = useMemo(() => {
    return partners.filter(p => {
      if (p.isActive === false) return false;
      
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.address && p.address.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [partners, selectedCategory, searchQuery]);

  const handleBookWithPartner = (partner: Partner) => {
    if (onSelectPartnerForBooking) {
      onSelectPartnerForBooking(partner);
    }
    navigate('/booking');
  };

  const whatsappSupportNumber = (settings?.whatsapp || '966546870807').replace(/[^0-9]/g, '');

  return (
    <div className="min-h-[auto] sm:min-h-screen bg-brand-black text-white pt-4 sm:pt-10 md:pt-12 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 selection:bg-brand-red selection:text-white">
      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-0 w-[500px] h-[500px] bg-brand-red/5 rounded-full blur-[140px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10 space-y-12">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 font-mono">
          <Link to="/" className="hover:text-brand-red transition-colors">الرئيسية</Link>
          <ChevronRight className="w-3.5 h-3.5 text-gray-600 rotate-180" />
          <span className="text-white font-bold">شركاء النجاح</span>
        </div>

        {/* Page Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-red/10 border border-brand-red/20 text-brand-red text-xs sm:text-sm font-bold tracking-wide shadow-sm"
          >
            <Handshake className="w-4 h-4" />
            <span>شبكة ورش ومراكز معتمدة لدى Dr.Fix</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-5xl font-black font-display tracking-tight text-white"
          >
            شركاء <span className="text-brand-red">النجاح</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm sm:text-base text-gray-400 leading-relaxed max-w-2xl mx-auto"
          >
            نخبة من الورش المتميزة ومحلات قطع الغيار المعتمدة في جدة، تعمل بتكامل تام مع فريق Dr.Fix لتوفير حلول صيانة شاملة، وخصومات حصرية لعملائنا الكرام.
          </motion.p>
        </div>

        {/* Controls: Search & Category Filters */}
        <div className="space-y-4 max-w-4xl mx-auto">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الورشة، الحي، أو نوع الخدمة (مثل: ميكانيكا، توضيب، تكييف، سمكرة)..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl pr-12 pl-4 py-3.5 text-sm sm:text-base text-white placeholder-gray-500 focus:outline-none focus:border-brand-red focus:ring-1 focus:ring-brand-red transition-all shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-white bg-white/10 px-2 py-1 rounded-md"
              >
                مسح
              </button>
            )}
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedCategory === 'all'
                  ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 scale-[1.02]'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>الكل ({partners.filter(p => p.isActive !== false).length})</span>
            </button>

            {categories.map(cat => {
              const count = partners.filter(p => p.isActive !== false && p.category === cat).length;
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20 scale-[1.02]'
                      : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Partners Grid */}
        {filteredPartners.length === 0 ? (
          <div className="text-center py-16 bg-white/[0.02] border border-white/5 rounded-3xl p-8 max-w-md mx-auto space-y-4">
            <Store className="w-12 h-12 text-gray-500 mx-auto" />
            <h3 className="text-lg font-bold text-white">لم يتم العثور على شركاء</h3>
            <p className="text-xs sm:text-sm text-gray-400">
              لا توجد نتائج تطابق بحثك حالياً. يمكنك تجربة كلمات بحث أخرى أو عرض كل التخصصات.
            </p>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-brand-red text-white text-xs font-bold rounded-xl hover:bg-brand-red/90 transition-all"
            >
              إعادة ضبط البحث
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            <AnimatePresence>
              {filteredPartners.map((partner, idx) => (
                <motion.div
                  key={partner.id || idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-neutral-900/80 border border-white/10 hover:border-brand-red/40 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-brand-red/5 transition-all flex flex-col group"
                >
                  {/* Image Container with Badges */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
                    <img
                      src={partner.imageUrl || '/hero-custom.jpg'}
                      alt={partner.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                    {/* Category Badge */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-bold text-white">
                      <Store className="w-3 h-3 text-brand-red" />
                      <span>{partner.category || 'صيانة عامة'}</span>
                    </div>

                    {/* Rating / Verified Badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-brand-red/20 backdrop-blur-md border border-brand-red/30 text-[11px] font-black text-white">
                      <Star className="w-3 h-3 fill-brand-red text-brand-red" />
                      <span>{partner.rating ? partner.rating.toFixed(1) : '4.9'}</span>
                    </div>

                    {/* Dr.Fix Partner Tag */}
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-brand-red/90 text-white text-[10px] font-mono font-black uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" />
                      <span>شريك معتمد</span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <h3 className="text-lg sm:text-xl font-bold text-white group-hover:text-brand-red transition-colors leading-snug">
                        {partner.name}
                      </h3>

                      {partner.description && (
                        <p className="text-xs sm:text-sm text-gray-400 line-clamp-3 leading-relaxed">
                          {partner.description}
                        </p>
                      )}

                      {/* Location / Address */}
                      <div className="flex items-start gap-2 text-xs text-gray-300">
                        <MapPin className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                        <span>{partner.address || 'جدة'}</span>
                      </div>

                      {/* Working Hours if available */}
                      {partner.workingHours && (
                        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                          <Clock className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                          <span>{partner.workingHours}</span>
                        </div>
                      )}

                      {/* Discount Perk for Dr.Fix customers */}
                      {partner.discountRate && (
                        <div className="p-2.5 rounded-xl bg-brand-red/10 border border-brand-red/25 flex items-center gap-2 text-xs font-bold text-brand-red">
                          <Tag className="w-4 h-4 shrink-0" />
                          <span>{partner.discountRate}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-white/5 space-y-2">
                      {/* Location on Maps Button */}
                      {partner.locationUrl && (
                        <a
                          href={partner.locationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs sm:text-sm font-bold text-white flex items-center justify-center gap-2 transition-all hover:border-brand-red/40 group/btn"
                        >
                          <MapPin className="w-4 h-4 text-brand-red group-hover/btn:scale-110 transition-transform" />
                          <span>الموقع على خرائط جوجل</span>
                          <ExternalLink className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-white" />
                        </a>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        {/* Call Button */}
                        {partner.phone ? (
                          <a
                            href={`tel:${partner.phone}`}
                            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          >
                            <Phone className="w-3.5 h-3.5 text-brand-red" />
                            <span>اتصال</span>
                          </a>
                        ) : null}

                        {/* WhatsApp Button */}
                        {partner.whatsapp ? (
                          <a
                            href={`https://wa.me/${partner.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-2.5 px-3 rounded-xl bg-white/5 hover:bg-brand-red hover:text-white border border-white/10 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 group"
                          >
                            <MessageCircle className="w-3.5 h-3.5 text-brand-red group-hover:text-white transition-colors" />
                            <span>واتساب</span>
                          </a>
                        ) : null}
                      </div>

                      {/* Request service with this partner via Dr.Fix */}
                      <button
                        onClick={() => handleBookWithPartner(partner)}
                        className="w-full py-2.5 px-4 rounded-xl bg-brand-red hover:bg-brand-red/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-red/20 active:scale-98 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>طلب فحص / صيانة عن طريق Dr.Fix</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Partnership Call to Action Banner */}
        <div className="mt-16 bg-gradient-to-br from-neutral-900 via-neutral-900 to-black border border-brand-red/20 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-red to-transparent" />
          <div className="max-w-3xl mx-auto text-center space-y-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-brand-red/10 border border-brand-red/30 flex items-center justify-center mx-auto text-brand-red shadow-inner">
              <Handshake className="w-7 h-7" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
              هل تمتلك ورشة أو محل قطع غيار سيارات في جدة؟
            </h2>

            <p className="text-xs sm:text-base text-gray-300 leading-relaxed max-w-xl mx-auto">
              انضم إلى شبكة شركاء نجاح Dr.Fix المعتمدة، واحصل على تدفق مستمر للعملاء وطلبات الصيانة مع توثيق اسم ورشتك وموقعك على منصتنا.
            </p>

            <div className="pt-2 flex flex-wrap justify-center gap-3 sm:gap-4">
              <a
                href={`https://api.whatsapp.com/send?phone=${whatsappSupportNumber}&text=${encodeURIComponent('السلام عليكم، أرغب في الانضمام إلى شبكة شركاء نجاح Dr.Fix مع ورشتي / متجري')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-2xl bg-brand-red hover:bg-red-700 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-brand-red/25 transition-all active:scale-95"
              >
                <MessageCircle className="w-4 h-4" />
                <span>قدم طلب الانضمام عبر واتساب</span>
              </a>

              <a
                href={`tel:${settings?.phone || '0546870807'}`}
                className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
              >
                <Phone className="w-4 h-4 text-brand-red" />
                <span>الاتصال بالإدارة</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnersPage;
