"use client";

import type { PlayerCallout } from "@/lib/ai/valbriSquadAdvisorSchema";
import { severityStyle } from "@/lib/ui/severity";

type Props = {
  imageUrl: string;
  callouts: PlayerCallout[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function calloutId(c: PlayerCallout, i: number) {
  return `${c.side}-${c.position}-${i}`;
}

export function SquadPreview({ imageUrl, callouts, selectedId, onSelect }: Props) {
  return (
    <div className="relative rounded-2xl overflow-hidden bg-black/30 border border-white/[0.06]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="squad screenshot"
        className="block w-full h-auto"
      />
      {callouts.map((c, i) => {
        const id = calloutId(c, i);
        const style = severityStyle(c.severity);
        const selected = id === selectedId;
        const { x, y, w, h } = c.bbox;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(selected ? null : id)}
            aria-label={`Callout ${i + 1}: ${c.label}`}
            className={`absolute rounded-md border-2 transition ${style.ringClass} ${style.tintClass} ${
              selected
                ? "ring-2 ring-valaccent/40 shadow-[0_0_24px_rgba(0,255,154,0.25)]"
                : "hover:brightness-125"
            }`}
            style={{
              left: `${x * 100}%`,
              top: `${y * 100}%`,
              width: `${w * 100}%`,
              height: `${h * 100}%`,
            }}
          >
            <span
              className={`absolute -top-2 -left-2 grid h-5 w-5 place-items-center rounded-md bg-valbg border ${
                selected ? "border-valaccent/40" : "border-white/15"
              } text-[10px] font-semibold ${style.textClass}`}
            >
              {i + 1}
            </span>
          </button>
        );
      })}
    </div>
  );
}
