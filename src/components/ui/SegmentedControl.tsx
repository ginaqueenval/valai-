"use client";

type Props<T extends string> = {
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  className?: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className = "",
}: Props<T>) {
  return (
    <div className={`liquid-glass inline-flex rounded-full p-1 ${className}`}>
      {options.map((opt) => {
        const active = opt === value;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={
              active
                ? "rounded-full bg-valaccent px-5 py-2 text-sm font-semibold text-valbg shadow-sm relative z-10"
                : "rounded-full px-5 py-2 text-sm font-medium text-valmuted transition hover:text-valtext relative z-10"
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}
