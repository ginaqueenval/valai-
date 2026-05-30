// src/components/advisor/BentoHero.tsx
//
// Big C5 card (row 2 right). Pre-analysis: DropZone. Post-analysis: SquadPreview.

import { DropZone } from "@/components/advisor/DropZone";
import { SquadPreview } from "@/components/advisor/SquadPreview";

export function BentoHero({
  mode,
  imageUrl,
  onImageChange,
}: {
  mode: "pre" | "post";
  imageUrl: string;
  onImageChange: (file: File | null) => void;
}) {
  if (mode === "pre") {
    return (
      <div className="rounded-2xl border border-valaccent/40 bg-valcard/40 overflow-hidden">
        <DropZone imageUrl={imageUrl} onChange={onImageChange} />
      </div>
    );
  }

  // Post-analysis: show squad preview
  return <SquadPreview imageUrl={imageUrl} />;
}
