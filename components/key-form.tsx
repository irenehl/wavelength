"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useCopy } from "@/components/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { errorText, type RoomNotice } from "@/lib/copy";

export function KeyForm() {
  const { locale, copy } = useCopy();
  const text = copy.home;
  const [value, setValue] = useState("");
  const [configured, setConfigured] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notice, setNotice] = useState<RoomNotice | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch("/api/key")
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { configured?: boolean };
        if (!cancel) setConfigured(Boolean(body.configured));
      })
      .catch(() => {
        if (!cancel) setConfigured(false);
      });
    return () => {
      cancel = true;
    };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    const key = value;
    setSaving(true);
    setSaved(false);
    setNotice(null);
    try {
      const response = await fetch("/api/key", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key }),
      });
      const body = (await response.json()) as { code?: string; message?: string };
      if (!response.ok) {
        setNotice({ code: body.code, message: body.message });
        return;
      }
      setValue("");
      setConfigured(true);
      setSaved(true);
    } catch {
      setNotice({ code: "key_failed" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="mt-4 rounded-[2rem] border border-border bg-card/60 p-6 sm:p-8">
      <h2 className="font-display text-3xl">{text.keyTitle}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{text.keyHelp}</p>
      <label className="mt-6 block text-sm" htmlFor="openai-key">
        {text.keyLabel}
      </label>
      <Input
        id="openai-key"
        type="password"
        name="openai-key"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={text.keyPlaceholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="mt-2 h-12 bg-background/40 px-3 text-base"
      />
      {notice ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {errorText(locale, notice)}
        </p>
      ) : null}
      {saved ? <p className="mt-3 text-sm text-primary">{text.keySaved}</p> : null}
      {configured && !saved ? <p className="mt-3 text-sm text-muted-foreground">{text.keyConfigured}</p> : null}
      <Button type="submit" disabled={saving || value.trim() === ""} className="mt-6 h-12 text-base">
        {saving ? text.keySaving : text.keySave}
      </Button>
    </form>
  );
}
