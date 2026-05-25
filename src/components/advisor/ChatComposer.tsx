"use client";

import { useState, type FormEvent } from "react";
import { Spinner } from "@/components/ui/Spinner";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  isSending: boolean;
};

export function ChatComposer({ value, onChange, onSubmit, isSending }: Props) {
  const [focused, setFocused] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    onSubmit();
  }

  const disabled = !value.trim() || isSending;

  return (
    <form
      onSubmit={handleSubmit}
      className={`liquid-glass relative flex items-center gap-2 rounded-full pl-5 pr-2 py-2 transition-all ${
        focused ? "is-focused" : ""
      }`}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Message Valai…"
        className="relative z-10 flex-1 bg-transparent py-1 text-base text-valtext placeholder:text-valmuted/70 outline-none"
      />
      <button
        type="submit"
        aria-label="Send"
        disabled={disabled}
        className={`relative z-10 grid h-10 w-10 place-items-center rounded-full transition ${
          disabled
            ? "bg-white/10 text-valmuted cursor-not-allowed"
            : "bg-valaccent text-valbg shadow-send-glow hover:bg-valhover"
        }`}
      >
        {isSending ? (
          <Spinner className="h-4 w-4" />
        ) : (
          <svg
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
          </svg>
        )}
      </button>
    </form>
  );
}
