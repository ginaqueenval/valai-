// src/components/advisor/StreamComposer.tsx
//
// Unified composer for the chat-stream UI. Supports:
//   - text input
//   - optional attached image (squad screenshot) with a preview chip
//   - send button (disabled until there's something to send)

"use client";

import { useRef, type ChangeEvent, type FormEvent } from "react";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  value: string;
  onChange: (v: string) => void;
  attachedImage: File | null;
  attachedImageUrl: string;
  onAttachImage: (file: File | null) => void;
  onSubmit: () => void;
  isSending: boolean;
  /** Controls placeholder copy. */
  mode: "needs-squad" | "chat";
  /** When true, prevent sending without an image. */
  requireImage?: boolean;
};

export function StreamComposer({
  value,
  onChange,
  attachedImage,
  attachedImageUrl,
  onAttachImage,
  onSubmit,
  isSending,
  mode,
  requireImage,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    onAttachImage(file);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    onSubmit();
  }

  const canSend = requireImage
    ? Boolean(attachedImage)
    : Boolean(value.trim()) || Boolean(attachedImage);

  const disabled = !canSend || isSending;

  const placeholder =
    mode === "needs-squad"
      ? "Add a sentence about your goal (optional)…"
      : "Ask a follow-up…";

  return (
    <form
      onSubmit={handleSubmit}
      className="liquid-glass flex flex-col gap-2 rounded-3xl px-3 pt-2 pb-2"
    >
      {attachedImageUrl ? (
        <div className="flex items-center gap-2 px-1 pt-1">
          <div className="relative">
            <img
              src={attachedImageUrl}
              alt="Squad attachment preview"
              className="h-14 w-14 rounded-xl border border-white/[0.08] object-cover"
            />
            <button
              type="button"
              onClick={() => onAttachImage(null)}
              aria-label="Remove image"
              className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-valcard text-valtext shadow ring-1 ring-white/[0.12] hover:bg-valelev"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
          <div className="text-xs text-valmuted truncate">
            Squad attached · ready to extract
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          aria-label="Attach squad screenshot"
          className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.06] text-valtext transition hover:bg-white/[0.1]"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.5L13.5 20a5 5 0 01-7-7L14 5.5a3.5 3.5 0 014.95 4.95L11.5 18a2 2 0 11-2.83-2.83l6.36-6.36" />
          </svg>
        </button>

        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent px-1 py-2 text-base text-valtext placeholder:text-valmuted/70 outline-none"
        />

        <button
          type="submit"
          aria-label="Send"
          disabled={disabled}
          className={`grid h-10 w-10 place-items-center rounded-full transition ${
            disabled
              ? "bg-white/[0.08] text-valmuted cursor-not-allowed"
              : "bg-valaccent text-valbg shadow-send-glow hover:bg-valhover"
          }`}
        >
          {isSending ? (
            <Spinner className="h-4 w-4" />
          ) : (
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19V5" />
              <path d="M5 12l7-7 7 7" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
