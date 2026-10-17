export async function startCapture(
  stream: MediaStream,
  onPcm: (pcm: ArrayBuffer) => void,
  onLevel?: (level: number) => void,
): Promise<{ stop: () => void }> {
  const context = new AudioContext()
  await context.audioWorklet.addModule("/pcm-worklet.js")
  const source = context.createMediaStreamSource(stream)
  const worklet = new AudioWorkletNode(context, "pcm-capture")
  const analyser = context.createAnalyser()
  analyser.fftSize = 1024
  source.connect(worklet)
  source.connect(analyser)

  worklet.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
    onPcm(event.data)
  }

  const samples = new Uint8Array(analyser.fftSize)
  let frame = 0
  const tick = () => {
    frame = requestAnimationFrame(tick)
    if (!onLevel) return
    analyser.getByteTimeDomainData(samples)
    let sum = 0
    for (let index = 0; index < samples.length; index += 1) {
      const value = ((samples[index] ?? 128) - 128) / 128
      sum += value * value
    }
    onLevel(Math.min(1, Math.sqrt(sum / samples.length) * 3.2))
  }
  frame = requestAnimationFrame(tick)

  return {
    stop() {
      cancelAnimationFrame(frame)
      worklet.port.onmessage = null
      worklet.disconnect()
      source.disconnect()
      analyser.disconnect()
      for (const track of stream.getTracks()) track.stop()
      void context.close()
    },
  }
}
