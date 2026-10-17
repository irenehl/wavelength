export const OUTPUT_LANGUAGES = [
  { code: "en", label: "Inglés" },
  { code: "es", label: "Español" },
  { code: "pt", label: "Portugués" },
  { code: "fr", label: "Francés" },
  { code: "de", label: "Alemán" },
  { code: "it", label: "Italiano" },
  { code: "ru", label: "Ruso" },
  { code: "zh", label: "Chino" },
  { code: "ja", label: "Japonés" },
  { code: "ko", label: "Coreano" },
  { code: "hi", label: "Hindi" },
  { code: "id", label: "Indonesio" },
  { code: "vi", label: "Vietnamita" },
] as const

export type OutputLanguage = (typeof OUTPUT_LANGUAGES)[number]["code"]

export function isOutputLanguage(value: string): value is OutputLanguage {
  return OUTPUT_LANGUAGES.some((language) => language.code === value)
}

export function languageLabel(code: string): string {
  return OUTPUT_LANGUAGES.find((language) => language.code === code)?.label ?? code
}
