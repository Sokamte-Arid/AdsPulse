import React, { createContext, useContext, useState, useCallback } from 'react';
import en from '../locales/en.json';
import fr from '../locales/fr.json';

const LOCALES = { en, fr };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(
    () => localStorage.getItem('adspulse_lang') || 'en'
  );

  const toggleLanguage = useCallback(() => {
    setLanguage(prev => {
      const next = prev === 'en' ? 'fr' : 'en';
      localStorage.setItem('adspulse_lang', next);
      return next;
    });
  }, []);

  const setLang = useCallback((lang) => {
    localStorage.setItem('adspulse_lang', lang);
    setLanguage(lang);
  }, []);

  // t('some.nested.key') or t('flat_key')
  const t = useCallback((key, vars = {}) => {
    const parts  = key.split('.');
    const locale = LOCALES[language] || LOCALES.en;
    let result   = locale;

    for (const part of parts) {
      if (result == null) break;
      result = result[part];
    }

    // Fallback to English if key missing in current locale
    if (result == null) {
      result = LOCALES.en;
      for (const part of parts) {
        if (result == null) break;
        result = result[part];
      }
    }

    // Final fallback: show the key itself
    if (typeof result !== 'string') return key;

    // Variable substitution: t('hello', { name: 'Arid' }) with "Hello {{name}}"
    return result.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, t, toggleLanguage, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
