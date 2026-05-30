// src/components/advisor/BentoStat.tsx
//
// Small stat tile (3-up in row 1 of bento).
// Props: count (number | "—"), label, tone.

import { PulseDot } from "@/components/ui/PulseDot";

type BentoStatTone = "critical" | "accent" | "warning";

const toneStyles: Record<BentoStatTone, { dot: string; label: string }> = {
  critical: { dot: "bg-red-500", label: "text-red-400" },
  accent: { dot: "bg-[#00FF9A]", label: "text-[#00FF9A]" },
  warning: { dot: "bg-amber-400", label: "text-amber-400" },
};

export function BentoStat({
  count,
  label,
  tone,
}: {
  count: number | string;
  label: string;
  tone: BentoStatTone;
}) {
  const style = toneStyles[tone];

  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-white/[0.08] bg-valelev px-4 py-6 text-center">
      <div className="text-2xl font-semibold text-valtext">
        {typeof count === "number" ? count : count}
      </div>
      <div className="flex items-center gap-1.5">
        <div className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <div className={`text-xs font-semibold uppercase tracking-[0.08em] ${style.label}`}>
          {label}
        </div>
      </div>
    </div>
  );
}
