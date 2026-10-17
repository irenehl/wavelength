import assert from "node:assert/strict"
import test from "node:test"
import { emptyCaptions, reduceCaption } from "./captions"

test("deltas build the current line and a done transcript becomes history", () => {
  const partial = reduceCaption(emptyCaptions, { delta: "Buenos" })
  const longer = reduceCaption(partial, { delta: " días" })
  const done = reduceCaption(longer, { done: true, transcript: "Buenos días." })
  assert.deepEqual(done, { current: "", lines: ["Buenos días."] })
})

test("reset clears both the current line and the history", () => {
  const done = reduceCaption(emptyCaptions, { done: true, transcript: "Hola" })
  assert.deepEqual(reduceCaption(done, { reset: true }), emptyCaptions)
})
