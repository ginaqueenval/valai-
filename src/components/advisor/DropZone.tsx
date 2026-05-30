// src/components/advisor/DropZone.tsx
//
// Large upload area with drag-and-drop support.

import { useRef, ChangeEvent } from "react";

export function DropZone({
  imageUrl,
  onChange,
  disabled,
}: {
  imageUrl: string;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | null) {
    onChange(file);
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file?.type.startsWith("image/")) {
      handleFile(file);
    }
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    handleFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <button
      type="button"
      onClick={() => !disabled && inputRef.current?.click()}
      disabled={disabled}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`group relative w-full aspect-square overflow-hidden rounded-2xl border-2 transition-all ${
        imageUrl
          ? "border-valaccent/60 bg-valaccent/[0.04]"
          : "border-dashed border-valaccent/40 bg-valcard/40 hover:border-valaccent/70 hover:bg-valaccent/[0.04]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleInputChange}
        className="hidden"
      />

      {imageUrl ? (
        <>
          <img
            src={imageUrl}
            alt="Squad preview"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <span
            onClick={handleClear}
            className="absolute right-2 top-2 grid h-7 w-7 cursor-pointer place-items-center rounded-full bg-black/60 text-valtext ring-1 ring-white/20 hover:bg-black/80 transition"
            aria-label="Remove image"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </span>
          <div className="absolute bottom-2 left-2 right-2 text-left">
            <div className="text-xs font-semibold text-valtext">Squad screenshot</div>
            <div className="mt-0.5 text-[10px] text-valmuted">Tap to change</div>
          </div>
        </>
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
          <svg
            viewBox="0 0 24 24"
            className="h-8 w-8 text-valaccent/60 group-hover:text-valaccent transition"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="9" cy="9" r="2" />
            <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
          </svg>
          <div>
            <div className="text-sm font-semibold text-valtext">Add squad screenshot</div>
            <div className="mt-1 text-[10px] leading-relaxed text-valmuted">Tap or drop here</div>
          </div>
        </div>
      )}
    </button>
  );
}
