export function roomQuery(name: string) {
  return name ? `?name=${encodeURIComponent(name)}` : ""
}

export function speakerPath(code: string, name = "") {
  return `/s/${code}${roomQuery(name)}`
}

export function listenerPath(code: string, name = "") {
  return `/l/${code}${roomQuery(name)}`
}
