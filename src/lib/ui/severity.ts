import type { PlayerCalloutSeverity } from "@/lib/ai/valbriSquadAdvisorSchema";

export type SeverityStyle = {
  dotClass: string;
  textClass: string;
  ringClass: string;
  tintClass: string;
  borderClass: string;
  label: string;
};

const STYLES: Record<PlayerCalloutSeverity, SeverityStyle> = {
  critical: {
    dotClass: "bg-[#FF5C7A]",
    textClass: "text-[#FF5C7A]",
    ringClass: "border-[#FF5C7A]",
    tintClass: "bg-[#FF5C7A]/10",
    borderClass: "border-[#FF5C7A]/25",
    label: "Critical",
  },
  warning: {
    dotClass: "bg-[#FFB860]",
    textClass: "text-[#FFB860]",
    ringClass: "border-[#FFB860]",
    tintClass: "bg-[#FFB860]/10",
    borderClass: "border-[#FFB860]/25",
    label: "Warning",
  },
  info: {
    dotClass: "bg-[#00FF9A]",
    textClass: "text-[#00FF9A]",
    ringClass: "border-[#00FF9A]",
    tintClass: "bg-[#00FF9A]/10",
    borderClass: "border-[#00FF9A]/25",
    label: "Info",
  },
};

export function severityStyle(s: PlayerCalloutSeverity): SeverityStyle {
  return STYLES[s];
}
