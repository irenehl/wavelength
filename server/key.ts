import { chmod, readFile, writeFile } from "node:fs/promises"
import type { IncomingMessage } from "node:http"
import { join } from "node:path"

const KEY_PATTERN = /^sk-[A-Za-z0-9_-]{20,220}$/

export function cleanApiKey(input: unknown): string | null {
  if (typeof input !== "string") return null
  const key = input.trim()
  if (!KEY_PATTERN.test(key)) return null
  return key
}

export function isLoopback(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress || ""
  const direct = address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1"
  if (!direct) return false
  const forwarded = request.headers["x-forwarded-for"]
  if (typeof forwarded !== "string" || forwarded.trim() === "") return true
  const client = forwarded.split(",")[0]?.trim() || ""
  return client === "127.0.0.1" || client === "::1"
}

export async function saveLocalApiKey(key: string, file = join(process.cwd(), ".env.local")) {
  let text = ""
  try {
    text = await readFile(file, "utf8")
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") throw new Error("No pudimos leer la configuración local.")
  }
  const line = `OPENAI_API_KEY=${key}`
  const lines = text.split(/\r?\n/).filter((entry, index, all) => entry !== "" || index < all.length - 1)
  let found = false
  const next = lines.map((entry) => {
    if (/^\s*OPENAI_API_KEY\s*=/.test(entry)) {
      found = true
      return line
    }
    return entry
  })
  if (!found) next.push(line)
  const body = `${next.join("\n")}\n`
  await writeFile(file, body, { mode: 0o600 })
  await chmod(file, 0o600)
}
