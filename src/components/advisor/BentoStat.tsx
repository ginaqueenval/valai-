import { BentoCard } from "./BentoCard";

type Tone = "accent" | "critical" | "warning";

type Props = {
  count: number | null;
  label: string;
  tone: Tone;
};

const TONE: Record<Tone, { dot: string; text: string; tint: string }> = {
  accent: { dot: "bg-valaccent", text: "text-valaccent", tint: "bg-valaccent/[0.06]" },
  critical: { dot: "bg-[#FF5C7A]", text: "text-[#FF5C7A]", tint: "bg-[#FF5C7A]/[0.06]" },
  warning: { dot: "bg-[#FFB860]", text: "text-[#FFB860]", tint: "bg-[#FFB860]/[0.06]" },
};

export function BentoStat({ count, label, tone }: Props) {
  const t = TONE[tone];
  const hasData = count !== null;
  return (
    <BentoCard className="flex flex-col justify-between p-4">
      <div className={`h-2 w-2 rounded-full ${hasData ? t.dot : "bg-white/15"}`} />
      <div>
        <div
          className={`text-3xl md:text-4xl font-semibold tracking-tight tabular-nums ${
            hasData ? t.text : "text-valmuted/50"
          }`}
        >
          {hasData ? count : "—"}
        </div>
        <div className="mt-1 text-[11px] font-medium uppercase tracking-wider text-valmuted">
          {label}
        </div>
      </div>
    </BentoCard>
  );
}
