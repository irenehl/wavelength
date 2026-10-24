import assert from "node:assert/strict"
import test from "node:test"
import { liveSeats, takeSeat } from "./live-seats"
import { EventRoom } from "./rooms"

function room() {
  return new EventRoom({
    code: "K7MP2Q",
    name: "DevDay",
    apiKeyConfigured: false,
    openTranslator: () => {
      throw new Error("unused")
    },
  })
}

test("a stored speaker seat is reclaimed instead of opening a second chair", () => {
  const event = room()
  const first = takeSeat(event, "speaker")
  assert.equal(first.ok, true)
  if (!first.ok) return

  const again = takeSeat(event, "speaker", first.id)
  assert.deepEqual(again, { ok: true, id: first.id })

  const other = takeSeat(event, "speaker")
  assert.equal(other.ok, false)
  assert.equal(event.publicSnapshot().speakerPresent, true)
})

test("a stale detach does not drop a seat that already reattached", () => {
  const event = room()
  const joined = takeSeat(event, "speaker")
  assert.equal(joined.ok, true)
  if (!joined.ok) return

  const seat = liveSeats.get(joined.id)
  assert.ok(seat)
  const stale = seat.attach(() => {})
  const live = seat.attach(() => {})
  assert.notEqual(stale, live)
  seat.detach(stale)
  assert.equal(liveSeats.has(joined.id), true)
  assert.equal(event.publicSnapshot().speakerPresent, true)
})

test("detach keeps the speaker present so a later reclaim still works", () => {
  const event = room()
  const joined = takeSeat(event, "speaker")
  assert.equal(joined.ok, true)
  if (!joined.ok) return

  const seat = liveSeats.get(joined.id)
  assert.ok(seat)
  const generation = seat.attach(() => {})
  seat.detach(generation)
  assert.equal(event.publicSnapshot().speakerPresent, true)

  const again = takeSeat(event, "speaker", joined.id)
  assert.deepEqual(again, { ok: true, id: joined.id })
  assert.equal(event.publicSnapshot().speakerPresent, true)
})

test("queued captions survive a burst of audio while the stream is down", () => {
  const event = room()
  const joined = takeSeat(event, "listener")
  assert.equal(joined.ok, true)
  if (!joined.ok) return
  const seat = liveSeats.get(joined.id)
  assert.ok(seat)
  const caption = JSON.stringify({ type: "transcript", side: "translation", delta: "Hello", done: false })
  seat.send(caption)
  for (let index = 0; index < 30; index += 1) seat.send(Buffer.from([index]))
  const seen: Array<string | Buffer> = []
  seat.attach((data) => seen.push(data))
  seat.flush()
  assert.equal(seen.includes(caption), true)
  assert.equal(seen.filter((item) => typeof item !== "string").length <= 8, true)
})

test("a closed stream keeps the latest caption for the reconnect", () => {
  const event = room()
  const joined = takeSeat(event, "listener")
  assert.equal(joined.ok, true)
  if (!joined.ok) return
  const seat = liveSeats.get(joined.id)
  assert.ok(seat)
  seat.attach(() => {
    throw new Error("closed")
  })
  const caption = JSON.stringify({ type: "transcript", side: "translation", delta: "Hello", done: false })
  seat.send(caption)
  const seen: Array<string | Buffer> = []
  seat.attach((data) => seen.push(data))
  seat.flush()
  assert.equal(seen.includes(caption), true)
})

test("an unknown seat id still joins a free speaker chair", () => {
  const event = room()
  const joined = takeSeat(event, "speaker", "missing-seat")
  assert.equal(joined.ok, true)
  if (!joined.ok) return
  assert.notEqual(joined.id, "missing-seat")
  assert.equal(event.publicSnapshot().speakerPresent, true)
})
