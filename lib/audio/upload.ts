import { PCM_RATE } from "@/lib/audio/pcm"

export const BYTES_PER_MS = (PCM_RATE * 2) / 1000
const MIN_BATCH_MS = 160
const MAX_BATCH_MS = 400
const MAX_QUEUE_MS = 1500

export function batchBytes(rttMs: number) {
  const ms = Math.min(MAX_BATCH_MS, Math.max(MIN_BATCH_MS, Math.round(rttMs + 50)))
  return Math.round(ms * BYTES_PER_MS)
}

export function queueBytes(chunks: Uint8Array[]) {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
}

export function trimQueue(chunks: Uint8Array[], maxBytes = Math.round(MAX_QUEUE_MS * BYTES_PER_MS)) {
  let total = queueBytes(chunks)
  while (total > maxBytes && chunks.length > 1) {
    total -= chunks[0]!.byteLength
    chunks.shift()
  }
}

export function takeBatch(chunks: Uint8Array[], size: number) {
  if (chunks.length === 0) return null
  const picked: Uint8Array[] = []
  let total = 0
  while (chunks.length && total < size) {
    const next = chunks.shift()
    if (!next) break
    picked.push(next)
    total += next.byteLength
  }
  return concatBytes(picked)
}

export function concatBytes(chunks: Uint8Array[]) {
  const bytes = new Uint8Array(queueBytes(chunks))
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}
