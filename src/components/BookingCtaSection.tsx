import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  ShieldCheck, 
  ArrowLeft, 
  ArrowRight,
  Clock,
  Sparkles,
  MessageCircle
} from 'lucide-react';

interface BookingCtaSectionProps {
  lang?: 'ar' | 'en';
  whatsapp?: string;
}

export const BookingCtaSection: React.FC<BookingCtaSectionProps> = ({ 
  lang = 'ar',
  whatsapp = '966546870807'
}) => {
  const navigate = useNavigate();
  const isAr = lang === 'ar';
  const cleanWhatsapp = (whatsapp || '966546870807').replace(/\+/g, '').replace(/[^0-9]/g, '');

  const handleGoToBooking = () => {
    navigate('/booking');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section id="booking" className="py-12 sm:py-16 md:py-24 relative overflow-hidden" dir={isAr ? 'rtl' : 'ltr'}>
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 sm:w-[600px] h-96 sm:h-[600px] bg-brand-red/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="glass-card p-4 sm:p-8 md:p-12 border border-brand-red/30 rounded-2xl sm:rounded-3xl shadow-2xl relative overflow-hidden bg-gradient-to-b from-black/80 via-black/90 to-black/95"
        >
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-brand-red via-red-500 to-brand-red" />

          {/* Badge */}
          <div className="flex justify-center mb-5 sm:mb-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-red/15 border border-brand-red/30 text-brand-red text-xs sm:text-sm font-bold shadow-inner">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-brand-red animate-pulse shrink-0" />
              <span>{isAr ? 'خدمة ميكانيكي متنقل في جدة 🚗⚡' : 'Mobile Mechanic Service in Jeddah 🚗⚡'}</span>
            </span>
          </div>

          {/* Heading */}
          <div className="text-center max-w-2xl mx-auto space-y-2.5 sm:space-y-3 mb-6 sm:mb-10">
            <h2 className="text-xl sm:text-3xl md:text-4xl font-display font-black text-white italic tracking-tight">
              {isAr ? (
                <>
                  احجز موعد صيانتك المتنقلة الآن <span className="text-brand-red">بكبسة زر</span>
                </>
              ) : (
                <>
                  Book Your Mobile Service <span className="text-brand-red">in One Click</span>
                </>
              )}
            </h2>
            <p className="text-xs sm:text-base text-gray-300 leading-relaxed">
              {isAr 
                ? 'فريق DR.FIX الميكانيكي المتنقل يصل مباشرة إلى موقع سيارتك (المنزل، العمل، أو على الطريق) مجهزاً بأحدث أجهزة الفحص والكمبيوتر مع ضمان معتمد.'
                : 'DR.FIX mobile mechanics arrive directly at your location (home, office, or roadside) fully equipped with certified diagnostic tools.'}
            </p>
          </div>

          {/* 3 Features Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-10">
            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-brand-red/40 transition-all text-center flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {isAr ? 'نصلك لأي حي بجدة' : 'Anywhere in Jeddah'}
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-400">
                {isAr ? 'خدمة متنقلة عند باب بيتك أو عملك' : 'Door-to-door mobile service'}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-brand-red/40 transition-all text-center flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {isAr ? 'حجز سريع ومباشر' : 'Instant Easy Booking'}
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-400">
                {isAr ? 'تأكيد فوري لموعدك وموقع سيارتك بدقيقة واحدة' : 'Confirm your appointment and location in 60 seconds'}
              </p>
            </div>

            <div className="p-3.5 sm:p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-brand-red/40 transition-all text-center flex flex-col items-center gap-1.5 sm:gap-2">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand-red/15 border border-brand-red/30 flex items-center justify-center text-brand-red shrink-0">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <h4 className="text-xs sm:text-sm font-bold text-white">
                {isAr ? 'ضمان معتمد 3 أشهر' : '3-Month Warranty'}
              </h4>
              <p className="text-[11px] sm:text-xs text-gray-400">
                {isAr ? 'فحص كمبيوتر وتقرير إلكتروني موثق' : 'Certified diagnostics & digital report'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={handleGoToBooking}
              className="w-full sm:w-auto px-6 sm:px-8 py-3.5 sm:py-4 bg-brand-red hover:bg-red-700 text-white rounded-xl sm:rounded-2xl font-bold text-sm sm:text-base md:text-lg flex items-center justify-center gap-2.5 sm:gap-3 shadow-xl shadow-brand-red/30 hover:shadow-brand-red/50 transition-all cursor-pointer active:scale-95 group"
            >
              <Calendar className="w-5 h-5 shrink-0" />
              <span>{isAr ? 'احجز موعد صيانتك الآن' : 'Book Your Service Now'}</span>
              {isAr ? (
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform shrink-0" />
              ) : (
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform shrink-0" />
              )}
            </button>

            <a
              href={`https://api.whatsapp.com/send?phone=${cleanWhatsapp}&text=${encodeURIComponent(isAr ? 'السلام عليكم، أود الاستفسار عن حجز صيانة متنقلة لسيارتي' : 'Hello, I want to inquire about mobile car service')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-5 sm:px-6 py-3.5 sm:py-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 hover:border-emerald-500/50 text-emerald-400 hover:text-emerald-300 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
              <span>{isAr ? 'تواصل فوري عبر واتساب 💬' : 'Chat on WhatsApp 💬'}</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
