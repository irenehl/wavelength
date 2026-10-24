import { bytesToInt16, int16ToFloatBuffer, PCM_RATE } from "@/lib/audio/pcm"

const PRIME_S = 0.08
const MAX_AHEAD_S = 0.45
const MAX_PENDING = 40

type AudioContextCtor = typeof AudioContext

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined
  const fromWindow = window.AudioContext
  const fromWebkit = (window as Window & { webkitAudioContext?: AudioContextCtor }).webkitAudioContext
  return fromWindow || fromWebkit
}

export class PcmPlayer {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private nextTime = 0
  private primed = false
  private sources: AudioBufferSourceNode[] = []
  private volume = 1
  private pending: Int16Array[] = []
  private unlocked = false
  private listeners = new Set<(ready: boolean) => void>()

  subscribe(listener: (ready: boolean) => void) {
    this.listeners.add(listener)
    listener(this.ready)
    return () => {
      this.listeners.delete(listener)
    }
  }

  get ready() {
    return this.unlocked && this.context?.state === "running"
  }

  get didUnlock() {
    return this.unlocked
  }

  async resume() {
    const Ctor = audioContextCtor()
    if (!Ctor) return
    if (!this.context) {
      this.context = new Ctor({ latencyHint: "interactive" })
      this.gain = this.context.createGain()
      this.gain.gain.value = this.volume
      this.gain.connect(this.context.destination)
      this.context.addEventListener("statechange", () => {
        if (this.context?.state === "running") this.flushPending()
        this.emitReady()
      })
    }
    if (this.context.state !== "running") await this.context.resume()
    this.unlocked = this.context.state === "running"
    this.kick()
    this.emitReady()
    this.flushPending()
  }

  setVolume(volume: number) {
    this.volume = volume
    if (!this.context || !this.gain) return
    this.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.02)
  }

  push(pcm: ArrayBuffer) {
    const view = bytesToInt16(pcm)
    if (!view || view.length === 0) return
    const samples = new Int16Array(view)
    if (!this.context || !this.gain || this.context.state !== "running") {
      this.pending.push(samples)
      if (this.pending.length > MAX_PENDING) this.pending.shift()
      return
    }
    this.play(samples)
  }

  reset() {
    for (const source of this.sources) {
      try {
        source.stop()
      } catch {
        // Already stopped.
      }
    }
    this.sources = []
    this.pending = []
    this.primed = false
    this.nextTime = 0
  }

  close() {
    this.reset()
    void this.context?.close()
    this.context = null
    this.gain = null
    this.unlocked = false
    this.emitReady()
  }

  private play(samples: Int16Array) {
    if (!this.context || !this.gain) return
    const buffer = int16ToFloatBuffer(this.context, samples, PCM_RATE)
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.gain)
    const now = this.context.currentTime
    if (!this.primed || this.nextTime < now + 0.02) {
      this.nextTime = now + PRIME_S
      this.primed = true
    }
    if (this.nextTime > now + MAX_AHEAD_S) this.nextTime = now + PRIME_S
    try {
      source.start(this.nextTime)
      this.nextTime += buffer.duration
    } catch {
      return
    }
    this.sources.push(source)
    source.onended = () => {
      this.sources = this.sources.filter((item) => item !== source)
    }
  }

  private flushPending() {
    if (!this.ready) return
    const queued = this.pending
    this.pending = []
    for (const samples of queued) this.play(samples)
  }

  private kick() {
    if (!this.context || !this.gain) return
    const buffer = this.context.createBuffer(1, 1, this.context.sampleRate)
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.gain)
    try {
      source.start()
    } catch {
      // The context was not running yet.
    }
  }

  private emitReady() {
    const ready = this.ready
    for (const listener of this.listeners) listener(ready)
  }
}
