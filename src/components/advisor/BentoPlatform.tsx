"use client";

import type { Platform } from "@/lib/ai/valbriSquadAdvisorSchema";
import { BentoCard } from "./BentoCard";

type Props = {
  value: Platform;
  onChange: (p: Platform) => void;
  locked?: boolean;
};

const PLATFORMS: Platform[] = ["PlayStation", "Xbox", "PC"];

const ICON: Record<Platform, string> = {
  PlayStation: "PS",
  Xbox: "XB",
  PC: "PC",
};

export function BentoPlatform({ value, onChange, locked }: Props) {
  return (
    <BentoCard className="flex flex-col justify-between p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-valmuted">
        Platform
      </div>
      {locked ? (
        <div>
          <div className="text-base font-semibold text-valtext">{value}</div>
          <div className="mt-1 text-[11px] text-valmuted">Selected</div>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {PLATFORMS.map((p) => {
            const active = p === value;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onChange(p)}
                className={`flex items-center justify-between rounded-xl px-2.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-valaccent/12 text-valaccent"
                    : "bg-white/[0.03] text-valmuted hover:text-valtext"
                }`}
              >
                <span>{p}</span>
                <span className="text-[10px] font-semibold opacity-60">
                  {ICON[p]}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </BentoCard>
  );
}
