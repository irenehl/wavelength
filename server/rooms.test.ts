import assert from "node:assert/strict"
import test from "node:test"
import type { ServerMessage } from "../lib/protocol"
import { EventHub, EventRoom, type RoomSocket } from "./rooms"
import type { OpenTranslator, TranslationHandlers, Translator } from "./translator"

type Opened = {
  language: string
  transcribe: boolean
  closed: boolean
  audio: Buffer[]
  handlers: TranslationHandlers
}

function fakeSocket(): RoomSocket & { sent: Array<string | Buffer> } {
  return {
    readyState: 1,
    sent: [],
    send(data) {
      this.sent.push(data)
    },
  }
}

function messages(socket: { sent: Array<string | Buffer> }): ServerMessage[] {
  return socket.sent.filter((item): item is string => typeof item === "string").map((item) => JSON.parse(item) as ServerMessage)
}

function roomWith(apiKeyConfigured = true) {
  const opened: Opened[] = []
  const openTranslator: OpenTranslator = (language, transcribe, _safetyId, handlers) => {
    const session: Opened = { language, transcribe, closed: false, audio: [], handlers }
    opened.push(session)
    const translator: Translator = {
      append(pcm) {
        session.audio.push(pcm)
      },
      setTranscribe(on) {
        session.transcribe = on
      },
      close() {
        session.closed = true
        handlers.onClosed()
      },
    }
    return translator
  }
  const room = new EventRoom({
    code: "K7MP2Q",
    name: "Evento X",
    apiKeyConfigured,
    openTranslator,
  })
  return { room, opened }
}

test("listeners in the same language share one translation", () => {
  const { room, opened } = roomWith()
  const speakerSocket = fakeSocket()
  const firstSocket = fakeSocket()
  const secondSocket = fakeSocket()
  const speaker = room.join(speakerSocket, "speaker")
  const first = room.join(firstSocket, "listener")
  const second = room.join(secondSocket, "listener")
  assert.equal(speaker.ok && first.ok && second.ok, true)
  if (!speaker.ok || !first.ok || !second.ok) return

  room.listen(first.id, "en")
  room.setMic(speaker.id, true)
  room.listen(second.id, "en")
  assert.equal(opened.length, 1)
  assert.equal(opened[0]?.language, "en")
  assert.equal(opened[0]?.transcribe, true)

  const pcm = Buffer.from([1, 2, 3, 4])
  room.appendAudio(speaker.id, pcm)
  assert.equal(opened[0]?.audio.length, 1)

  const translated = Buffer.from([9, 9])
  opened[0]?.handlers.onAudio(translated)
  assert.deepEqual(firstSocket.sent.at(-1), translated)
  assert.deepEqual(secondSocket.sent.at(-1), translated)

  opened[0]?.handlers.onOutputTranscript("Hello.", true, "Hello.")
  opened[0]?.handlers.onInputTranscript("Hola.", true, "Hola.")
  const firstText = messages(firstSocket).filter((message) => message.type === "transcript")
  const secondText = messages(secondSocket).filter((message) => message.type === "transcript")
  assert.equal(firstText.some((message) => message.type === "transcript" && message.side === "translation" && message.transcript === "Hello."), true)
  assert.equal(secondText.some((message) => message.type === "transcript" && message.side === "translation" && message.transcript === "Hello."), true)
  assert.equal(secondText.some((message) => message.type === "transcript" && message.side === "source" && message.transcript === "Hola."), true)
  const replay = room.captionReplay(second.id).filter((message) => message.type === "transcript")
  assert.equal(replay.some((message) => message.side === "translation" && message.transcript === "Hello."), true)
  assert.equal(replay.some((message) => message.side === "source" && message.transcript === "Hola."), true)
})

test("caption replay keeps earlier utterances for someone who connects late", () => {
  const { room, opened } = roomWith()
  const speaker = room.join(fakeSocket(), "speaker")
  const early = room.join(fakeSocket(), "listener")
  const late = room.join(fakeSocket(), "listener")
  if (!speaker.ok || !early.ok || !late.ok) throw new Error("join failed")
  room.setMic(speaker.id, true)
  room.listen(early.id, "en")
  room.listen(late.id, "en")
  const session = opened[0]
  session?.handlers.onInputTranscript("Hola.", false)
  session?.handlers.onInputTranscript("", true, "Hola.")
  session?.handlers.onInputTranscript(" Otra.", false)
  session?.handlers.onInputTranscript("", true, "Otra.")
  session?.handlers.onOutputTranscript("Hello.", false)
  session?.handlers.onOutputTranscript("", true, "Hello.")
  session?.handlers.onOutputTranscript(" More.", false)
  session?.handlers.onOutputTranscript("", true, "More.")

  const replay = room.captionReplay(late.id).filter((message) => message.type === "transcript")
  const source = replay.find((message) => message.type === "transcript" && message.side === "source")
  const translation = replay.find((message) => message.type === "transcript" && message.side === "translation")
  assert.equal(source?.type === "transcript" && source.transcript, "Hola. Otra.")
  assert.equal(translation?.type === "transcript" && translation.transcript, "Hello. More.")
  assert.equal(translation?.type === "transcript" && translation.snapshot, true)
})

test("one blocked listener does not stop the other", () => {
  const { room, opened } = roomWith()
  const speaker = room.join(fakeSocket(), "speaker")
  const blocked = room.join({
    readyState: 1,
    send() {
      throw new Error("blocked")
    },
  }, "listener")
  const healthySocket = fakeSocket()
  const healthy = room.join(healthySocket, "listener")
  if (!speaker.ok || !blocked.ok || !healthy.ok) throw new Error("join failed")
  room.setMic(speaker.id, true)
  room.listen(blocked.id, "en")
  room.listen(healthy.id, "en")
  opened[0]?.handlers.onOutputTranscript("Hello.", true, "Hello.")
  opened[0]?.handlers.onAudio(Buffer.from([1, 2]))
  const text = messages(healthySocket).filter(
    (message) => message.type === "transcript" && message.side === "translation" && message.transcript === "Hello.",
  )
  assert.equal(text.length, 1)
  assert.deepEqual(healthySocket.sent.at(-1), Buffer.from([1, 2]))
})

test("a second language opens its own session and keeps the first transcriber", () => {
  const { room, opened } = roomWith()
  const speakerSocket = fakeSocket()
  const english = fakeSocket()
  const french = fakeSocket()
  const speaker = room.join(speakerSocket, "speaker")
  const en = room.join(english, "listener")
  const fr = room.join(french, "listener")
  if (!speaker.ok || !en.ok || !fr.ok) throw new Error("join failed")

  room.setMic(speaker.id, true)
  room.listen(en.id, "en")
  room.listen(fr.id, "fr")

  assert.deepEqual(
    opened.map((session) => session.language),
    ["en", "fr"],
  )
  assert.equal(opened[0]?.transcribe, true)
  assert.equal(opened[1]?.transcribe, false)

  opened[0]?.handlers.onInputTranscript("hola", false)
  opened[1]?.handlers.onInputTranscript("no", false)
  const source = messages(english).filter((message) => message.type === "transcript" && message.side === "source")
  assert.equal(source.length, 1)
  if (source[0]?.type === "transcript") assert.equal(source[0].delta, "hola")
})

test("mute and an empty language close the OpenAI session", () => {
  const { room, opened } = roomWith()
  const speakerSocket = fakeSocket()
  const english = fakeSocket()
  const french = fakeSocket()
  const speaker = room.join(speakerSocket, "speaker")
  const en = room.join(english, "listener")
  const fr = room.join(french, "listener")
  if (!speaker.ok || !en.ok || !fr.ok) throw new Error("join failed")

  room.setMic(speaker.id, true)
  room.listen(en.id, "en")
  room.listen(fr.id, "fr")
  room.leave(fr.id)
  assert.equal(opened[1]?.closed, true)
  assert.equal(opened[0]?.closed, false)

  room.setMic(speaker.id, false)
  assert.equal(opened[0]?.closed, true)
  room.appendAudio(speaker.id, Buffer.from([1, 2]))
  assert.equal(opened[0]?.audio.length, 0)
})

test("unmuting reopens a session only while someone is listening", () => {
  const { room, opened } = roomWith()
  const speakerSocket = fakeSocket()
  const listenerSocket = fakeSocket()
  const speaker = room.join(speakerSocket, "speaker")
  const listener = room.join(listenerSocket, "listener")
  if (!speaker.ok || !listener.ok) throw new Error("join failed")

  room.setMic(speaker.id, true)
  assert.equal(opened.length, 0)
  room.listen(listener.id, "en")
  room.setMic(speaker.id, false)
  room.setMic(speaker.id, true)
  assert.equal(opened.filter((session) => !session.closed).length, 1)
})

test("audio from before a listener arrives is kept only as a short preroll", () => {
  const { room, opened } = roomWith()
  const speakerSocket = fakeSocket()
  const listenerSocket = fakeSocket()
  const speaker = room.join(speakerSocket, "speaker")
  const listener = room.join(listenerSocket, "listener")
  if (!speaker.ok || !listener.ok) throw new Error("join failed")

  room.setMic(speaker.id, true)
  const first = Buffer.from([1, 2])
  const second = Buffer.from([3, 4])
  room.appendAudio(speaker.id, first)
  room.appendAudio(speaker.id, second)
  assert.equal(opened.length, 0)

  room.listen(listener.id, "en")
  assert.deepEqual(opened[0]?.audio, [first, second])
})

test("without an API key the room stays open and no session starts", () => {
  const { room, opened } = roomWith(false)
  const speakerSocket = fakeSocket()
  const listenerSocket = fakeSocket()
  const speaker = room.join(speakerSocket, "speaker")
  const listener = room.join(listenerSocket, "listener")
  if (!speaker.ok || !listener.ok) throw new Error("join failed")
  room.setMic(speaker.id, true)
  room.listen(listener.id, "en")
  assert.equal(opened.length, 0)
  assert.equal(room.publicSnapshot().apiKeyConfigured, false)
  const errors = messages(speakerSocket).filter((message) => message.type === "error")
  assert.equal(errors.length, 1)
})

test("a second speaker is refused and changing language moves the listener", () => {
  const { room, opened } = roomWith()
  const firstSocket = fakeSocket()
  const secondSocket = fakeSocket()
  const listenerSocket = fakeSocket()
  const first = room.join(firstSocket, "speaker")
  const second = room.join(secondSocket, "speaker")
  const listener = room.join(listenerSocket, "listener")
  assert.equal(first.ok, true)
  assert.deepEqual(second, { ok: false, message: "Ya hay alguien con el micrófono de este evento." })
  if (!first.ok || !listener.ok) throw new Error("join failed")

  room.setMic(first.id, true)
  room.listen(listener.id, "en")
  room.listen(listener.id, "fr")
  assert.equal(opened[0]?.closed, true)
  assert.equal(opened[1]?.language, "fr")
  assert.equal(opened[1]?.transcribe, true)
  const resets = messages(listenerSocket).filter(
    (message) => message.type === "transcript" && message.reset,
  )
  assert.equal(resets.length, 2)
})

test("a dropped translation reopens, then stops after repeated failures", () => {
  const { room, opened } = roomWith()
  const speakerSocket = fakeSocket()
  const listenerSocket = fakeSocket()
  const speaker = room.join(speakerSocket, "speaker")
  const listener = room.join(listenerSocket, "listener")
  if (!speaker.ok || !listener.ok) throw new Error("join failed")
  room.setMic(speaker.id, true)
  room.listen(listener.id, "en")

  opened[0]?.handlers.onClosed()
  opened[1]?.handlers.onClosed()
  opened[2]?.handlers.onClosed()
  assert.equal(opened.length, 3)
  room.appendAudio(speaker.id, Buffer.from([1, 2, 3, 4]))
  assert.equal(opened.every((session) => session.audio.length === 0), true)
})

test("ensure reuses the room for the same code", () => {
  const hub = new EventHub({
    apiKeyConfigured: false,
    openTranslator: () => {
      throw new Error("unused")
    },
  })
  const first = hub.ensure("k7mp2q", "DevDay")
  const second = hub.ensure("K7M P2Q", "Otro")
  assert.equal(first, second)
  assert.equal(first.name, "DevDay")
})
