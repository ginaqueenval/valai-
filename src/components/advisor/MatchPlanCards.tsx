// src/components/advisor/MatchPlanCards.tsx
//
// Renders a MatchPlan as a stack of focused cards inside an AI message.
// Each card holds one section of the plan so the user can skim, expand
// mentally, and act.

import type {
  MatchPlan,
  PlayStyle,
  SwapCandidate,
  SwapSuggestion,
} from "@/lib/ai/matchPlanSchema";

type Props = {
  plan: MatchPlan;
  /** Style chips appear when an onPivot handler is provided. The chip for the
   *  plan's current style is hidden — pivoting to the same style is a no-op. */
  onPivot?: (style: PlayStyle) => void;
  /** Disable chips while a re-plan is in flight. */
  isPivoting?: boolean;
};

/** The 4 styles we surface as quick chips. Other styles are still reachable
 *  via free-form chat. We keep this set small so users don't get analysis
 *  paralysis. */
const PIVOT_STYLES: PlayStyle[] = [
  "possession",
  "counter-attack",
  "high-press",
  "wing-play",
];

const STYLE_LABEL: Record<PlayStyle, string> = {
  possession: "Possession",
  "counter-attack": "Counter-attack",
  "high-press": "High press",
  "tiki-taka": "Tiki-taka",
  "wing-play": "Wing play",
  "long-ball": "Long ball",
  balanced: "Balanced",
  "park-the-bus": "Park the bus",
  gegenpress: "Gegenpress",
};

function styleLabel(style: string): string {
  if (style in STYLE_LABEL) return STYLE_LABEL[style as PlayStyle];
  return style;
}

function SectionCard({
  eyebrow,
  children,
}: {
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-white/[0.06] bg-valelev p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-valmuted">
        {eyebrow}
      </div>
      <div className="mt-3 text-sm text-valtext leading-relaxed">{children}</div>
    </div>
  );
}

function Slider({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, (value / 10) * 100));
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-valmuted">{label}</span>
        <span className="text-xs font-semibold text-valtext tabular-nums">
          {value}/10
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-valaccent transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function MatchPlanCards({ plan, onPivot, isPivoting }: Props) {
  const tactics = plan.customTactics ?? {};

  // Headline + reasoning + chosen style live on one hero card.
  const hero = (
    <div className="rounded-3xl border border-valaccent/30 bg-gradient-to-br from-valaccent/[0.08] to-transparent p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-valaccent">
        Match plan · {styleLabel(plan.styleOfPlay)}
      </div>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-valtext">
        {plan.headline}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-valmuted">
        {plan.reasoning}
      </p>
    </div>
  );

  const formationCard = (
    <SectionCard eyebrow="Formation">
      <div className="text-2xl font-semibold tabular-nums text-valtext">
        {plan.formation.shape}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-valmuted">
        {plan.formation.note}
      </p>
    </SectionCard>
  );

  const hasSliders =
    typeof tactics.defensiveWidth === "number" ||
    typeof tactics.defensiveDepth === "number" ||
    typeof tactics.offensiveWidth === "number" ||
    typeof tactics.playersInBox === "number" ||
    typeof tactics.corners === "number" ||
    typeof tactics.freeKicks === "number";

  const tacticsCard = (
    <SectionCard eyebrow="Custom tactics">
      {tactics.defensiveStyle || tactics.offensiveStyle ? (
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {tactics.defensiveStyle ? (
            <div>
              <dt className="text-xs text-valmuted">Defensive style</dt>
              <dd className="text-valtext font-medium">{tactics.defensiveStyle}</dd>
            </div>
          ) : null}
          {tactics.offensiveStyle ? (
            <div>
              <dt className="text-xs text-valmuted">Offensive style</dt>
              <dd className="text-valtext font-medium">{tactics.offensiveStyle}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {hasSliders ? (
        <div className="mt-4 grid gap-3">
          {typeof tactics.defensiveWidth === "number" ? (
            <Slider label="Defensive width" value={tactics.defensiveWidth} />
          ) : null}
          {typeof tactics.defensiveDepth === "number" ? (
            <Slider label="Defensive depth" value={tactics.defensiveDepth} />
          ) : null}
          {typeof tactics.offensiveWidth === "number" ? (
            <Slider label="Attacking width" value={tactics.offensiveWidth} />
          ) : null}
          {typeof tactics.playersInBox === "number" ? (
            <Slider label="Players in box" value={tactics.playersInBox} />
          ) : null}
          {typeof tactics.corners === "number" ? (
            <Slider label="Corners" value={tactics.corners} />
          ) : null}
          {typeof tactics.freeKicks === "number" ? (
            <Slider label="Free kicks" value={tactics.freeKicks} />
          ) : null}
        </div>
      ) : null}
    </SectionCard>
  );

  const instructionsCard = plan.playerInstructions.length > 0 ? (
    <SectionCard eyebrow={`Player instructions · ${plan.playerInstructions.length}`}>
      <ul className="divide-y divide-white/[0.06]">
        {plan.playerInstructions.map((pi, idx) => (
          <li key={idx} className="py-3 first:pt-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-valtext">
                {pi.target}
              </span>
              {pi.position ? (
                <span className="text-[10px] font-medium uppercase tracking-wider text-valmuted">
                  {pi.position}
                </span>
              ) : null}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {pi.instructions.map((ins, i) => (
                <span
                  key={i}
                  className="rounded-full border border-valaccent/25 bg-valaccent/[0.06] px-2.5 py-0.5 text-xs font-medium text-valaccent"
                >
                  {ins}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-valmuted">
              {pi.rationale}
            </p>
          </li>
        ))}
      </ul>
    </SectionCard>
  ) : null;

  const watchOutCard = plan.watchOut.length > 0 ? (
    <SectionCard eyebrow="Watch out">
      <ul className="divide-y divide-white/[0.06]">
        {plan.watchOut.map((w, idx) => (
          <li key={idx} className="py-3 first:pt-0 last:pb-0">
            <div className="text-sm font-semibold text-valtext">{w.area}</div>
            <p className="mt-1 text-xs leading-relaxed text-valmuted">{w.risk}</p>
          </li>
        ))}
      </ul>
    </SectionCard>
  ) : null;

  const planBCard = (
    <SectionCard eyebrow="Plan B">
      <div className="grid gap-3">
        <div>
          <div className="text-xs font-semibold text-valtext">If losing</div>
          <p className="mt-1 text-xs leading-relaxed text-valmuted">
            {plan.planB.ifLosing}
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold text-valtext">If winning</div>
          <p className="mt-1 text-xs leading-relaxed text-valmuted">
            {plan.planB.ifWinning}
          </p>
        </div>
      </div>
    </SectionCard>
  );

  const alternativeCard = plan.alternativeStyle ? (
    <SectionCard eyebrow="Backup style">
      <div className="text-sm font-semibold text-valtext">
        {styleLabel(plan.alternativeStyle.style)}
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-valmuted">
        {plan.alternativeStyle.reasoning}
      </p>
    </SectionCard>
  ) : null;

  const matchupCard = plan.matchupHints ? (
    <SectionCard eyebrow="Matchup hints">
      <p className="text-xs leading-relaxed text-valmuted">{plan.matchupHints}</p>
    </SectionCard>
  ) : null;

  const hasSwaps = plan.swapSuggestions && plan.swapSuggestions.length > 0;
  const swapsCard = hasSwaps ? (
    <SectionCard
      eyebrow={`Swap suggestions · ${plan.swapSuggestions!.length}`}
    >
      <ul className="divide-y divide-white/[0.06]">
        {plan.swapSuggestions!.map((swap, idx) => (
          <li key={idx} className="py-4 first:pt-0 last:pb-0">
            <SwapSuggestionRow swap={swap} />
          </li>
        ))}
      </ul>
    </SectionCard>
  ) : null;

  const pivotCard = onPivot ? (
    <div className="rounded-3xl border border-white/[0.06] bg-valelev p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-valmuted">
        Try a different style
      </div>
      <p className="mt-2 text-xs leading-relaxed text-valmuted">
        I&apos;ll rebuild the plan and tell you what changes — including the player swaps that make it work.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PIVOT_STYLES.filter((s) => s !== plan.styleOfPlay).map((style) => (
          <button
            key={style}
            type="button"
            onClick={() => onPivot(style)}
            disabled={isPivoting}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              isPivoting
                ? "border-white/[0.06] bg-white/[0.04] text-valmuted cursor-not-allowed"
                : "border-valaccent/25 bg-valaccent/[0.06] text-valaccent hover:bg-valaccent/[0.12]"
            }`}
          >
            {styleLabel(style)}
          </button>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      {hero}
      {formationCard}
      {tacticsCard}
      {instructionsCard}
      {watchOutCard}
      {planBCard}
      {alternativeCard}
      {matchupCard}
      {swapsCard}
      {pivotCard}
    </div>
  );
}

function SwapSuggestionRow({ swap }: { swap: SwapSuggestion }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm font-semibold text-valtext">
          Replace {swap.targetPlayer}
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-valmuted">
          {swap.position}
        </span>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-valmuted">
        {swap.profile}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-valtext/80">
        {swap.reason}
      </p>

      {swap.candidates && swap.candidates.length > 0 ? (
        <div className="mt-3 grid gap-1.5">
          {swap.candidates.slice(0, 5).map((c) => (
            <SwapCandidatePill key={c.externalId} candidate={c} />
          ))}
        </div>
      ) : swap.candidates ? (
        <p className="mt-3 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2 text-[11px] text-valmuted">
          No DB matches yet — populate the player DB to see concrete options.
        </p>
      ) : null}
    </div>
  );
}

function SwapCandidatePill({ candidate }: { candidate: SwapCandidate }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-valcard px-3 py-2">
      <div className="text-sm font-semibold tabular-nums text-valaccent w-7 text-center">
        {candidate.overall}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-valtext truncate">
          {candidate.name}
        </div>
        <div className="text-[10px] text-valmuted tabular-nums">
          PAC {candidate.pace} · SHO {candidate.shooting} · PAS {candidate.passing} · DRI {candidate.dribbling} · DEF {candidate.defending} · PHY {candidate.physical}
        </div>
      </div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-valmuted">
        {candidate.position}
      </span>
    </div>
  );
}
