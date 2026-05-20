// src/app/ai-squad-advisor/page.tsx

"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  DivisionLevel,
  Goal,
  Platform,
  PlayerCallout,
  PlayerCalloutSeverity,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";

const ACCENT = "#3DDBC1";

function severityColor(s: PlayerCalloutSeverity) {
  if (s === "critical") return "#FF6B6B";
  if (s === "warning") return "#FFB860";
  return ACCENT;
}

function useIsMobilePortrait() {
  const [v, setV] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(
      "(max-width: 900px) and (orientation: portrait)"
    );
    const update = () => setV(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return v;
}

function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

export default function AiSquadAdvisorPage() {
  const [result, setResult] = useState<ValbriSquadAdvisorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const [platform, setPlatform] = useState<Platform>("PlayStation");
  const [divisionLevel, setDivisionLevel] =
    useState<DivisionLevel>("Division 7-5");
  const [goal, setGoal] = useState<Goal>("Best Overall Improvement");
  const [currentTactics, setCurrentTactics] = useState("");

  const [analysisMode, setAnalysisMode] = useState(false);
  const isMobilePortrait = useIsMobilePortrait();
  useLockBodyScroll(analysisMode);

  useEffect(() => {
    if (result) setAnalysisMode(true);
  }, [result]);

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    setSelectedImageName(file.name);
    setImagePreviewUrl(URL.createObjectURL(file));
    setErrorMessage("");
  }

  async function handleAnalyzeClick() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      if (!selectedImageFile) {
        throw new Error("Please upload a squad screenshot first.");
      }

      const formData = new FormData();
      formData.append("squadImage", selectedImageFile);
      formData.append("platform", platform);
      formData.append("divisionLevel", divisionLevel);
      formData.append("goal", goal);
      formData.append("currentTactics", currentTactics);

      const response = await fetch("/api/ai/squad-analysis", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success || !data?.result) {
        const apiError = data?.error ? String(data.error) : null;
        throw new Error(
          apiError ?? `Analysis request failed (HTTP ${response.status}).`
        );
      }

      setResult(data.result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while analyzing the squad."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <main
        className="min-h-screen text-white"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% 0%, rgba(61,219,193,0.08), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(61,219,193,0.05), transparent 60%), #04080F",
        }}
      >
        <section className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-10">
            <p
              className="mb-3 text-xs font-semibold uppercase tracking-[0.3em]"
              style={{ color: ACCENT }}
            >
              Valbri AI Tools
            </p>

            <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
              Valbri AI Squad Advisor
            </h1>

            <p className="mt-4 max-w-2xl text-base text-slate-400">
              Upload your FC squad. The Reinforcement Engine returns tactical
              advice, squad scoring, weaknesses, player roles, and upgrade
              pathways — in a single analytical report.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[400px_1fr]">
            <InputPanel
              imagePreviewUrl={imagePreviewUrl}
              selectedImageName={selectedImageName}
              handleImageChange={handleImageChange}
              platform={platform}
              setPlatform={setPlatform}
              divisionLevel={divisionLevel}
              setDivisionLevel={setDivisionLevel}
              goal={goal}
              setGoal={setGoal}
              currentTactics={currentTactics}
              setCurrentTactics={setCurrentTactics}
              isLoading={isLoading}
              handleAnalyzeClick={handleAnalyzeClick}
              errorMessage={errorMessage}
            />

            <div className="space-y-6">
              {!result ? (
                <EmptyState />
              ) : (
                <ReinforcementEngineInline
                  result={result}
                  imagePreviewUrl={imagePreviewUrl}
                  platform={platform}
                  divisionLevel={divisionLevel}
                  goal={goal}
                  onReopen={() => setAnalysisMode(true)}
                />
              )}
            </div>
          </div>
        </section>
      </main>

      {analysisMode && result ? (
        isMobilePortrait ? (
          <RotateOverlay onClose={() => setAnalysisMode(false)} />
        ) : (
          <LandscapeDashboard
            result={result}
            imagePreviewUrl={imagePreviewUrl}
            platform={platform}
            divisionLevel={divisionLevel}
            goal={goal}
            onClose={() => setAnalysisMode(false)}
          />
        )
      ) : null}
    </>
  );
}

/* ----------------------------- INPUT PANEL ----------------------------- */

function InputPanel(props: {
  imagePreviewUrl: string;
  selectedImageName: string;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  platform: Platform;
  setPlatform: (p: Platform) => void;
  divisionLevel: DivisionLevel;
  setDivisionLevel: (d: DivisionLevel) => void;
  goal: Goal;
  setGoal: (g: Goal) => void;
  currentTactics: string;
  setCurrentTactics: (s: string) => void;
  isLoading: boolean;
  handleAnalyzeClick: () => void;
  errorMessage: string;
}) {
  const {
    imagePreviewUrl,
    selectedImageName,
    handleImageChange,
    platform,
    setPlatform,
    divisionLevel,
    setDivisionLevel,
    goal,
    setGoal,
    currentTactics,
    setCurrentTactics,
    isLoading,
    handleAnalyzeClick,
    errorMessage,
  } = props;

  return (
    <Panel>
      <PanelHeader label="Squad Intake" tag="01" />

      <h2 className="mt-2 text-xl font-semibold">Analyze Your Squad</h2>

      <p className="mt-2 text-sm text-slate-400">
        Upload a clean squad screenshot. Cleaner image, sharper analysis.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <p className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Upload Squad Screenshot
          </p>

          <label
            htmlFor="squad-image-upload"
            className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/30 p-4 text-center text-sm text-slate-400 transition hover:border-[#3DDBC1]/60 hover:bg-[#3DDBC1]/5"
          >
            <input
              id="squad-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />

            {imagePreviewUrl ? (
              <div className="space-y-3">
                <img
                  src={imagePreviewUrl}
                  alt="Selected squad preview"
                  className="mx-auto max-h-40 rounded-lg border border-white/10 object-contain"
                />

                <p className="break-all text-xs text-slate-300">
                  {selectedImageName}
                </p>

                <p className="text-xs" style={{ color: ACCENT }}>
                  Tap here to change image
                </p>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-slate-200">
                  Tap here to choose squad image
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  PNG or JPG screenshot of your FC squad screen
                </p>
              </div>
            )}
          </label>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Platform
          </label>

          <div className="grid grid-cols-3 gap-2">
            {(["PlayStation", "Xbox", "PC"] as Platform[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPlatform(item)}
                className={
                  platform === item
                    ? "rounded-xl border px-3 py-2 text-sm font-semibold"
                    : "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300"
                }
                style={
                  platform === item
                    ? {
                        borderColor: ACCENT,
                        color: ACCENT,
                        backgroundColor: "rgba(61,219,193,0.08)",
                      }
                    : undefined
                }
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Division Rivals Level
          </label>

          <select
            value={divisionLevel}
            onChange={(event) =>
              setDivisionLevel(event.target.value as DivisionLevel)
            }
            className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-3 text-sm text-white"
          >
            <option>Division 10-8</option>
            <option>Division 7-5</option>
            <option>Division 4-2</option>
            <option>Division 1</option>
            <option>Elite</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Main Goal
          </label>

          <select
            value={goal}
            onChange={(event) => setGoal(event.target.value as Goal)}
            className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-3 text-sm text-white"
          >
            <option>Best Overall Improvement</option>
            <option>Better Attack</option>
            <option>Better Defense</option>
            <option>Better Tactics</option>
            <option>Weekend League</option>
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Current Tactics — Optional
          </label>

          <textarea
            value={currentTactics}
            onChange={(event) => setCurrentTactics(event.target.value)}
            className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-3 text-sm text-white placeholder:text-slate-500"
            placeholder="Example: 4-3-3(4), Balanced, 58 depth, Direct Passing"
          />
        </div>

        <button
          type="button"
          onClick={handleAnalyzeClick}
          disabled={isLoading}
          className="group relative w-full overflow-hidden rounded-xl px-4 py-3 font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            background: `linear-gradient(135deg, ${ACCENT}, #5CFCE6)`,
            boxShadow: "0 0 24px rgba(61,219,193,0.35)",
          }}
        >
          {isLoading ? "Running Reinforcement Engine..." : "Run Analysis"}
        </button>

        {errorMessage ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </Panel>
  );
}

/* ----------------------------- EMPTY STATE ----------------------------- */

function EmptyState() {
  return (
    <Panel>
      <PanelHeader label="Reinforcement Engine" tag="STANDBY" />

      <div className="py-10 text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-[#3DDBC1]/30">
          <div
            className="h-10 w-10 rounded-full"
            style={{
              background: `radial-gradient(circle at 30% 30%, ${ACCENT}, transparent 70%)`,
              boxShadow: `0 0 30px ${ACCENT}55`,
            }}
          />
        </div>

        <p
          className="text-xs font-semibold uppercase tracking-[0.3em]"
          style={{ color: ACCENT }}
        >
          Awaiting Squad Input
        </p>

        <h2 className="mt-3 text-2xl font-bold">
          Upload a squad and start the analysis
        </h2>

        <p className="mx-auto mt-3 max-w-md text-slate-400">
          When the engine finishes, the analysis opens in a full-width landscape
          dashboard with the squad in the center and insights on both sides.
        </p>
      </div>
    </Panel>
  );
}

/* --------------------------- INLINE RESULT VIEW --------------------------- */

function ReinforcementEngineInline({
  result,
  imagePreviewUrl,
  platform,
  divisionLevel,
  goal,
  onReopen,
}: {
  result: ValbriSquadAdvisorResult;
  imagePreviewUrl: string;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  onReopen: () => void;
}) {
  const overall100 = Math.round(result.scores.overall * 10);
  const chemistry33 = Math.round(result.scores.chemistry * 3.3);

  return (
    <div className="space-y-6">
      <Panel highlight>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HexBadge />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.3em]"
                style={{ color: ACCENT }}
              >
                Analysis Ready
              </p>
              <p className="mt-1 text-sm text-slate-200">
                {result.summary.headline}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onReopen}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition"
            style={{
              background: `linear-gradient(135deg, ${ACCENT}, #5CFCE6)`,
              boxShadow: "0 0 18px rgba(61,219,193,0.4)",
            }}
          >
            Open Full Analysis ▸
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          For the best experience, rotate your phone to landscape — the full
          dashboard puts the squad in the middle with insights on both sides.
        </p>
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniScore label="Overall" value={result.scores.overall} bright />
        <MiniScore label="Attack" value={result.scores.attack} />
        <MiniScore label="Midfield" value={result.scores.midfield} />
        <MiniScore label="Defense" value={result.scores.defense} />
        <MiniScore label="Chemistry" value={result.scores.chemistry} />
        <MiniScore label="Tactical Fit" value={result.scores.tacticalFit} />
        <div className="col-span-2 rounded-lg border border-[#3DDBC1]/30 bg-[#3DDBC1]/[0.06] px-3 py-2 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Pathway · Chem
          </p>
          <p className="text-base font-bold" style={{ color: ACCENT }}>
            {overall100}/100 · {chemistry33}/33
          </p>
        </div>
      </div>

      <Panel>
        <PanelHeader
          label="Squad Reinforcement Engine — Analysis Report"
          tag="REPORT"
        />

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {result.scoreReasons.overall} {result.scoreReasons.tacticalFit}
        </p>

        <div className="mt-4 rounded-xl border border-[#3DDBC1]/25 bg-[#3DDBC1]/[0.06] p-4">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: ACCENT }}
          >
            Final Coach Note
          </p>
          <p className="mt-2 text-sm text-slate-200">{result.finalCoachNote}</p>
        </div>
      </Panel>

      <p className="text-center text-xs text-slate-500">
        Platform {platform} · {divisionLevel} · Goal: {goal}
      </p>
    </div>
  );
}

/* ----------------------------- ROTATE OVERLAY ----------------------------- */

function RotateOverlay({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center"
      style={{
        background:
          "radial-gradient(800px 500px at 50% 40%, rgba(61,219,193,0.08), transparent 70%), #04080F",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-md border border-white/10 px-3 py-1 text-xs text-slate-300 hover:bg-white/5 hover:text-white"
      >
        ✕
      </button>

      <RotateIcon />

      <p
        className="mt-6 text-xs font-semibold uppercase tracking-[0.35em]"
        style={{ color: ACCENT }}
      >
        Analysis Ready
      </p>
      <h2 className="mt-3 max-w-md text-2xl font-bold text-white">
        Rotate your phone to view the full Reinforcement Engine
      </h2>
      <p className="mt-3 max-w-md text-sm text-slate-400">
        Turn your device sideways. The dashboard places your squad in the
        center, with strategic insights and upgrade pathways on both sides.
      </p>
      <p className="mt-6 text-xs text-slate-500">
        If nothing happens when you rotate, disable your phone&apos;s rotation
        lock first.
      </p>

      <button
        type="button"
        onClick={onClose}
        className="mt-8 rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white"
      >
        Stay in portrait
      </button>
    </div>
  );
}

function RotateIcon() {
  return (
    <div className="relative">
      <svg width="120" height="120" viewBox="0 0 120 120">
        <defs>
          <radialGradient id="rotGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.4" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="56" fill="url(#rotGlow)" />
        <g
          transform="rotate(-25 60 60)"
          stroke={ACCENT}
          strokeWidth="2"
          fill="none"
        >
          <rect x="38" y="22" width="44" height="76" rx="8" />
          <line x1="48" y1="32" x2="72" y2="32" />
          <circle cx="60" cy="90" r="2.5" fill={ACCENT} />
        </g>
        <g
          stroke={ACCENT}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M 22 88 A 30 30 0 0 0 88 90" />
          <polyline points="88,82 92,90 84,92" />
        </g>
      </svg>
    </div>
  );
}

/* --------------------------- LANDSCAPE DASHBOARD --------------------------- */

function LandscapeDashboard({
  result,
  imagePreviewUrl,
  platform,
  divisionLevel,
  goal,
  onClose,
}: {
  result: ValbriSquadAdvisorResult;
  imagePreviewUrl: string;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  onClose: () => void;
}) {
  const overall100 = Math.round(result.scores.overall * 10);
  const chemistry33 = Math.round(result.scores.chemistry * 3.3);
  const ratingStars = Math.max(
    1,
    Math.min(5, Math.round(result.scores.overall / 2))
  );
  const stage = useMemo(() => {
    if (overall100 >= 90) return 5;
    if (overall100 >= 80) return 4;
    if (overall100 >= 65) return 3;
    if (overall100 >= 50) return 2;
    return 1;
  }, [overall100]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col text-white"
      style={{
        background:
          "radial-gradient(1200px 600px at 20% 0%, rgba(61,219,193,0.06), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(61,219,193,0.04), transparent 60%), #04080F",
      }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#3DDBC1]/20 bg-black/40 px-4 py-2 backdrop-blur">
        <div className="flex items-center gap-3">
          <HexBadge />
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: ACCENT }}
            >
              AI Squad Reinforcement Engine
            </p>
            <p className="mt-0.5 text-xs text-slate-300">
              {result.summary.headline}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 sm:flex">
            <Chip>{platform}</Chip>
            <Chip>{divisionLevel}</Chip>
            <Chip>{goal}</Chip>
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md border border-white/10 px-2.5 py-1 text-xs text-slate-300 transition hover:bg-white/5 hover:text-white"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* === ABOVE THE FOLD === */}
        <div
          className="grid gap-3 p-3"
          style={{
            gridTemplateColumns:
              "minmax(0, 240px) minmax(0, 1fr) minmax(0, 280px)",
            minHeight: "calc(100dvh - 60px)",
          }}
        >
          {/* LEFT */}
          <div className="flex min-h-0 flex-col gap-3">
            <Panel compact>
              <div className="flex items-center gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg border text-base font-bold"
                  style={{
                    borderColor: "rgba(61,219,193,0.35)",
                    color: ACCENT,
                    background: "rgba(61,219,193,0.06)",
                  }}
                >
                  {overall100}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                    Current Squad
                  </p>
                  <h3 className="truncate text-sm font-bold leading-tight">
                    {result.summary.playstyle}
                  </h3>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <RatingRow label="Rating" stars={ratingStars} />
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span>Chemistry</span>
                    <span style={{ color: ACCENT }}>{chemistry33}/33</span>
                  </div>
                  <div className="mt-1 h-1 w-full rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(chemistry33 / 33) * 100}%`,
                        background: `linear-gradient(90deg, ${ACCENT}, #5CFCE6)`,
                        boxShadow: `0 0 8px ${ACCENT}88`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-1.5">
                <SideButton label="Set Active" />
                <SideButton label="Tactics" />
                <SideButton label="Use Squad Builder" />
              </div>
            </Panel>

            <Panel highlight compact>
              <PanelHeader label="AI Strategic Summary" tag="CORE" />
              <ul className="mt-2 space-y-2 text-xs">
                <li>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: ACCENT }}
                  >
                    Core Squad Stability
                  </p>
                  <p className="mt-0.5 text-slate-300">
                    {labelFromScore(result.scores.overall)}.{" "}
                    {result.scoreReasons.overall}
                  </p>
                </li>
                <li>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: ACCENT }}
                  >
                    Identified Weaknesses
                  </p>
                  <p className="mt-0.5 text-slate-300">
                    {result.weaknesses
                      .slice(0, 2)
                      .map((w) => w.area)
                      .join(" · ")}
                  </p>
                </li>
                <li>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: ACCENT }}
                  >
                    Upgrade Pathway Alignment
                  </p>
                  <p className="mt-0.5 text-slate-300">
                    {overall100}/100 · focusing on{" "}
                    {result.summary.mainOpportunity.toLowerCase()}.
                  </p>
                </li>
              </ul>
            </Panel>
          </div>

          {/* CENTER — squad image takes full available height */}
          <div className="flex min-h-0 flex-col">
            <SquadCanvas
              imagePreviewUrl={imagePreviewUrl}
              callouts={result.playerCallouts ?? []}
              rating={result.scores.overall}
              chemistry={chemistry33}
              tacticStyle={result.recommendedTactic.style}
            />
          </div>

          {/* RIGHT */}
          <div className="flex min-h-0 flex-col gap-3">
            <Panel compact>
              <PanelHeader label="Connectivity Graph" tag="LINKS" />
              <ConnectivityGraph
                strengths={result.strengths.length}
                weaknesses={result.weaknesses.length}
              />
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                <MiniScore label="Atk" value={result.scores.attack} />
                <MiniScore label="Mid" value={result.scores.midfield} />
                <MiniScore label="Def" value={result.scores.defense} />
                <MiniScore label="Chem" value={result.scores.chemistry} />
                <MiniScore label="Fit" value={result.scores.tacticalFit} />
                <MiniScore
                  label="Ovr"
                  value={result.scores.overall}
                  bright
                />
              </div>
            </Panel>

            <PerformanceAlert
              mainWeakness={result.summary.mainWeakness}
              weaknesses={result.weaknesses}
            />

            <Panel compact>
              <PanelHeader
                label="Upgrade Pathways"
                tag={`${overall100}/100`}
              />
              <div className="mt-2 relative h-2 w-full rounded-full bg-white/[0.06]">
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${overall100}%`,
                    background: `linear-gradient(90deg, ${ACCENT}, #5CFCE6)`,
                    boxShadow: `0 0 10px ${ACCENT}88`,
                  }}
                />
              </div>
              <div className="mt-2 grid grid-cols-5 gap-0.5 text-center text-[9px]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className="rounded border px-0.5 py-1"
                    style={
                      stage >= s
                        ? {
                            borderColor: "rgba(61,219,193,0.45)",
                            color: ACCENT,
                            background: "rgba(61,219,193,0.08)",
                          }
                        : {
                            borderColor: "rgba(255,255,255,0.08)",
                            color: "#64748b",
                          }
                    }
                  >
                    S{s}
                  </div>
                ))}
              </div>
            </Panel>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex flex-col items-center gap-1 border-t border-white/5 py-3">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.3em]"
            style={{ color: ACCENT }}
          >
            Scroll for full breakdown
          </p>
          <span
            className="animate-bounce text-base"
            style={{ color: ACCENT }}
            aria-hidden
          >
            ↓
          </span>
        </div>

        {/* === BELOW THE FOLD === */}
        <div className="space-y-3 px-3 pb-6">
          <div className="grid gap-3 lg:grid-cols-2">
            <Panel compact>
              <PanelHeader label="Recommended Tactic" tag="FIT" />
              <p className="mt-2 text-sm font-semibold">
                {result.recommendedTactic.style}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {result.recommendedTactic.reason}
              </p>

              <div className="mt-3 grid grid-cols-4 gap-2">
                <Stat
                  label="Width"
                  value={result.recommendedTactic.settings.width}
                />
                <Stat
                  label="Depth"
                  value={result.recommendedTactic.settings.depth}
                />
                <Stat
                  label="Att. Width"
                  value={result.recommendedTactic.settings.attackingWidth}
                />
                <Stat
                  label="Box Players"
                  value={result.recommendedTactic.settings.playersInBox}
                />
              </div>

              <div className="mt-2 grid grid-cols-3 gap-2">
                <KV
                  label="Defensive"
                  value={result.recommendedTactic.settings.defensiveStyle}
                />
                <KV
                  label="Build-Up"
                  value={result.recommendedTactic.settings.buildUpPlay}
                />
                <KV
                  label="Chance Creation"
                  value={result.recommendedTactic.settings.chanceCreation}
                />
              </div>
            </Panel>

            <Panel compact>
              <PanelHeader label="Player Roles" tag="ROLES" />
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {result.playerInstructions.map((item) => (
                  <div
                    key={item.position}
                    className="rounded-lg border border-white/10 bg-black/30 p-2.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                        style={{
                          borderColor: "rgba(61,219,193,0.35)",
                          color: ACCENT,
                        }}
                      >
                        {item.position}
                      </span>
                      <p className="text-xs font-semibold">
                        {item.instruction}
                      </p>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {item.reason}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <div className="grid gap-3 lg:grid-cols-3">
            <Panel highlight compact>
              <PanelHeader label="Upgrade Priorities" tag="PRIORITY" />
              <div className="mt-2 space-y-2 text-xs">
                {result.upgradePriorities.map((p) => (
                  <div
                    key={p.priority}
                    className="rounded-lg border border-white/10 bg-black/30 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold"
                        style={{
                          background: "rgba(61,219,193,0.1)",
                          color: ACCENT,
                          border: "1px solid rgba(61,219,193,0.35)",
                        }}
                      >
                        {p.priority}
                      </span>
                      <p className="text-xs font-semibold">{p.area}</p>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      {p.recommendedProfile}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {p.reason}
                    </p>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel compact>
              <PanelHeader label="Pathway Stages" tag="ROUTE" />
              <div className="mt-2 space-y-2 text-xs">
                <PathwayRow
                  label="Stage 3 — Tactical"
                  summary={result.upgradePaths.basic.summary}
                  level={result.upgradePaths.basic.coinLevel}
                  done={stage >= 3}
                />
                <PathwayRow
                  label="Stage 4 — Economic"
                  summary={result.upgradePaths.economic.summary}
                  level={result.upgradePaths.economic.coinLevel}
                  done={stage >= 4}
                />
                <PathwayRow
                  label="Stage 5 — Synergy"
                  summary={result.upgradePaths.best.summary}
                  level={result.upgradePaths.best.coinLevel}
                  done={stage >= 5}
                />
              </div>
            </Panel>

            <Panel compact>
              <PanelHeader label="Strengths" tag="+" />
              <div className="mt-2 space-y-2 text-xs">
                {result.strengths.map((item) => (
                  <div key={item.title}>
                    <p className="font-semibold text-white">{item.title}</p>
                    <p className="mt-0.5 text-slate-400">{item.reason}</p>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          <Panel compact>
            <PanelHeader label="Weaknesses" tag="!" />
            <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {result.weaknesses.map((item) => (
                <div
                  key={item.area}
                  className="rounded-lg border border-white/10 bg-black/30 p-2.5"
                >
                  <p className="text-xs font-semibold text-white">
                    {item.area}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {item.reason}
                  </p>
                  <p
                    className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
                    style={{ color: ACCENT }}
                  >
                    {item.fixType.replaceAll("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel compact>
            <PanelHeader
              label="Squad Reinforcement Engine — Analysis Report"
              tag="REPORT"
            />
            <p className="mt-2 text-xs leading-relaxed text-slate-300">
              Current squad (Rating {result.scores.overall.toFixed(1)}, Chem{" "}
              {chemistry33}/33) exhibits high individual card ratings but{" "}
              {result.summary.mainWeakness.toLowerCase()} introduces a
              positional inefficiency. {result.scoreReasons.overall}{" "}
              {result.scoreReasons.tacticalFit}
              {result.weaknesses[0]
                ? ` The most critical immediate upgrade is ${result.weaknesses[0].area}, as it is the dominant bottleneck to full team rating.`
                : ""}{" "}
              Overall pathway progress is {overall100}/100. Stages{" "}
              {Math.min(5, stage + 1)} & {Math.min(5, stage + 2)} will
              specifically address player-acquisition and tactical-role
              alignment.
            </p>

            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <ReportCard
                heading="Form Performance"
                body={`Overall ${labelFromScore(
                  result.scores.overall
                )}, but ${result.summary.mainWeakness.toLowerCase()} needs attention.`}
              />
              <ReportCard
                heading="Synergy Target"
                body={result.summary.mainOpportunity}
              />
              <ReportCard
                heading="Potential Unlocked"
                body={`Switch to "${result.recommendedTactic.style}". ${result.recommendedTactic.reason}`}
              />
            </div>

            <div className="mt-3 rounded-xl border border-[#3DDBC1]/25 bg-[#3DDBC1]/[0.06] p-3">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                style={{ color: ACCENT }}
              >
                Final Coach Note
              </p>
              <p className="mt-1 text-xs text-slate-200">
                {result.finalCoachNote}
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ SQUAD CANVAS ------------------------------ */

function SquadCanvas({
  imagePreviewUrl,
  callouts,
  rating,
  chemistry,
  tacticStyle,
}: {
  imagePreviewUrl: string;
  callouts: PlayerCallout[];
  rating: number;
  chemistry: number;
  tacticStyle: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });

  const measure = useCallback(() => {
    if (imgRef.current) {
      setImgSize({
        w: imgRef.current.clientWidth,
        h: imgRef.current.clientHeight,
      });
    }
  }, []);

  useEffect(() => {
    measure();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", measure);
    const el = imgRef.current;
    let ro: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => measure());
      ro.observe(el);
    }
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [measure, imagePreviewUrl]);

  const leftCallouts = useMemo(
    () => callouts.filter((c) => c.side === "left"),
    [callouts]
  );
  const rightCallouts = useMemo(
    () => callouts.filter((c) => c.side === "right"),
    [callouts]
  );

  // Distribute callouts vertically so they don't overlap
  const leftPositions = useMemo(
    () => distributeCallouts(leftCallouts, imgSize.h),
    [leftCallouts, imgSize.h]
  );
  const rightPositions = useMemo(
    () => distributeCallouts(rightCallouts, imgSize.h),
    [rightCallouts, imgSize.h]
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.025] p-3">
      <CornerTicks />

      <div className="flex shrink-0 items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Formation Snapshot
          </p>
          <p className="mt-0.5 text-xs text-slate-300">
            Rating {rating.toFixed(1)} · Chem {chemistry}/33
          </p>
        </div>
        <Chip>{tacticStyle}</Chip>
      </div>

      <div className="relative mt-2 flex min-h-0 flex-1 items-center justify-center">
        <div className="relative inline-block">
          {imagePreviewUrl ? (
            <img
              ref={imgRef}
              src={imagePreviewUrl}
              alt="Squad"
              onLoad={measure}
              className="block rounded-xl border border-white/10 bg-black/40"
              style={{
                maxWidth: "100%",
                maxHeight: "calc(100dvh - 200px)",
                width: "auto",
                height: "auto",
              }}
            />
          ) : (
            <div className="flex h-48 w-72 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-xs text-slate-500">
              Squad image not available
            </div>
          )}

          {imgSize.w > 0 && callouts.length > 0 ? (
            <svg
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: imgSize.w, height: imgSize.h }}
            >
              {callouts.map((c, i) => {
                const x = c.bbox.x * imgSize.w;
                const y = c.bbox.y * imgSize.h;
                const w = c.bbox.w * imgSize.w;
                const h = c.bbox.h * imgSize.h;
                const midY = y + h / 2;
                const isRight = c.side === "right";
                const startX = isRight ? x + w : x;
                const endX = isRight ? imgSize.w - 12 : 12;
                const color = severityColor(c.severity);

                return (
                  <g key={i}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill="none"
                      stroke={color}
                      strokeWidth={2}
                      rx={6}
                      style={{ filter: `drop-shadow(0 0 4px ${color})` }}
                    />
                    <line
                      x1={startX}
                      y1={midY}
                      x2={endX}
                      y2={midY}
                      stroke={color}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      opacity={0.85}
                    />
                    <circle cx={endX} cy={midY} r={3} fill={color} />
                  </g>
                );
              })}
            </svg>
          ) : null}

          {imgSize.h > 0
            ? leftPositions.map(({ callout, y }, i) => (
                <CalloutBox
                  key={`l-${i}`}
                  callout={callout}
                  style={{
                    position: "absolute",
                    left: 6,
                    top: y - 22,
                    width: "38%",
                    maxWidth: 160,
                    minWidth: 100,
                    zIndex: 2,
                  }}
                />
              ))
            : null}

          {imgSize.h > 0
            ? rightPositions.map(({ callout, y }, i) => (
                <CalloutBox
                  key={`r-${i}`}
                  callout={callout}
                  style={{
                    position: "absolute",
                    right: 6,
                    top: y - 22,
                    width: "38%",
                    maxWidth: 160,
                    minWidth: 100,
                    zIndex: 2,
                  }}
                />
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

function distributeCallouts(callouts: PlayerCallout[], imgHeight: number) {
  if (!imgHeight) return [] as { callout: PlayerCallout; y: number }[];
  const sorted = [...callouts].sort((a, b) => a.bbox.y - b.bbox.y);
  const minGap = 56;
  const positions: { callout: PlayerCallout; y: number }[] = [];
  let lastY = -Infinity;
  for (const c of sorted) {
    let y = (c.bbox.y + c.bbox.h / 2) * imgHeight;
    if (y - lastY < minGap) y = lastY + minGap;
    if (y > imgHeight - 8) y = imgHeight - 8;
    positions.push({ callout: c, y });
    lastY = y;
  }
  return positions;
}

function CalloutBox({
  callout,
  style,
}: {
  callout: PlayerCallout;
  style?: React.CSSProperties;
}) {
  const color = severityColor(callout.severity);
  return (
    <div style={style}>
      <div
        className="rounded-md border bg-black/85 px-2 py-1.5 backdrop-blur"
        style={{
          borderColor: color + "66",
          boxShadow: `0 0 10px ${color}33`,
        }}
      >
        <p
          className="text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{ color }}
        >
          {callout.position} · {callout.label}
        </p>
        <p className="mt-0.5 text-[10px] leading-tight text-slate-300">
          {callout.note}
        </p>
      </div>
    </div>
  );
}

/* ----------------------------- SUBCOMPONENTS ----------------------------- */

function Panel({
  children,
  highlight,
  compact,
}: {
  children: ReactNode;
  highlight?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl border ${compact ? "p-3" : "p-5"}`}
      style={{
        borderColor: highlight
          ? "rgba(61,219,193,0.35)"
          : "rgba(255,255,255,0.08)",
        background: highlight
          ? "linear-gradient(180deg, rgba(61,219,193,0.06) 0%, rgba(8,16,24,0.55) 100%)"
          : "rgba(255,255,255,0.025)",
        boxShadow: highlight
          ? "0 0 24px rgba(61,219,193,0.12) inset"
          : undefined,
      }}
    >
      <CornerTicks />
      {children}
    </div>
  );
}

function CornerTicks() {
  const c = "rgba(61,219,193,0.6)";
  return (
    <>
      <span
        className="pointer-events-none absolute left-2 top-2 h-2 w-2"
        style={{ borderTop: `1px solid ${c}`, borderLeft: `1px solid ${c}` }}
      />
      <span
        className="pointer-events-none absolute right-2 top-2 h-2 w-2"
        style={{ borderTop: `1px solid ${c}`, borderRight: `1px solid ${c}` }}
      />
      <span
        className="pointer-events-none absolute bottom-2 left-2 h-2 w-2"
        style={{ borderBottom: `1px solid ${c}`, borderLeft: `1px solid ${c}` }}
      />
      <span
        className="pointer-events-none absolute bottom-2 right-2 h-2 w-2"
        style={{
          borderBottom: `1px solid ${c}`,
          borderRight: `1px solid ${c}`,
        }}
      />
    </>
  );
}

function PanelHeader({ label, tag }: { label: string; tag: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.25em]"
        style={{ color: ACCENT }}
      >
        {label}
      </p>
      <span
        className="rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
        style={{
          borderColor: "rgba(61,219,193,0.3)",
          color: ACCENT,
          background: "rgba(61,219,193,0.06)",
        }}
      >
        {tag}
      </span>
    </div>
  );
}

function HexBadge() {
  return (
    <div
      className="flex h-9 w-9 items-center justify-center"
      style={{
        clipPath:
          "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
        background: `linear-gradient(135deg, ${ACCENT}, #1F8C7C)`,
      }}
    >
      <span className="text-sm font-bold text-black">V</span>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
      style={{
        borderColor: "rgba(61,219,193,0.25)",
        color: ACCENT,
        background: "rgba(61,219,193,0.05)",
      }}
    >
      {children}
    </span>
  );
}

function SideButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left text-xs transition hover:bg-white/[0.04]"
      style={{
        borderColor: "rgba(61,219,193,0.2)",
        background: "rgba(61,219,193,0.04)",
      }}
    >
      <span>{label}</span>
      <span style={{ color: ACCENT }}>›</span>
    </button>
  );
}

function RatingRow({ label, stars }: { label: string; stars: number }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-[10px] text-slate-400">{label}</p>
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <span
            key={s}
            style={{
              color: s <= stars ? ACCENT : "rgba(255,255,255,0.15)",
              textShadow: s <= stars ? `0 0 6px ${ACCENT}` : undefined,
            }}
          >
            ★
          </span>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-center">
      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="text-sm font-bold" style={{ color: ACCENT }}>
        {value}
      </p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-white">
        {value}
      </p>
    </div>
  );
}

function MiniScore({
  label,
  value,
  bright,
}: {
  label: string;
  value: number;
  bright?: boolean;
}) {
  return (
    <div
      className="rounded-lg border px-1.5 py-1 text-center"
      style={{
        borderColor: bright
          ? "rgba(61,219,193,0.4)"
          : "rgba(255,255,255,0.08)",
        background: bright ? "rgba(61,219,193,0.08)" : "rgba(0,0,0,0.25)",
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>
      <p
        className="text-sm font-bold"
        style={{ color: bright ? ACCENT : "white" }}
      >
        {value.toFixed(1)}
      </p>
    </div>
  );
}

function PathwayRow({
  label,
  summary,
  level,
  done,
}: {
  label: string;
  summary: string;
  level: string;
  done: boolean;
}) {
  return (
    <div
      className="rounded-lg border px-2 py-1.5"
      style={{
        borderColor: done
          ? "rgba(61,219,193,0.35)"
          : "rgba(255,255,255,0.08)",
        background: done ? "rgba(61,219,193,0.05)" : "rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold" style={{ color: ACCENT }}>
          {label}
        </p>
        <span
          className="rounded border px-1 py-0.5 text-[8px] uppercase tracking-[0.18em]"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "#94a3b8",
          }}
        >
          {level}
        </span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-400">{summary}</p>
    </div>
  );
}

function PerformanceAlert({
  mainWeakness,
  weaknesses,
}: {
  mainWeakness: string;
  weaknesses: ValbriSquadAdvisorResult["weaknesses"];
}) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-3"
      style={{
        borderColor: "rgba(255,170,80,0.35)",
        background:
          "linear-gradient(180deg, rgba(255,170,80,0.08) 0%, rgba(8,16,24,0.4) 100%)",
      }}
    >
      <CornerTicks />
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.25em]"
          style={{ color: "#FFB860" }}
        >
          Performance Alert
        </p>
        <span
          className="rounded-md border px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{
            borderColor: "rgba(255,170,80,0.4)",
            color: "#FFB860",
            background: "rgba(255,170,80,0.06)",
          }}
        >
          ALERT
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-200">
        {mainWeakness} — position stats below target threshold.
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-slate-400">
        {weaknesses.slice(0, 3).map((w) => (
          <li key={w.area} className="flex items-start gap-1.5">
            <span style={{ color: "#FFB860" }}>›</span>
            <span>
              <span className="text-slate-200">{w.area}</span> · {w.reason}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ReportCard({ heading, body }: { heading: string; body: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 p-2.5">
      <p
        className="text-[9px] font-semibold uppercase tracking-[0.25em]"
        style={{ color: ACCENT }}
      >
        {heading}
      </p>
      <p className="mt-1 text-xs text-slate-200">{body}</p>
    </div>
  );
}

function ConnectivityGraph({
  strengths,
  weaknesses,
}: {
  strengths: number;
  weaknesses: number;
}) {
  const total = 11;
  const radius = 60;
  const cx = 80;
  const cy = 80;

  const nodes = Array.from({ length: total }, (_, i) => {
    const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      weak: i < weaknesses,
      strong: i >= total - strengths,
    };
  });

  return (
    <div className="mt-2 flex items-center justify-center">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.6" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={radius + 6} fill="url(#coreGlow)" />

        {nodes.map((n, i) => (
          <line
            key={`line-${i}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke={n.weak ? "#FFB860" : ACCENT}
            strokeOpacity={n.weak ? 0.55 : 0.3}
            strokeWidth={1}
          />
        ))}

        {nodes.map((n, i) =>
          nodes
            .slice(i + 1)
            .map((m, j) =>
              (i + j) % 2 === 0 ? (
                <line
                  key={`l-${i}-${j}`}
                  x1={n.x}
                  y1={n.y}
                  x2={m.x}
                  y2={m.y}
                  stroke={ACCENT}
                  strokeOpacity={0.08}
                  strokeWidth={1}
                />
              ) : null
            )
        )}

        <circle
          cx={cx}
          cy={cy}
          r={7}
          fill={ACCENT}
          style={{ filter: `drop-shadow(0 0 6px ${ACCENT})` }}
        />

        {nodes.map((n, i) => (
          <circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r={n.weak ? 4 : 3.5}
            fill={n.weak ? "#FFB860" : n.strong ? ACCENT : "#94a3b8"}
            style={{
              filter: n.weak
                ? "drop-shadow(0 0 4px #FFB860)"
                : n.strong
                ? `drop-shadow(0 0 4px ${ACCENT})`
                : undefined,
            }}
          />
        ))}
      </svg>
    </div>
  );
}

function labelFromScore(score: number) {
  if (score >= 9) return "Very High";
  if (score >= 8) return "High";
  if (score >= 6.5) return "Moderate";
  if (score >= 5) return "Mixed";
  return "Low";
}
