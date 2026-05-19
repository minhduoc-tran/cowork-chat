import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import { en } from "./en"
import { vi } from "./vi"

const LANGUAGE_KEY = "cowork-chat-language"

const savedLanguage = localStorage.getItem(LANGUAGE_KEY) || "vi"

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: "vi",
  interpolation: {
    escapeValue: false,
  },
})

i18n.on("languageChanged", (lng) => {
  localStorage.setItem(LANGUAGE_KEY, lng)
})

export default i18n
