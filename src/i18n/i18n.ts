import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en.json';
import am from './am.json';

const savedLanguage = localStorage.getItem('esrom_lang') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      am: { translation: am }
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false // react already safes from xss
    }
  });

// Handle document direction or language change side effects
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('esrom_lang', lng);
  document.documentElement.lang = lng;
});

export default i18n;
