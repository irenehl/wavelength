export const PCM_RATE = 24_000

export function bytesToInt16(pcm: ArrayBuffer): Int16Array | null {
  if (pcm.byteLength < 2) return null
  const even = pcm.byteLength & ~1
  return new Int16Array(pcm, 0, even / 2)
}

export function decodeBase64Pcm(data: string): ArrayBuffer | null {
  try {
    const binary = atob(data)
    const bytes = new Uint8Array(binary.length)
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
    return bytes.buffer
  } catch {
    return null
  }
}

export function int16ToFloatBuffer(context: AudioContext, samples: Int16Array, sourceRate = PCM_RATE) {
  const rate = context.sampleRate
  if (Math.abs(rate - sourceRate) < 1) {
    const buffer = context.createBuffer(1, samples.length, rate)
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < samples.length; index += 1) channel[index] = (samples[index] ?? 0) / 32768
    return buffer
  }

  const duration = samples.length / sourceRate
  const outLength = Math.max(1, Math.round(duration * rate))
  const buffer = context.createBuffer(1, outLength, rate)
  const channel = buffer.getChannelData(0)
  const ratio = samples.length / outLength
  for (let index = 0; index < outLength; index += 1) {
    const source = index * ratio
    const left = Math.floor(source)
    const right = Math.min(samples.length - 1, left + 1)
    const mix = source - left
    const a = (samples[left] ?? 0) / 32768
    const b = (samples[right] ?? 0) / 32768
    channel[index] = a + (b - a) * mix
  }
  return buffer
}
