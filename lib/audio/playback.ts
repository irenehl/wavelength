export class PcmPlayer {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  private nextTime = 0
  private primed = false
  private sources: AudioBufferSourceNode[] = []
  private volume = 1

  async resume() {
    if (!this.context) {
      this.context = new AudioContext()
      this.gain = this.context.createGain()
      this.gain.gain.value = this.volume
      this.gain.connect(this.context.destination)
    }
    if (this.context.state !== "running") await this.context.resume()
  }

  setVolume(volume: number) {
    this.volume = volume
    if (!this.context || !this.gain) return
    this.gain.gain.setTargetAtTime(volume, this.context.currentTime, 0.02)
  }

  push(pcm: ArrayBuffer) {
    if (!this.context || !this.gain || this.context.state !== "running") return
    const int16 = new Int16Array(pcm)
    if (int16.length === 0) return
    const buffer = this.context.createBuffer(1, int16.length, 24000)
    const channel = buffer.getChannelData(0)
    for (let index = 0; index < int16.length; index += 1) {
      channel[index] = (int16[index] ?? 0) / 32768
    }
    const source = this.context.createBufferSource()
    source.buffer = buffer
    source.connect(this.gain)
    const now = this.context.currentTime
    if (!this.primed || this.nextTime < now + 0.02) {
      this.nextTime = now + 0.18
      this.primed = true
    }
    if (this.nextTime > now + 1.6) this.nextTime = now + 0.18
    source.start(this.nextTime)
    this.nextTime += buffer.duration
    this.sources.push(source)
    source.onended = () => {
      this.sources = this.sources.filter((item) => item !== source)
    }
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
    this.primed = false
    this.nextTime = 0
  }

  close() {
    this.reset()
    void this.context?.close()
    this.context = null
    this.gain = null
  }
}
