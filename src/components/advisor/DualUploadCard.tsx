// src/components/advisor/DualUploadCard.tsx
//
// The idle-state intake UI: two side-by-side image slots.
//   - LEFT  (required):  the user's own squad screenshot.
//   - RIGHT (optional):  the opponent's squad. When present, the AI builds a
//                        counter-tactical plan targeting THIS opponent.
//
// A single submit button below fires only when the left slot is filled.

"use client";

import { useRef, type ChangeEvent } from "react";

type Props = {
  selfImageUrl: string;
  opponentImageUrl: string;
  onSelfImageChange: (file: File | null) => void;
  onOpponentImageChange: (file: File | null) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  /** Disable interaction (e.g. while a prior submission is in flight). */
  disabled?: boolean;
};

export function DualUploadCard({
  selfImageUrl,
  opponentImageUrl,
  onSelfImageChange,
  onOpponentImageChange,
  onSubmit,
  isSubmitting,
  disabled,
}: Props) {
  const canSubmit = Boolean(selfImageUrl) && !isSubmitting && !disabled;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <UploadSlot
          label="Your squad"
          required
          imageUrl={selfImageUrl}
          onChange={onSelfImageChange}
          disabled={disabled}
        />
        <UploadSlot
          label="Opponent"
          hint="Optional · for counter-tactic"
          imageUrl={opponentImageUrl}
          onChange={onOpponentImageChange}
          disabled={disabled}
        />
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`w-full rounded-full px-5 py-3 text-sm font-semibold transition-all ${
          canSubmit
            ? "bg-valaccent text-valbg hover:bg-valhover shadow-cta-hover"
            : "bg-white/[0.08] text-valmuted cursor-not-allowed"
        }`}
      >
        {isSubmitting
          ? "Reading squads…"
          : !selfImageUrl
            ? "Upload your squad to start"
            : opponentImageUrl
              ? "Build counter-tactic plan"
              : "Build match plan"}
      </button>
    </div>
  );
}

function UploadSlot({
  label,
  hint,
  required,
  imageUrl,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  imageUrl: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onChange(file);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && inputRef.current?.click()}
      disabled={disabled}
      className={`group relative aspect-square w-full overflow-hidden rounded-2xl border-2 transition-all ${
        imageUrl
          ? "border-valaccent/60 bg-valaccent/[0.04]"
          : "border-valaccent/40 bg-valcard/40 hover:border-valaccent/70 hover:bg-valaccent/[0.04]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt={`${label} preview`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span
            onClick={handleClear}
            className="absolute right-2 top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-black/60 text-valtext ring-1 ring-white/20 hover:bg-black/80"
            aria-label={`Remove ${label}`}
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
          <div className="absolute bottom-2 left-2 right-2 text-left">
            <div className="text-xs font-semibold text-valtext">{label}</div>
            {hint ? (
              <div className="mt-0.5 text-[10px] text-valmuted">{hint}</div>
            ) : null}
          </div>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
          <svg viewBox="0 0 24 24" className="h-8 w-8 text-valaccent/60 group-hover:text-valaccent" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-valtext">
              {label}
              {required ? null : (
                <span className="ml-1 text-[10px] font-normal text-valmuted">
                  (optional)
                </span>
              )}
            </div>
            {hint ? (
              <div className="mt-1 text-[10px] leading-relaxed text-valmuted">
                {hint}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </button>
  );
}
