"use client";

import { useCopy } from "@/components/locale";
import { languageLabel, OUTPUT_LANGUAGES, type OutputLanguage } from "@/lib/languages";

export function LanguagePicker({
  value,
  onChange,
}: {
  value: OutputLanguage;
  onChange: (language: OutputLanguage) => void;
}) {
  const { locale, copy } = useCopy();
  const other = locale === "es" ? "en" : "es";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="listbox" aria-label={copy.listener.pickerAria}>
      {OUTPUT_LANGUAGES.map((language) => {
        const selected = language.code === value;
        const primary = languageLabel(language.code, locale);
        const secondary = languageLabel(language.code, other);
        return (
          <button
            key={language.code}
            type="button"
            role="option"
            aria-selected={selected}
            aria-label={`${primary}, ${secondary}`}
            onClick={() => onChange(language.code)}
            className={`flex min-h-14 flex-col justify-center rounded-2xl border px-3 py-2 text-left transition-colors ${
              selected
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-card/40 text-foreground/80 hover:border-foreground/30"
            }`}
          >
            <span className="text-sm leading-5">{primary}</span>
            <span className={`text-xs leading-4 ${selected ? "text-foreground/60" : "text-muted-foreground"}`}>
              {secondary}
            </span>
          </button>
        );
      })}
    </div>
  );
}
