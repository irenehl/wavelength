import assert from "node:assert/strict"
import { mkdtemp, readFile, stat } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import test from "node:test"
import type { IncomingMessage } from "node:http"
import { cleanApiKey, isLoopback, saveLocalApiKey } from "./key"

const sample = `sk-${"a".repeat(32)}`

test("a key must look like an OpenAI key and nothing else", () => {
  assert.equal(cleanApiKey(sample), sample)
  assert.equal(cleanApiKey(`  ${sample}\n`), sample)
  assert.equal(cleanApiKey("sk-short"), null)
  assert.equal(cleanApiKey("not-a-key-but-long-enough-xxxx"), null)
  assert.equal(cleanApiKey(`${sample} extra`), null)
  assert.equal(cleanApiKey(`${sample.slice(0, 10)}\nOPENAI_API_KEY=nope`), null)
})

test("the key file keeps other lines and is not world-readable", async () => {
  const dir = await mkdtemp(join(tmpdir(), "puente-key-"))
  const file = join(dir, ".env.local")
  const replaced = `sk-${"b".repeat(32)}`
  await saveLocalApiKey(sample, file)
  await saveLocalApiKey(replaced, file)
  const text = await readFile(file, "utf8")
  assert.equal(text, `OPENAI_API_KEY=${replaced}\n`)
  assert.equal((await stat(file)).mode & 0o777, 0o600)

  const { writeFile } = await import("node:fs/promises")
  await writeFile(file, "OTHER=1\nOPENAI_API_KEY=old\n# note\n", { mode: 0o600 })
  await saveLocalApiKey(sample, file)
  assert.equal(await readFile(file, "utf8"), `OTHER=1\nOPENAI_API_KEY=${sample}\n# note\n`)
})

test("only this machine can post a key", () => {
  const request = (address: string, forwarded?: string) =>
    ({
      socket: { remoteAddress: address },
      headers: forwarded ? { "x-forwarded-for": forwarded } : {},
    }) as IncomingMessage
  assert.equal(isLoopback(request("127.0.0.1")), true)
  assert.equal(isLoopback(request("::1")), true)
  assert.equal(isLoopback(request("::ffff:127.0.0.1")), true)
  assert.equal(isLoopback(request("10.0.0.8")), false)
  assert.equal(isLoopback(request("127.0.0.1", "203.0.113.5")), false)
  assert.equal(isLoopback(request("127.0.0.1", "127.0.0.1")), true)
})
