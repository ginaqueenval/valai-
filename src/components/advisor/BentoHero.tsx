"use client";

import type { ChangeEvent } from "react";
import type { PlayerCallout } from "@/lib/ai/valbriSquadAdvisorSchema";
import { BentoCard } from "./BentoCard";
import { SquadPreview } from "./SquadPreview";
import { severityStyle } from "@/lib/ui/severity";

type Props = {
  imageUrl: string;
  fileName: string;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  callouts?: PlayerCallout[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function BentoHero({
  imageUrl,
  fileName,
  onImageChange,
  callouts,
  selectedId,
  onSelect,
}: Props) {
  // POST-analysis: render SquadPreview
  if (imageUrl && callouts) {
    return (
      <BentoCard className="p-2.5">
        <SquadPreview
          imageUrl={imageUrl}
          callouts={callouts}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      </BentoCard>
    );
  }

  // image set but no analysis yet
  if (imageUrl) {
    return (
      <BentoCard interactive className="p-2.5">
        <label className="block cursor-pointer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={fileName || "squad screenshot"}
            className="block w-full rounded-2xl object-cover aspect-[4/5]"
          />
          <div className="mt-2 flex items-center justify-between px-2 text-[11px]">
            <span className="truncate text-valmuted">{fileName}</span>
            <span className="font-medium text-valaccent">Replace</span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onImageChange}
          />
        </label>
      </BentoCard>
    );
  }

  // PRE-analysis: render DropZone (large, dominant)
  return (
    <BentoCard interactive className="flex flex-col">
      <label className="flex flex-1 cursor-pointer flex-col items-center justify-center px-6 py-10 text-center min-h-[300px]">
        <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-valaccent/10 border border-valaccent/20">
          <svg
            className="h-7 w-7 text-valaccent"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="text-base font-semibold text-valtext">
          Add squad screenshot
        </div>
        <div className="mt-1.5 text-sm text-valmuted">Tap or drop here</div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageChange}
        />
      </label>
    </BentoCard>
  );
}

export { severityStyle };
