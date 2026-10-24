import assert from "node:assert/strict"
import test from "node:test"
import { bytesToInt16, decodeBase64Pcm } from "./pcm"

test("base64 pcm decodes to the original samples", () => {
  const samples = new Int16Array([0, 32767, -32768, 12])
  const encoded = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength).toString("base64")
  const decoded = decodeBase64Pcm(encoded)
  assert.ok(decoded)
  assert.deepEqual([...bytesToInt16(decoded)!], [...samples])
})

test("odd-length buffers keep complete samples only", () => {
  const bytes = new Uint8Array([1, 0, 2])
  const samples = bytesToInt16(bytes.buffer)
  assert.ok(samples)
  assert.equal(samples.length, 1)
})
