// src/components/advisor/DashboardBento.tsx
//
// Bento grid orchestrator. Renders 4 rows:
// Row 1: 3 stat tiles (C1, C2, C3)
// Row 2: 2 small stacked left (C4, C6) + BIG right (C5)
// Row 3: Pill strip (goals or callouts)
// Row 4: Wide left (C7 detail) + small right (C8 action)

import { BentoStat } from "./BentoStat";
import { BentoPlatform } from "./BentoPlatform";
import { BentoDivision } from "./BentoDivision";
import { BentoHero } from "./BentoHero";
import { BentoChipStrip, type ChipItem } from "./BentoChipStrip";
import { BentoDetail } from "./BentoDetail";
import { BentoAction } from "./BentoAction";
import type { Platform } from "@/lib/ai/matchPlanSchema";

export function DashboardBento({
  mode,
  isLoading,
  onAnalyzeClick,
  selfImageUrl,
  onSelfImageChange,
  platform,
  onPlatformChange,
  divisionLevel,
  onDivisionChange,
  currentTactics,
  onTacticsChange,
  stats,
  chipItems,
  onChipSelect,
  selectedCallout,
  disabled,
}: {
  mode: "pre" | "post";
  isLoading: boolean;
  onAnalyzeClick: () => void;
  selfImageUrl: string;
  onSelfImageChange: (file: File | null) => void;
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
  divisionLevel: string;
  onDivisionChange: (d: string) => void;
  currentTactics: string;
  onTacticsChange: (t: string) => void;
  stats?: {
    critical: number | "—";
    callouts: number | "—";
    warning: number | "—";
  };
  chipItems: ChipItem[];
  onChipSelect: (id: string) => void;
  selectedCallout?: {
    position: string;
    severity: string;
    note: string;
    replacementProfile?: string;
  } | null;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-4">
      {/* Row 1: 3 stat tiles */}
      {mode === "post" && stats && (
        <div className="grid grid-cols-3 gap-3">
          <BentoStat
            count={stats.critical}
            label="Critical"
            tone="critical"
          />
          <BentoStat
            count={stats.callouts}
            label="Callouts"
            tone="accent"
          />
          <BentoStat
            count={stats.warning}
            label="Warning"
            tone="warning"
          />
        </div>
      )}

      {/* Row 2: Left column (2×1 stacked) + Right column (BIG) */}
      <div className="grid grid-cols-3 gap-3">
        {/* Left column: Platform + Division */}
        <div className="flex flex-col gap-3">
          <BentoPlatform
            value={platform}
            onChange={onPlatformChange}
            disabled={disabled}
          />
          <BentoDivision
            value={divisionLevel}
            onChange={onDivisionChange}
            disabled={disabled}
          />
        </div>

        {/* Right column: Big hero card (spans 2 columns) */}
        <div className="col-span-2">
          <BentoHero
            mode={mode}
            imageUrl={selfImageUrl}
            onImageChange={onSelfImageChange}
          />
        </div>
      </div>

      {/* Row 3: Chip strip (goals or callouts) */}
      <BentoChipStrip
        items={chipItems}
        onSelect={onChipSelect}
        disabled={disabled}
      />

      {/* Row 4: Wide left (detail) + small right (action) */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <BentoDetail
            mode={mode}
            tactics={currentTactics}
            onTacticsChange={onTacticsChange}
            selectedCallout={selectedCallout}
            disabled={disabled}
          />
        </div>
        <BentoAction
          mode={mode}
          isLoading={isLoading}
          onAction={onAnalyzeClick}
          disabled={disabled}
        />
      </div>
    </div>
  );
}
