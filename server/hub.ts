import { EventHub } from "./rooms"
import { openTranslation } from "./translate"

const globalForHub = globalThis as typeof globalThis & { __wavelengthHub?: EventHub }

export function apiKey(): string {
  return process.env.OPENAI_API_KEY?.trim() || ""
}

export function getHub(): EventHub {
  if (!globalForHub.__wavelengthHub) {
    const key = apiKey()
    globalForHub.__wavelengthHub = new EventHub({
      apiKeyConfigured: key.length > 0,
      openTranslator: (language, transcribe, safetyId, handlers) =>
        openTranslation({ apiKey: key, language, transcribe, safetyId, ...handlers }),
    })
  }
  return globalForHub.__wavelengthHub
}
