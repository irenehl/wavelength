import assert from "node:assert/strict"
import test from "node:test"
import { drainAll, trimQueue } from "./upload"

test("each post takes every sample waiting, in order", () => {
  const queue = [new Uint8Array([1, 2]), new Uint8Array([3, 4])]
  const first = drainAll(queue)
  assert.deepEqual([...(first ?? [])], [1, 2, 3, 4])
  assert.equal(queue.length, 0)

  queue.push(new Uint8Array([5]))
  queue.push(new Uint8Array([6]))
  const second = drainAll(queue)
  assert.deepEqual([...(second ?? [])], [5, 6])
})

test("a failed post can be put back without growing without limit", () => {
  const queue = [new Uint8Array(100)]
  const failed = new Uint8Array([7, 8])
  queue.unshift(failed)
  trimQueue(queue, 100)
  assert.equal(queue.length, 1)
  assert.equal(queue[0]?.byteLength, 100)
})
