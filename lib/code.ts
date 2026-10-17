const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"

export function generateCode(): string {
  const chars: string[] = []
  const bytes = new Uint8Array(16)
  while (chars.length < 6) {
    crypto.getRandomValues(bytes)
    for (const byte of bytes) {
      // 31 * 8 = 248. Reject the remainder so every character is equally likely.
      if (byte >= 248) continue
      chars.push(ALPHABET[byte % ALPHABET.length]!)
      if (chars.length === 6) break
    }
  }
  return chars.join("")
}

export function normalizeCode(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
}

export function formatCode(code: string): string {
  const clean = normalizeCode(code)
  if (clean.length <= 3) return clean
  return `${clean.slice(0, 3)} ${clean.slice(3, 6)}`
}

export function isValidCode(code: string): boolean {
  return new RegExp(`^[${ALPHABET}]{6}$`).test(normalizeCode(code))
}
