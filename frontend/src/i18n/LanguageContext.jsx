// src/i18n/LanguageContext.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DICTIONARIES, LANGUAGES } from './dictionaries';

const STORAGE_KEY = 'layagexpres_language';
const DEFAULT_LANGUAGE = 'en';
const LanguageContext = createContext(null);

const readLanguage = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return DICTIONARIES[stored] ? stored : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(readLanguage);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      /* storage unavailable — keep in-memory */
    }
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => {
    const dictionary = DICTIONARIES[language] ?? DICTIONARIES[DEFAULT_LANGUAGE];
    const fallback = DICTIONARIES[DEFAULT_LANGUAGE];
    return {
      language,
      setLanguage,
      languages: LANGUAGES,
      t: (key) => dictionary[key] ?? fallback[key] ?? key,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside a LanguageProvider');
  return context;
}
