// src/components/advisor/DashboardTitle.tsx
//
// Compact title row at top of dashboard: eyebrow + large title + status pill.

import { StatusPill } from "@/components/ui/StatusPill";
import { PulseDot } from "@/components/ui/PulseDot";

export function DashboardTitle({
  isReady,
}: {
  isReady: boolean;
}) {
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-valmuted mb-1">
        AI Squad Advisor
      </div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl md:text-5xl font-semibold tracking-tight">
          Squad Advisor
        </h1>
        <StatusPill>
          {isReady ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-valaccent" />
              Analysis ready
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <PulseDot className="h-2 w-2" />
              Standing by
            </span>
          )}
        </StatusPill>
      </div>
    </div>
  );
}
