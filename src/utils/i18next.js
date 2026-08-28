import i18next from "i18next"
import detector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"
import en from "../constants/en.json" with { type: "json" }
import zh from "../constants/zh.json" with { type: "json" }

i18next
  .use(detector)
  .use(initReactI18next)
  .init({
    resources: {
      "en-US": { translation: en },
      "zh-CN": { translation: zh }
    },
    fallbackLng: "en-US",
    detection: {
      order: ["navigator"]
    }
  })

export default i18next
