export type CaptionState = {
  current: string
  lines: string[]
  updatedAt: number
}

export const emptyCaptions: CaptionState = { current: "", lines: [], updatedAt: 0 }

export const PAUSE_MS = 1100
const MAX_LINES = 80

function pushLine(lines: string[], text: string) {
  const line = text.replace(/\s+/g, " ").trim()
  if (!line) return lines
  if (lines[lines.length - 1] === line) return lines
  return [...lines, line].slice(-MAX_LINES)
}

export function splitPhrases(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim()
  if (!cleaned) return []
  const parts = cleaned
    .split(/(?<=[.?!…])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length > 0 ? parts : [cleaned]
}

function commit(lines: string[], text: string) {
  let next = lines
  for (const phrase of splitPhrases(text)) next = pushLine(next, phrase)
  return next
}

export function commitIdle(prev: CaptionState, now = Date.now()): CaptionState {
  if (!prev.current || prev.updatedAt === 0 || now - prev.updatedAt < PAUSE_MS) return prev
  return { current: "", lines: commit(prev.lines, prev.current), updatedAt: now }
}

export function reduceCaption(
  prev: CaptionState,
  update: { delta?: string; done?: boolean; reset?: boolean; snapshot?: boolean; transcript?: string },
  now = Date.now(),
): CaptionState {
  if (update.snapshot) {
    const text = (update.transcript || "").replace(/\s+/g, " ").trim()
    const shown = [...prev.lines, prev.current].join(" ").replace(/\s+/g, " ").trim()
    if (!text || text.length <= shown.length) return prev
    return { current: "", lines: commit([], text), updatedAt: now }
  }
  if (update.reset) return emptyCaptions
  if (update.done) {
    return { current: "", lines: commit(prev.lines, update.transcript || prev.current), updatedAt: now }
  }

  const delta = update.delta ?? ""
  if (!delta) return prev

  let lines = prev.lines
  let current = prev.current
  if (current && prev.updatedAt > 0 && now - prev.updatedAt >= PAUSE_MS) {
    lines = commit(lines, current)
    current = ""
  }

  current += delta
  const phrases = splitPhrases(current)
  if (phrases.length > 1 && /[.?!…]\s+$/.test(current)) {
    for (const phrase of phrases) lines = pushLine(lines, phrase)
    current = ""
  } else if (phrases.length > 1) {
    for (const phrase of phrases.slice(0, -1)) lines = pushLine(lines, phrase)
    current = phrases[phrases.length - 1] ?? ""
  }

  return { current, lines, updatedAt: now }
}
