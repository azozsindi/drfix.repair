import React, { useState, useEffect, createContext, useContext } from 'react';
import { translations } from '../translations';
import { cn } from '../lib/utils';
import { Globe } from 'lucide-react';

export type Language = 'ar' | 'en';

export interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: any;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      lang: 'ar' as Language,
      setLang: () => {},
      t: translations.ar
    };
  }
  return context;
};

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('drfix_lang') as Language;
      return saved === 'en' || saved === 'ar' ? saved : 'ar';
    } catch {
      return 'ar';
    }
  });

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      localStorage.setItem('drfix_lang', newLang);
    } catch {}
  };

  const t = translations[lang] || translations.ar;

  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const LanguageToggle = ({ className }: { className?: string }) => {
  const { lang, setLang } = useLanguage();
  return (
    <button
      type="button"
      onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
      className={cn(
        "px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-brand-red/40 text-xs font-bold transition-all flex items-center gap-2 text-white cursor-pointer group shadow-sm shrink-0",
        className
      )}
      title={lang === 'ar' ? "Switch to English" : "التحويل للغة العربية"}
      aria-label={lang === 'ar' ? "Switch to English" : "التحويل للغة العربية"}
    >
      <Globe className="w-3.5 h-3.5 text-brand-red group-hover:rotate-45 transition-transform duration-300" />
      <span className="font-sans font-semibold text-[11px] uppercase tracking-wider">
        {lang === 'ar' ? 'English' : 'عربي'}
      </span>
    </button>
  );
};
