export type ListenerSeat = {
  language: string | null
  listening: boolean
}

export function languagesNeeded(input: {
  micLive: boolean
  speakerConnected: boolean
  listeners: ListenerSeat[]
}): string[] {
  if (!input.micLive || !input.speakerConnected) return []
  const languages = new Set<string>()
  for (const listener of input.listeners) {
    if (listener.listening && listener.language) languages.add(listener.language)
  }
  return [...languages].sort()
}

export function pickTranscriber(languages: string[], current: string | null): string | null {
  if (languages.length === 0) return null
  if (current && languages.includes(current)) return current
  return languages[0] ?? null
}
