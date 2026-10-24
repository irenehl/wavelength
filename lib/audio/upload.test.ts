import assert from "node:assert/strict"
import test from "node:test"
import { batchBytes, BYTES_PER_MS, takeBatch, trimQueue } from "./upload"

test("a slow round trip still ships enough audio to stay realtime", () => {
  assert.equal(batchBytes(80), Math.round(160 * BYTES_PER_MS))
  assert.equal(batchBytes(300), Math.round(350 * BYTES_PER_MS))
  assert.equal(batchBytes(2000), Math.round(400 * BYTES_PER_MS))
})

test("takeBatch keeps leftover frames for the next post", () => {
  const queue = [new Uint8Array(100), new Uint8Array(100), new Uint8Array(100)]
  const first = takeBatch(queue, 150)
  assert.equal(first?.byteLength, 200)
  assert.equal(queue.length, 1)
  assert.equal(queue[0]?.byteLength, 100)
})

test("trimQueue drops the oldest audio when the speaker is too far behind", () => {
  const queue = [new Uint8Array(100), new Uint8Array(40)]
  trimQueue(queue, 50)
  assert.equal(queue.length, 1)
  assert.equal(queue[0]?.byteLength, 40)
})
