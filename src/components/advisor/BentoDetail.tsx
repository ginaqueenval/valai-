// src/components/advisor/BentoDetail.tsx
//
// Wide C7 card. Pre-analysis: tactics textarea. Post-analysis: selected callout detail.

import { Textarea } from "@/components/ui/Textarea";
import type { MatchPlan } from "@/lib/ai/matchPlanSchema";

export function BentoDetail({
  mode,
  tactics,
  onTacticsChange,
  selectedCallout,
  disabled,
}: {
  mode: "pre" | "post";
  tactics: string;
  onTacticsChange: (t: string) => void;
  selectedCallout?: {
    position: string;
    severity: string;
    note: string;
    replacementProfile?: string;
  } | null;
  disabled?: boolean;
}) {
  if (mode === "pre") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-valelev p-4">
        <label className="block text-xs font-semibold uppercase tracking-[0.12em] text-valmuted mb-3">
          Tactics (optional)
        </label>
        <Textarea
          placeholder="Formation, mentality, instructions…"
          value={tactics}
          onChange={onTacticsChange}
          disabled={disabled}
          className="min-h-[100px]"
        />
      </div>
    );
  }

  // Post-analysis: detail view
  if (!selectedCallout) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-valelev p-4">
        <div className="text-center py-6 text-valmuted text-sm">
          Tap a callout to see details
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-valelev p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className={`text-xs font-semibold uppercase tracking-[0.08em] px-2 py-1 rounded-full ${
          selectedCallout.severity === "critical"
            ? "bg-red-500/20 text-red-400"
            : selectedCallout.severity === "warning"
            ? "bg-amber-400/20 text-amber-400"
            : "bg-valaccent/20 text-valaccent"
        }`}>
          {selectedCallout.severity}
        </div>
        <div className="text-sm font-semibold text-valtext">
          {selectedCallout.position}
        </div>
      </div>
      <p className="text-sm text-valmuted leading-relaxed">
        {selectedCallout.note}
      </p>
      {selectedCallout.replacementProfile && (
        <div className="mt-4 pt-3 border-t border-white/[0.06]">
          <div className="text-xs font-semibold uppercase tracking-[0.08em] text-valmuted mb-2">
            Replacement profile
          </div>
          <p className="text-sm text-valtext">{selectedCallout.replacementProfile}</p>
        </div>
      )}
    </div>
  );
}
