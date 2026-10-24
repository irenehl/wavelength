"use client"

import { useEffect, useState } from "react"
import type { EventPublic } from "@/lib/protocol"

type EventState =
  | { status: "loading"; event: null }
  | { status: "ready"; event: EventPublic }
  | { status: "missing"; event: null }
  | { status: "error"; event: null }

export function useEvent(code: string, name = ""): EventState {
  const [state, setState] = useState<EventState>({ status: "loading", event: null })

  useEffect(() => {
    let cancel = false
    const query = name ? `?name=${encodeURIComponent(name)}` : ""
    fetch(`/api/events/${encodeURIComponent(code)}${query}`)
      .then(async (response) => {
        if (cancel) return
        if (response.status === 404) {
          setState({ status: "missing", event: null })
          return
        }
        if (!response.ok) {
          setState({ status: "error", event: null })
          return
        }
        setState({ status: "ready", event: (await response.json()) as EventPublic })
      })
      .catch(() => {
        if (!cancel) setState({ status: "error", event: null })
      })
    return () => {
      cancel = true
    }
  }, [code, name])

  return state
}
