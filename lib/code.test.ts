import assert from "node:assert/strict"
import test from "node:test"
import { formatCode, generateCode, isValidCode, normalizeCode } from "./code"

test("codes are six readable characters", () => {
  for (let index = 0; index < 200; index += 1) {
    const code = generateCode()
    assert.equal(isValidCode(code), true)
    assert.equal(/[01OIL]/.test(code), false)
  }
})

test("codes can be read with a space and typed without one", () => {
  assert.equal(formatCode("k7mp2q"), "K7M P2Q")
  assert.equal(normalizeCode("k7m p2q"), "K7MP2Q")
  assert.equal(isValidCode("K7M P2Q"), true)
  assert.equal(isValidCode("HELLO1"), false)
})
