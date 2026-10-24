class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super()
    this.targetRate = 24000
    this.ratio = sampleRate / this.targetRate
    this.fraction = 0
    const cutoff = 10000
    const rc = 1 / (2 * Math.PI * cutoff)
    const dt = 1 / sampleRate
    this.alpha = dt / (rc + dt)
    this.lowpass = 0
    this.pending = []
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (!channel) return true

    for (let i = 0; i < channel.length; i += 1) {
      this.lowpass += this.alpha * (channel[i] - this.lowpass)
      this.fraction += 1
      if (this.fraction >= this.ratio) {
        this.fraction -= this.ratio
        this.pending.push(this.lowpass)
      }
    }

    const frame = 960
    if (this.pending.length >= frame) {
      const samples = this.pending.splice(0, frame)
      const pcm = new Int16Array(samples.length)
      for (let i = 0; i < samples.length; i += 1) {
        const sample = Math.max(-1, Math.min(1, samples[i]))
        pcm[i] = sample < 0 ? Math.round(sample * 32768) : Math.round(sample * 32767)
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer])
    }

    return true
  }
}

registerProcessor("pcm-capture", PcmCaptureProcessor)
