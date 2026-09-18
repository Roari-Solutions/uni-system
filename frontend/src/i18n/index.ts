import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import ar from "./locales/ar.json";

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: en,
      },
      ar: {
        translation: ar,
      },
    },

    lng: "ar",
    fallbackLng: "ar",

    interpolation: {
      escapeValue: false,
    },
  });

/** Direction and lang are document-level, so they follow the language globally. */
const syncDocumentDirection = (language: string) => {
	document.documentElement.dir = i18n.dir(language);
	document.documentElement.lang = language;
};

syncDocumentDirection(i18n.language);
i18n.on("languageChanged", syncDocumentDirection);

export default i18n;
