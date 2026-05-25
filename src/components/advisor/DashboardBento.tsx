"use client";

import type { ChangeEvent } from "react";
import type {
  DivisionLevel,
  Goal,
  PlayerCallout,
  Platform,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";
import { BentoStat } from "./BentoStat";
import { BentoPlatform } from "./BentoPlatform";
import { BentoDivision } from "./BentoDivision";
import { BentoHero } from "./BentoHero";
import { BentoChipStrip } from "./BentoChipStrip";
import { BentoDetail } from "./BentoDetail";
import { BentoAction } from "./BentoAction";
import { severityStyle } from "@/lib/ui/severity";
import { calloutId } from "./SquadPreview";

const GOAL_OPTIONS: Goal[] = [
  "Best Overall Improvement",
  "Better Attack",
  "Better Defense",
  "Better Tactics",
  "Weekend League",
];

const GOAL_SHORT: Record<Goal, string> = {
  "Best Overall Improvement": "Overall",
  "Better Attack": "Attack",
  "Better Defense": "Defense",
  "Better Tactics": "Tactics",
  "Weekend League": "Weekend",
};

type Props = {
  result: ValbriSquadAdvisorResult | null;
  imagePreviewUrl: string;
  selectedImageName: string;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;

  platform: Platform;
  setPlatform: (p: Platform) => void;
  divisionLevel: DivisionLevel;
  setDivisionLevel: (d: DivisionLevel) => void;
  goal: Goal;
  setGoal: (g: Goal) => void;

  currentTactics: string;
  setCurrentTactics: (s: string) => void;

  isLoading: boolean;
  onRun: () => void;

  selectedCalloutId: string | null;
  setSelectedCalloutId: (id: string | null) => void;
};

export function DashboardBento(props: Props) {
  const {
    result,
    imagePreviewUrl,
    selectedImageName,
    onImageChange,
    platform,
    setPlatform,
    divisionLevel,
    setDivisionLevel,
    goal,
    setGoal,
    currentTactics,
    setCurrentTactics,
    isLoading,
    onRun,
    selectedCalloutId,
    setSelectedCalloutId,
  } = props;

  const isPost = result !== null;
  const callouts: PlayerCallout[] = result?.playerCallouts ?? [];
  const counts = {
    critical: callouts.filter((c) => c.severity === "critical").length,
    warning: callouts.filter((c) => c.severity === "warning").length,
    info: callouts.filter((c) => c.severity === "info").length,
    total: callouts.length,
  };

  const selectedCallout =
    callouts.find((c, i) => calloutId(c, i) === selectedCalloutId) ?? null;

  // Build chip strip data
  const chips = isPost
    ? callouts.map((c, i) => {
        const id = calloutId(c, i);
        return {
          id,
          label: c.label,
          prefix: c.position,
          dotColor:
            c.severity === "critical"
              ? "#FF5C7A"
              : c.severity === "warning"
              ? "#FFB860"
              : "#00FF9A",
          active: id === selectedCalloutId,
        };
      })
    : GOAL_OPTIONS.map((g) => ({
        id: g,
        label: GOAL_SHORT[g],
        active: g === goal,
      }));

  function handleChipSelect(id: string) {
    if (isPost) {
      setSelectedCalloutId(id === selectedCalloutId ? null : id);
    } else {
      setGoal(id as Goal);
    }
  }

  return (
    <div className="flex flex-col gap-2.5">
      {/* Row 1: 3 stat tiles */}
      <div className="grid grid-cols-3 gap-2.5">
        <BentoStat
          count={isPost ? counts.critical : null}
          label="Critical"
          tone="critical"
        />
        <BentoStat
          count={isPost ? counts.total : null}
          label="Callouts"
          tone="accent"
        />
        <BentoStat
          count={isPost ? counts.warning : null}
          label="Warning"
          tone="warning"
        />
      </div>

      {/* Row 2: 2 small stacked left + BIG right */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="col-span-1 grid grid-rows-2 gap-2.5">
          <BentoPlatform value={platform} onChange={setPlatform} locked={isPost} />
          <BentoDivision value={divisionLevel} onChange={setDivisionLevel} />
        </div>
        <div className="col-span-2">
          <BentoHero
            imageUrl={imagePreviewUrl}
            fileName={selectedImageName}
            onImageChange={onImageChange}
            callouts={isPost ? callouts : undefined}
            selectedId={selectedCalloutId}
            onSelect={setSelectedCalloutId}
          />
        </div>
      </div>

      {/* Chip strip */}
      <div className="px-0.5">
        <BentoChipStrip
          chips={chips}
          onSelect={handleChipSelect}
          emptyText={isPost ? "No callouts in this analysis." : undefined}
        />
      </div>

      {/* Row 4: wide left + small right */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="col-span-2">
          {isPost ? (
            <BentoDetail mode="post" callout={selectedCallout} />
          ) : (
            <BentoDetail
              mode="pre"
              tactics={currentTactics}
              onTacticsChange={setCurrentTactics}
            />
          )}
        </div>
        <div className="col-span-1">
          {isPost ? (
            <BentoAction mode="post" total={counts.total} />
          ) : (
            <BentoAction
              mode="pre"
              onRun={onRun}
              disabled={!imagePreviewUrl}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export { severityStyle };
