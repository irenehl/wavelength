export const OUTPUT_LANGUAGES = [
  { code: "en", es: "Inglés", en: "English" },
  { code: "es", es: "Español", en: "Spanish" },
  { code: "pt", es: "Portugués", en: "Portuguese" },
  { code: "fr", es: "Francés", en: "French" },
  { code: "de", es: "Alemán", en: "German" },
  { code: "it", es: "Italiano", en: "Italian" },
  { code: "ru", es: "Ruso", en: "Russian" },
  { code: "zh", es: "Chino", en: "Chinese" },
  { code: "ja", es: "Japonés", en: "Japanese" },
  { code: "ko", es: "Coreano", en: "Korean" },
  { code: "hi", es: "Hindi", en: "Hindi" },
  { code: "id", es: "Indonesio", en: "Indonesian" },
  { code: "vi", es: "Vietnamita", en: "Vietnamese" },
] as const

export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number]["code"]

export function isOutputLanguage(value: string): value is OutputLanguage {
  return OUTPUT_LANGUAGES.some((language) => language.code === value)
}

export function languageLabel(code: string, locale: "es" | "en" = "es"): string {
  const language = OUTPUT_LANGUAGES.find((item) => item.code === code)
  if (!language) return code
  return language[locale]
}

export function languageInPhrase(code: string, locale: "es" | "en"): string {
  const label = languageLabel(code, locale)
  return locale === "es" ? label.toLowerCase() : label
}
