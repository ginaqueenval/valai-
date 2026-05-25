"use client";

import type { PlayerCallout } from "@/lib/ai/valbriSquadAdvisorSchema";
import { BentoCard } from "./BentoCard";
import { severityStyle } from "@/lib/ui/severity";
import { Textarea } from "@/components/ui/Textarea";

type Props =
  | {
      mode: "pre";
      tactics: string;
      onTacticsChange: (s: string) => void;
    }
  | {
      mode: "post";
      callout: PlayerCallout | null;
    };

export function BentoDetail(props: Props) {
  if (props.mode === "pre") {
    return (
      <BentoCard className="flex flex-col p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-valmuted">
          Tactics
        </div>
        <Textarea
          rows={3}
          value={props.tactics}
          onChange={(e) => props.onTacticsChange(e.target.value)}
          placeholder="Formation, mentality, instructions… (optional)"
          className="mt-2 flex-1 !rounded-2xl !bg-black/20"
        />
      </BentoCard>
    );
  }

  if (!props.callout) {
    return (
      <BentoCard className="flex flex-col items-start p-4">
        <div className="text-[11px] font-medium uppercase tracking-wider text-valmuted">
          Selection
        </div>
        <div className="mt-2 text-sm text-valtext">
          Tap a callout to see details
        </div>
        <p className="mt-1 text-xs text-valmuted leading-relaxed">
          Each card opens a note and a suggested replacement profile here.
        </p>
      </BentoCard>
    );
  }

  const c = props.callout;
  const style = severityStyle(c.severity);

  return (
    <BentoCard className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2.5">
        <span className={`h-2 w-2 rounded-full ${style.dotClass}`} />
        <span className="text-[10px] font-semibold rounded-md border border-white/15 px-1.5 py-0.5 text-valmuted">
          {c.position}
        </span>
        <span className={`text-[10px] font-semibold uppercase tracking-wider ${style.textClass}`}>
          {style.label}
        </span>
      </div>

      <div>
        <div className="text-sm font-semibold text-valtext leading-snug">
          {c.label}
        </div>
        <p className="mt-1.5 text-xs text-valmuted leading-relaxed">
          {c.note}
        </p>
      </div>

      {c.recommendedReplacement ? (
        <div className="rounded-2xl bg-valelev border border-white/[0.06] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-valaccent">
            Replacement
          </div>
          <div className="mt-1.5 text-sm font-semibold text-valtext">
            {c.recommendedReplacement.profile}
          </div>
          <p className="mt-1 text-xs text-valmuted leading-relaxed">
            {c.recommendedReplacement.reason}
          </p>
        </div>
      ) : null}
    </BentoCard>
  );
}
