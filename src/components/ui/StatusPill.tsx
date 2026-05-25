import type { ReactNode } from "react";
import { PulseDot } from "./PulseDot";

type Props = {
  children: ReactNode;
  dot?: boolean;
  tone?: "accent" | "critical" | "warning" | "muted";
  className?: string;
};

const TONE: Record<NonNullable<Props["tone"]>, string> = {
  accent: "bg-[#00FF9A]/10 border-[#00FF9A]/25 text-[#00FF9A]",
  critical: "bg-[#FF5C7A]/10 border-[#FF5C7A]/25 text-[#FF5C7A]",
  warning: "bg-[#FFB860]/10 border-[#FFB860]/25 text-[#FFB860]",
  muted: "bg-white/[0.04] border-white/10 text-valmuted",
};

export function StatusPill({ children, dot, tone = "accent", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium ${TONE[tone]} ${className}`}
    >
      {dot ? <PulseDot /> : null}
      {children}
    </span>
  );
}
