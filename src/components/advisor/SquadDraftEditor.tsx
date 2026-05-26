// src/components/advisor/SquadDraftEditor.tsx
//
// Step 1 confirmation UI: shows the SquadDraft the vision step produced and
// lets the user edit any field before submitting it as the confirmed Squad.

import { useState } from "react";
import type {
  Squad,
  SquadDraft,
  SquadPlayer,
} from "@/lib/ai/matchPlanSchema";

type Props = {
  draft: SquadDraft;
  onConfirm: (squad: Squad) => void;
  isSubmitting?: boolean;
};

export function SquadDraftEditor({ draft, onConfirm, isSubmitting }: Props) {
  const [formation, setFormation] = useState(draft.formation);
  const [players, setPlayers] = useState<SquadPlayer[]>(draft.players);

  function updatePlayer(idx: number, patch: Partial<SquadPlayer>) {
    setPlayers((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    );
  }

  function handleConfirm() {
    onConfirm({ formation, players });
  }

  const starters = players.filter((p) => p.isStarter);
  const bench = players.filter((p) => !p.isStarter);

  const confidenceColor =
    draft.confidence === "high"
      ? "text-valaccent"
      : draft.confidence === "medium"
        ? "text-amber-400"
        : "text-rose-400";

  return (
    <div className="rounded-3xl border border-white/[0.06] bg-valelev p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-valmuted">
            Squad detected
          </div>
          <h3 className="mt-1 text-base font-semibold text-valtext">
            Confirm your lineup
          </h3>
        </div>
        <span className={`text-xs font-semibold ${confidenceColor}`}>
          {draft.confidence} confidence
        </span>
      </div>

      {draft.notes ? (
        <p className="mt-2 text-xs leading-relaxed text-valmuted">{draft.notes}</p>
      ) : null}

      <label className="mt-4 block">
        <span className="text-xs text-valmuted">Formation</span>
        <input
          type="text"
          value={formation}
          onChange={(e) => setFormation(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/[0.08] bg-valcard px-3 py-2 text-sm text-valtext outline-none focus:border-valaccent/40"
          placeholder="e.g. 4-2-3-1"
        />
      </label>

      <div className="mt-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-valmuted">
          Starting XI
        </div>
        <ul className="mt-2 divide-y divide-white/[0.06]">
          {players.map((p, idx) =>
            p.isStarter ? (
              <PlayerRow
                key={idx}
                player={p}
                onChange={(patch) => updatePlayer(idx, patch)}
              />
            ) : null
          )}
        </ul>
      </div>

      {bench.length > 0 ? (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-valmuted">
            Bench
          </div>
          <ul className="mt-2 divide-y divide-white/[0.06]">
            {players.map((p, idx) =>
              !p.isStarter ? (
                <PlayerRow
                  key={idx}
                  player={p}
                  onChange={(patch) => updatePlayer(idx, patch)}
                />
              ) : null
            )}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleConfirm}
        disabled={isSubmitting || starters.length < 11}
        className={`mt-5 w-full rounded-full px-5 py-3 text-sm font-semibold transition-all ${
          isSubmitting || starters.length < 11
            ? "bg-white/[0.08] text-valmuted cursor-not-allowed"
            : "bg-valaccent text-valbg hover:bg-valhover shadow-cta-hover"
        }`}
      >
        {isSubmitting
          ? "Building your match plan…"
          : starters.length < 11
            ? `Need 11 starters (${starters.length}/11)`
            : "Confirm & build match plan"}
      </button>
    </div>
  );
}

function PlayerRow({
  player,
  onChange,
}: {
  player: SquadPlayer;
  onChange: (patch: Partial<SquadPlayer>) => void;
}) {
  return (
    <li className="flex items-center gap-2 py-2">
      <input
        type="text"
        value={player.position}
        onChange={(e) => onChange({ position: e.target.value })}
        className="w-14 rounded-lg border border-white/[0.08] bg-valcard px-2 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-valtext outline-none focus:border-valaccent/40"
      />
      <input
        type="text"
        value={player.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Player name"
        className="flex-1 rounded-lg border border-white/[0.08] bg-valcard px-3 py-1.5 text-sm text-valtext outline-none focus:border-valaccent/40"
      />
      <input
        type="number"
        value={player.rating ?? ""}
        onChange={(e) => {
          const v = e.target.value === "" ? undefined : Number(e.target.value);
          onChange({ rating: v });
        }}
        placeholder="OVR"
        min={40}
        max={99}
        className="w-16 rounded-lg border border-white/[0.08] bg-valcard px-2 py-1.5 text-center text-sm text-valtext outline-none focus:border-valaccent/40"
      />
    </li>
  );
}
