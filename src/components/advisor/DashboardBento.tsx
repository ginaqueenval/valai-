"use client";

import type { ChangeEvent } from "react";
import type {
  PlayerCallout,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";
import { BentoStat } from "./BentoStat";
import { BentoHero } from "./BentoHero";

type Props = {
  result: ValbriSquadAdvisorResult | null;
  imagePreviewUrl: string;
  selectedImageName: string;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;

  selectedCalloutId: string | null;
  setSelectedCalloutId: (id: string | null) => void;
};

export function DashboardBento(props: Props) {
  const {
    result,
    imagePreviewUrl,
    selectedImageName,
    onImageChange,
    selectedCalloutId,
    setSelectedCalloutId,
  } = props;

  const isPost = result !== null;
  const callouts: PlayerCallout[] = result?.playerCallouts ?? [];
  const counts = {
    critical: callouts.filter((c) => c.severity === "critical").length,
    warning: callouts.filter((c) => c.severity === "warning").length,
    total: callouts.length,
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-3 gap-3">
        <BentoStat
          count={isPost ? counts.warning : null}
          label="Warning"
          tone="warning"
        />
        <BentoStat
          count={isPost ? counts.total : null}
          label="Callouts"
          tone="accent"
        />
        <BentoStat
          count={isPost ? counts.critical : null}
          label="Critical"
          tone="critical"
        />
      </div>

      <BentoHero
        imageUrl={imagePreviewUrl}
        fileName={selectedImageName}
        onImageChange={onImageChange}
        callouts={isPost ? callouts : undefined}
        selectedId={selectedCalloutId}
        onSelect={setSelectedCalloutId}
      />
    </div>
  );
}
