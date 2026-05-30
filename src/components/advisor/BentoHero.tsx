// src/components/advisor/BentoHero.tsx
//
// Big C5 card (row 2 right). Pre-analysis: DropZone. Post-analysis: SquadPreview.

import { DropZone } from "@/components/advisor/DropZone";

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
  if (!imageUrl) {
    return (
      <div className="rounded-2xl border border-valaccent/40 bg-valcard/40 flex items-center justify-center aspect-square">
        <div className="text-center text-valmuted text-sm">
          No squad preview
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-valaccent/40 bg-valcard/40 overflow-hidden aspect-square">
      <img
        src={imageUrl}
        alt="Squad preview"
        className="w-full h-full object-cover"
      />
    </div>
  );
}
