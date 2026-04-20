import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { translations } from './translations';

const LANG_KEY = 'portal_lang';
const DEFAULT_LANGUAGE = 'ru';

const I18nContext = createContext(null);

const getByPath = (obj, path) => path.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), obj);

export const I18nProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(LANG_KEY);
    return saved === 'en' || saved === 'ru' ? saved : DEFAULT_LANGUAGE;
  });

  useEffect(() => {
    localStorage.setItem(LANG_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => {
    return (key, fallback) => {
      return (
        getByPath(translations[language], key)
        ?? getByPath(translations[DEFAULT_LANGUAGE], key)
        ?? fallback
        ?? key
      );
    };
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

