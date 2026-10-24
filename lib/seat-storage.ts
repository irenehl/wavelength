function key(code: string, role: string) {
  return `wavelength-seat:${code}:${role}`
}

export function storedSeat(code: string, role: string) {
  if (typeof window === "undefined") return null
  try {
    return window.sessionStorage.getItem(key(code, role))
  } catch {
    return null
  }
}

export function rememberSeat(code: string, role: string, seatId: string) {
  if (typeof window === "undefined") return
  try {
    window.sessionStorage.setItem(key(code, role), seatId)
  } catch {
    // private mode
  }
}
