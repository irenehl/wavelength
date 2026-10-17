export type CaptionState = {
  current: string
  lines: string[]
}

export const emptyCaptions: CaptionState = { current: "", lines: [] }

export function reduceCaption(
  prev: CaptionState,
  update: { delta?: string; done?: boolean; reset?: boolean; transcript?: string },
): CaptionState {
  if (update.reset) return emptyCaptions
  if (update.done) {
    const text = (update.transcript || prev.current).trim()
    if (!text) return { current: "", lines: prev.lines }
    if (prev.lines[prev.lines.length - 1] === text) return { current: "", lines: prev.lines }
    return { current: "", lines: [...prev.lines, text].slice(-12) }
  }
  return { current: prev.current + (update.delta ?? ""), lines: prev.lines }
}
