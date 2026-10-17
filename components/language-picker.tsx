"use client";

import { languageLabel, OUTPUT_LANGUAGES, type OutputLanguage } from "@/lib/languages";

export function LanguagePicker({
  value,
  onChange,
}: {
  value: OutputLanguage;
  onChange: (language: OutputLanguage) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3" role="listbox" aria-label="Idioma de la sala">
      {OUTPUT_LANGUAGES.map((language) => {
        const selected = language.code === value;
        return (
          <button
            key={language.code}
            type="button"
            role="option"
            aria-selected={selected}
            onClick={() => onChange(language.code)}
            className={`h-12 rounded-2xl border px-3 text-left text-sm transition-colors ${
              selected
                ? "border-primary bg-primary/15 text-foreground"
                : "border-border bg-card/40 text-foreground/80 hover:border-foreground/30"
            }`}
          >
            {language.label}
          </button>
        );
      })}
    </div>
  );
}

export function roomLine(language: string) {
  return `Sala de ${languageLabel(language).toLowerCase()}`;
}
