// src/components/advisor/BentoPlatform.tsx
//
// Square card (C4) with platform segmented control inside.

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Platform } from "@/lib/ai/matchPlanSchema";

const PLATFORM_OPTIONS: Platform[] = ["PlayStation", "Xbox", "PC"];

export function BentoPlatform({
  value,
  onChange,
  disabled,
}: {
  value: Platform;
  onChange: (p: Platform) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.08] bg-valelev p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.12em] text-valmuted">
        Platform
      </div>
      <SegmentedControl
        options={PLATFORM_OPTIONS}
        value={value}
        onChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
