export type TranslationFailure = {
  message: string
  code: string
}

export type TranslationHandlers = {
  onAudio: (pcm: Buffer) => void
  onOutputTranscript: (delta: string, done: boolean, transcript?: string) => void
  onInputTranscript: (delta: string, done: boolean, transcript?: string) => void
  onError: (failure: TranslationFailure) => void
  onClosed: () => void
}

export interface Translator {
  append(pcm: Buffer): void
  setTranscribe(on: boolean): void
  close(): void
}

export type OpenTranslator = (
  language: string,
  transcribe: boolean,
  safetyId: string,
  handlers: TranslationHandlers,
) => Translator
