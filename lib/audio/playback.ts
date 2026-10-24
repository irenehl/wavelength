import { bytesToInt16, int16ToFloatBuffer, PCM_RATE } from "@/lib/audio/pcm"

const PRIME_S = 0.06
const MAX_AHEAD_S = 0.4
const MAX_PENDING = 30

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA="

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
  private dest: MediaStreamAudioDestinationNode | null = null
  private element: HTMLAudioElement | null = null
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
      try {
        this.context = new Ctor({ sampleRate: PCM_RATE, latencyHint: "interactive" })
      } catch {
        this.context = new Ctor({ latencyHint: "interactive" })
      }
      this.gain = this.context.createGain()
      this.gain.gain.value = this.volume
      this.dest = this.context.createMediaStreamDestination()
      this.gain.connect(this.dest)
      this.gain.connect(this.context.destination)
      this.element = this.attachElement(this.dest.stream)
      this.context.addEventListener("statechange", () => {
        if (this.context?.state === "running") this.flushPending()
        this.emitReady()
      })
    }
    this.unlockElement()
    if (this.context.state !== "running") await this.context.resume()
    if (this.element) {
      this.element.muted = false
      this.element.volume = this.volume
      await this.element.play().catch(() => {})
    }
    this.unlocked = this.context.state === "running"
    this.emitReady()
    this.flushPending()
  }

  setVolume(volume: number) {
    this.volume = volume
    if (this.element) this.element.volume = volume
    if (!this.context || !this.gain) return
    this.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.02)
  }

  push(pcm: ArrayBuffer) {
    const samples = bytesToInt16(pcm)
    if (!samples || samples.length === 0) return
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
    if (this.element) {
      this.element.pause()
      this.element.srcObject = null
      this.element.remove()
      this.element = null
    }
    void this.context?.close()
    this.context = null
    this.gain = null
    this.dest = null
    this.unlocked = false
    this.emitReady()
  }

  private play(samples: Int16Array) {
    if (!this.context || !this.gain) return
    const copy = new Int16Array(samples)
    const buffer = int16ToFloatBuffer(this.context, copy, PCM_RATE)
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.gain)
    const now = this.context.currentTime
    if (!this.primed || this.nextTime < now + 0.012) {
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

  private attachElement(stream: MediaStream) {
    const audio = document.createElement("audio")
    audio.setAttribute("playsinline", "true")
    audio.setAttribute("webkit-playsinline", "true")
    audio.autoplay = true
    audio.preload = "auto"
    audio.controls = false
    audio.muted = false
    audio.volume = this.volume
    audio.srcObject = stream
    audio.style.position = "fixed"
    audio.style.width = "0"
    audio.style.height = "0"
    audio.style.opacity = "0"
    audio.style.pointerEvents = "none"
    document.body.appendChild(audio)
    return audio
  }

  private unlockElement() {
    if (this.element) return
    if (typeof document === "undefined") return
    const audio = document.createElement("audio")
    audio.setAttribute("playsinline", "true")
    audio.src = SILENT_WAV
    void audio.play().catch(() => {})
  }

  private emitReady() {
    const ready = this.ready
    for (const listener of this.listeners) listener(ready)
  }
}
