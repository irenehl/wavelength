import assert from "node:assert/strict"
import test from "node:test"
import { EventHub } from "./rooms"
import type { TranslationHandlers } from "./translator"
import { liveSeats, takeSeat } from "./live-seats"

type Opened = { handlers: TranslationHandlers }

function events(body: string): Array<{ type?: string; audio?: string; transcript?: string; snapshot?: boolean }> {
  return body
    .split("\n\n")
    .map((block) =>
      block
        .split("\n")
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .join(""),
    )
    .filter(Boolean)
    .map((data) => JSON.parse(data) as { type?: string; audio?: string; transcript?: string; snapshot?: boolean })
}

async function readAll(response: Response) {
  const reader = response.body?.getReader()
  if (!reader) throw new Error("missing body")
  const decoder = new TextDecoder()
  let text = ""
  const deadline = Date.now() + 2000
  while (true) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error("stream hung")
    let timer: ReturnType<typeof setTimeout> | undefined
    const next = await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
      timer = setTimeout(() => reject(new Error("stream hung")), remaining)
      reader.read().then(resolve, reject)
    }).finally(() => clearTimeout(timer))
    if (next.done) break
    if (next.value) text += decoder.decode(next.value)
  }
  return text
}

test("both listener streams get the same text and audio, and a dead one does not stop the other", async () => {
  const opened: Opened[] = []
  const hub = new EventHub({
    apiKeyConfigured: true,
    openTranslator: (_language, _transcribe, _safetyId, handlers) => {
      opened.push({ handlers })
      return {
        append() {},
        setTranscribe() {},
        close() {
          handlers.onClosed()
        },
      }
    },
  })
  ;(globalThis as typeof globalThis & { __wavelengthHub?: EventHub }).__wavelengthHub = hub
  const route = await import("../app/api/events/[code]/live/route")
  const room = hub.create("DevDay")
  const speaker = takeSeat(room, "speaker")
  const first = takeSeat(room, "listener")
  const second = takeSeat(room, "listener")
  assert.equal(speaker.ok && first.ok && second.ok, true)
  if (!speaker.ok || !first.ok || !second.ok) return

  const abortFirst = new AbortController()
  const abortSecond = new AbortController()
  const firstResponse = await route.GET(
    new Request(`http://local/api/events/${room.code}/live?seatId=${first.id}`, { signal: abortFirst.signal }),
    { params: Promise.resolve({ code: room.code }) },
  )
  assert.equal(firstResponse.status, 200)
  assert.match(firstResponse.headers.get("content-type") || "", /text\/event-stream/)

  room.setMic(speaker.id, true)
  room.listen(first.id, "en")
  room.listen(second.id, "en")
  const session = opened[0]
  assert.ok(session)
  session.handlers.onOutputTranscript("Hello.", true, "Hello.")
  session.handlers.onInputTranscript("Hola.", true, "Hola.")
  session.handlers.onAudio(Buffer.alloc(9000, 7))

  const secondResponse = await route.GET(
    new Request(`http://local/api/events/${room.code}/live?seatId=${second.id}`, { signal: abortSecond.signal }),
    { params: Promise.resolve({ code: room.code }) },
  )
  assert.equal(secondResponse.status, 200)

  abortFirst.abort()
  session.handlers.onOutputTranscript("", true, "Tail.")
  abortSecond.abort()

  const firstBody = await readAll(firstResponse)
  const secondBody = await readAll(secondResponse)
  const firstEvents = events(firstBody)
  const secondEvents = events(secondBody)

  assert.equal(
    firstEvents.some((message) => message.transcript === "Hello."),
    true,
  )
  assert.equal(
    secondEvents.some((message) => message.snapshot && message.transcript === "Hello."),
    true,
  )
  assert.equal(
    secondEvents.some((message) => message.snapshot && message.transcript === "Hola."),
    true,
  )
  assert.equal(firstEvents.some((message) => message.transcript === "Tail."), false)
  assert.equal(secondEvents.some((message) => message.transcript === "Tail."), true)

  for (const list of [firstEvents, secondEvents]) {
    const audio = list.filter((message) => message.type === "audio" && message.audio)
    assert.equal(audio.length, 3)
    for (const message of audio) {
      assert.ok(message.audio)
      assert.equal(Buffer.from(message.audio, "base64").length <= 3200, true)
    }
  }

  assert.equal(liveSeats.has(first.id), true)
  assert.equal(room.publicSnapshot().listenerCounts.some((item) => item.language === "en" && item.count === 2), true)
})
