// src/components/advisor/BentoChipStrip.tsx
//
// Horizontal scrollable chip row — generic for goals (pre) or callout navigator (post).

export interface ChipItem {
  id: string;
  label: string;
  dotColor?: string; // For severity color on callouts; omit for goals
  active?: boolean;
}

export function BentoChipStrip({
  items,
  onSelect,
  disabled,
}: {
  items: ChipItem[];
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="scrollbar-hide flex gap-2 overflow-x-auto px-1 py-2">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => !disabled && onSelect(item.id)}
          disabled={disabled}
          className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all ${
            item.active
              ? "bg-valaccent/20 border border-valaccent/60 text-valaccent"
              : "border border-white/[0.08] bg-valelev text-valmuted hover:border-white/[0.12] hover:text-valtext"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          {item.dotColor && (
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: item.dotColor }}
            />
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}
