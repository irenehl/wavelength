export function cleanName(input: unknown): string | null {
  if (typeof input !== "string") return null
  const name = input.trim().replace(/\s+/g, " ")
  if (name.length < 1 || name.length > 60) return null
  return name
}
