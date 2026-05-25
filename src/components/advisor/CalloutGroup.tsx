"use client";

import type { PlayerCallout } from "@/lib/ai/valbriSquadAdvisorSchema";
import { severityStyle } from "@/lib/ui/severity";
import { GroupedList } from "@/components/ui/Card";
import { ChevronRight } from "@/components/ui/Chevron";
import { calloutId } from "./SquadPreview";

type Props = {
  callouts: PlayerCallout[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

export function CalloutGroup({ callouts, selectedId, onSelect }: Props) {
  if (callouts.length === 0) {
    return (
      <div className="rounded-3xl border border-white/[0.06] bg-valelev px-5 py-6 text-center text-sm text-valmuted">
        No callouts in this analysis.
      </div>
    );
  }

  return (
    <GroupedList>
      {callouts.map((c, i) => {
        const id = calloutId(c, i);
        const style = severityStyle(c.severity);
        const expanded = id === selectedId;
        return (
          <div key={id} className={expanded ? "bg-white/[0.02]" : ""}>
            <button
              type="button"
              onClick={() => onSelect(expanded ? null : id)}
              className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-white/[0.03]"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${style.dotClass}`} />
              <span
                className={`shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold ${
                  expanded
                    ? "border-valaccent/40 bg-valaccent/10 text-valaccent"
                    : "border-white/15 text-valmuted"
                }`}
              >
                {c.position}
              </span>
              <span className="flex-1 min-w-0 text-sm font-semibold truncate">
                {c.label}
              </span>
              <span className={`text-xs font-medium ${style.textClass}`}>
                {style.label}
              </span>
              <ChevronRight
                className={`h-4 w-4 shrink-0 transition-transform ${
                  expanded ? "rotate-90 text-valaccent" : "text-valmuted"
                }`}
              />
            </button>

            {expanded ? (
              <div className="-mt-1 px-5 pb-5 animate-slide-up">
                <p className="text-sm leading-relaxed text-valmuted">{c.note}</p>

                {c.recommendedReplacement ? (
                  <div className="mt-4 rounded-2xl bg-valbg border border-white/[0.06] p-4">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-valaccent">
                      Replacement profile
                    </div>
                    <div className="mt-2 flex items-baseline justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-base font-semibold">
                          {c.recommendedReplacement.profile}
                        </div>
                        <p className="mt-1 text-xs text-valmuted leading-relaxed">
                          {c.recommendedReplacement.reason}
                        </p>
                      </div>
                      {c.recommendedReplacement.communitySignal ? (
                        <div className="shrink-0 text-right">
                          <CommunityChip
                            bucket={c.recommendedReplacement.communitySignal.bucket}
                            positive={c.recommendedReplacement.communitySignal.positiveCount}
                            negative={c.recommendedReplacement.communitySignal.negativeCount}
                          />
                          {c.recommendedReplacement.communitySignal.topQuote ? (
                            <div className="mt-1 max-w-[180px] truncate text-[11px] italic text-valmuted">
                              &ldquo;{c.recommendedReplacement.communitySignal.topQuote}&rdquo;
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </GroupedList>
  );
}

function CommunityChip({
  bucket,
  positive,
  negative,
}: {
  bucket: "positive" | "negative" | "mixed";
  positive: number;
  negative: number;
}) {
  const total = positive + negative;
  const pct = total > 0 ? Math.round((positive / total) * 100) : 0;
  const tone =
    bucket === "positive"
      ? "bg-valaccent/10 border-valaccent/25 text-valaccent"
      : bucket === "negative"
      ? "bg-[#FF5C7A]/10 border-[#FF5C7A]/25 text-[#FF5C7A]"
      : "bg-[#FFB860]/10 border-[#FFB860]/25 text-[#FFB860]";
  const dot =
    bucket === "positive"
      ? "bg-valaccent"
      : bucket === "negative"
      ? "bg-[#FF5C7A]"
      : "bg-[#FFB860]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${tone}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {pct}% positive
    </span>
  );
}
