import { PCM_RATE } from "@/lib/audio/pcm"

const MAX_QUEUE_MS = 2000
const MAX_QUEUE_BYTES = PCM_RATE * 2 * (MAX_QUEUE_MS / 1000)

export function queueBytes(chunks: Uint8Array[]) {
  return chunks.reduce((total, chunk) => total + chunk.byteLength, 0)
}

export function trimQueue(chunks: Uint8Array[], maxBytes = MAX_QUEUE_BYTES) {
  let total = queueBytes(chunks)
  while (total > maxBytes && chunks.length > 1) {
    total -= chunks[0]!.byteLength
    chunks.shift()
  }
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

export function drainAll(chunks: Uint8Array[]) {
  if (chunks.length === 0) return null
  return concatBytes(chunks.splice(0, chunks.length))
}
