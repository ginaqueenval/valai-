"use client";

import type { DivisionLevel } from "@/lib/ai/valbriSquadAdvisorSchema";
import { BentoCard } from "./BentoCard";
import { ChevronRight } from "@/components/ui/Chevron";

const DIVISION_OPTIONS: DivisionLevel[] = [
  "Division 10-8",
  "Division 7-5",
  "Division 4-2",
  "Division 1",
  "Elite",
];

type Props = {
  value: DivisionLevel;
  onChange: (d: DivisionLevel) => void;
};

export function BentoDivision({ value, onChange }: Props) {
  return (
    <BentoCard className="flex flex-col justify-between p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-valmuted">
        Division
      </div>
      <label className="relative flex items-end justify-between gap-2 cursor-pointer">
        <div className="min-w-0">
          <div className="text-base font-semibold text-valtext truncate">{value}</div>
          <div className="mt-0.5 text-[11px] text-valmuted">Tap to change</div>
        </div>
        <ChevronRight className="h-4 w-4 text-valmuted shrink-0" />
        <select
          aria-label="Division Level"
          value={value}
          onChange={(e) => onChange(e.target.value as DivisionLevel)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {DIVISION_OPTIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </label>
    </BentoCard>
  );
}
