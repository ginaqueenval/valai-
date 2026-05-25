"use client";

type Chip = {
  id: string;
  label: string;
  dotColor?: string;
  prefix?: string;
  active?: boolean;
};

type Props = {
  chips: Chip[];
  onSelect: (id: string) => void;
  emptyText?: string;
};

export function BentoChipStrip({ chips, onSelect, emptyText }: Props) {
  if (chips.length === 0 && emptyText) {
    return (
      <div className="px-2 py-3 text-center text-xs text-valmuted">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
      {chips.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onSelect(c.id)}
          className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
            c.active
              ? "border-valaccent/40 bg-valaccent/10 text-valaccent"
              : "border-white/10 bg-valcard text-valmuted hover:text-valtext hover:border-white/20"
          }`}
        >
          {c.dotColor ? (
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: c.dotColor }}
            />
          ) : null}
          {c.prefix ? (
            <span
              className={`text-[10px] font-semibold rounded-md border px-1 py-0.5 ${
                c.active
                  ? "border-valaccent/40 text-valaccent"
                  : "border-white/15 text-valmuted"
              }`}
            >
              {c.prefix}
            </span>
          ) : null}
          <span className="truncate max-w-[140px]">{c.label}</span>
        </button>
      ))}
    </div>
  );
}
