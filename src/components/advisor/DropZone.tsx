"use client";

import type { ChangeEvent } from "react";

type Props = {
  previewUrl: string;
  fileName: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

export function DropZone({ previewUrl, fileName, onChange }: Props) {
  if (previewUrl) {
    return (
      <label className="block cursor-pointer rounded-3xl border border-white/10 bg-black/20 p-3 transition hover:border-valaccent/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt={fileName || "squad screenshot"}
          className="mx-auto max-h-72 w-auto rounded-2xl object-contain"
        />
        <div className="mt-3 flex items-center justify-between px-2 text-xs">
          <span className="truncate text-valmuted">
            {fileName || "Squad screenshot"}
          </span>
          <span className="font-medium text-valaccent">Replace image</span>
        </div>
        <input type="file" accept="image/*" className="hidden" onChange={onChange} />
      </label>
    );
  }

  return (
    <label className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-white/10 bg-black/20 px-6 py-12 text-center transition hover:border-valaccent/40">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-valaccent/10 border border-valaccent/20">
        <svg
          className="h-5 w-5 text-valaccent"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>
      <div className="text-base font-semibold text-valtext">Add squad screenshot</div>
      <div className="mt-1 text-sm text-valmuted">Tap or drop here · PNG, JPG up to 10MB</div>
      <input type="file" accept="image/*" className="hidden" onChange={onChange} />
    </label>
  );
}
