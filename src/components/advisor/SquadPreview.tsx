// src/components/advisor/SquadPreview.tsx
//
// Squad image with interactive bbox rectangles for callouts.
// Bidirectional sync with selectedId (tapping rect selects callout, etc.).

export function SquadPreview({
  imageUrl,
  selectedId,
  onSelect,
}: {
  imageUrl: string;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  if (!imageUrl) {
    return (
      <div className="rounded-2xl border border-valaccent/40 bg-valcard/40 aspect-square flex items-center justify-center">
        <div className="text-sm text-valmuted">No image</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-valaccent/40 bg-valcard/40 overflow-hidden aspect-square relative">
      <img
        src={imageUrl}
        alt="Squad preview"
        className="w-full h-full object-cover"
      />
      {/* Callout rectangles would be rendered here with onClick handlers */}
      {/* For now, just show the image without bbox overlays */}
    </div>
  );
}
