"use client";

import { ChevronRight } from "./Chevron";

type EditableProps<T extends string> = {
  label: string;
  hint?: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
};

export function EditableListRow<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: EditableProps<T>) {
  return (
    <label className="relative flex w-full items-center justify-between px-5 py-4 transition hover:bg-white/[0.03] cursor-pointer">
      <div className="min-w-0">
        <div className="text-sm font-medium text-valtext">{label}</div>
        {hint ? <div className="mt-0.5 text-xs text-valmuted">{hint}</div> : null}
      </div>
      <div className="flex items-center gap-2 text-valmuted">
        <span className="text-sm">{value}</span>
        <ChevronRight />
      </div>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </label>
  );
}
