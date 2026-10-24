import assert from "node:assert/strict"
import test from "node:test"
import { commitIdle, emptyCaptions, reduceCaption, splitPhrases } from "./captions"

test("deltas build the current line and a done transcript becomes history", () => {
  const partial = reduceCaption(emptyCaptions, { delta: "Buenos" })
  const longer = reduceCaption(partial, { delta: " días" })
  const done = reduceCaption(longer, { done: true, transcript: "Buenos días." })
  assert.equal(done.current, "")
  assert.deepEqual(done.lines, ["Buenos días."])
})

test("reset clears both the current line and the history", () => {
  const done = reduceCaption(emptyCaptions, { done: true, transcript: "Hola" })
  assert.deepEqual(reduceCaption(done, { reset: true }), emptyCaptions)
})

test("a pause starts a new line", () => {
  const first = reduceCaption(emptyCaptions, { delta: "Hi, hi." }, 1_000)
  const next = reduceCaption(first, { delta: "That's it." }, 2_400)
  assert.deepEqual(next.lines, ["Hi, hi."])
  assert.equal(next.current, "That's it.")
})

test("sentence breaks become their own lines", () => {
  assert.deepEqual(splitPhrases("One. Two? Three!"), ["One.", "Two?", "Three!"])
  const done = reduceCaption(emptyCaptions, { done: true, transcript: "One. Two more." })
  assert.deepEqual(done.lines, ["One.", "Two more."])
})

test("a snapshot fills a listener who missed the live lines", () => {
  const caughtUp = reduceCaption(emptyCaptions, { snapshot: true, transcript: "One. Two more." })
  assert.deepEqual(caughtUp.lines, ["One.", "Two more."])
  const longer = reduceCaption(caughtUp, { snapshot: true, transcript: "One. Two more. Three." })
  assert.deepEqual(longer.lines, ["One.", "Two more.", "Three."])
  assert.equal(reduceCaption(longer, { snapshot: true, transcript: "One." }), longer)
})

test("silence after a pause commits the open line", () => {
  const open = reduceCaption(emptyCaptions, { delta: "That's it." }, 1_000)
  const idle = commitIdle(open, 2_200)
  assert.equal(idle.current, "")
  assert.deepEqual(idle.lines, ["That's it."])
  assert.equal(commitIdle(open, 1_500), open)
})
