// src/app/ai-squad-advisor/page.tsx

"use client";

import type { ChangeEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import type {
  DivisionLevel,
  Goal,
  Platform,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";

const ACCENT = "#3DDBC1";

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

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

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
              <ReinforcementEngineReport
                result={result}
                imagePreviewUrl={imagePreviewUrl}
                platform={platform}
                divisionLevel={divisionLevel}
                goal={goal}
              />
            )}
          </div>
        </div>
      </section>
    </main>
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
          The engine will return a strategic summary, performance alerts,
          connectivity graph, and a staged upgrade pathway.
        </p>
      </div>
    </Panel>
  );
}

/* ----------------------- REINFORCEMENT ENGINE REPORT ----------------------- */

function ReinforcementEngineReport({
  result,
  imagePreviewUrl,
  platform,
  divisionLevel,
  goal,
}: {
  result: ValbriSquadAdvisorResult;
  imagePreviewUrl: string;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
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
    <div className="space-y-6">
      {/* Engine header bar */}
      <div
        className="relative overflow-hidden rounded-2xl border p-4"
        style={{
          borderColor: "rgba(61,219,193,0.25)",
          background:
            "linear-gradient(180deg, rgba(61,219,193,0.06) 0%, rgba(8,16,24,0.4) 100%)",
        }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HexBadge />
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-[0.3em]"
                style={{ color: ACCENT }}
              >
                AI Squad Reinforcement Engine
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {result.summary.headline}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Chip>{platform}</Chip>
            <Chip>{divisionLevel}</Chip>
            <Chip>{goal}</Chip>
          </div>
        </div>
      </div>

      {/* Main dashboard grid */}
      <div className="grid gap-6 xl:grid-cols-[300px_1fr_320px]">
        {/* LEFT COLUMN */}
        <div className="space-y-6">
          <Panel>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-lg border text-lg font-bold"
                style={{
                  borderColor: "rgba(61,219,193,0.35)",
                  color: ACCENT,
                  background: "rgba(61,219,193,0.06)",
                }}
              >
                {ratingStars * 10 + Math.round(result.scores.overall * 10) % 10}
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Current Squad
                </p>
                <h3 className="text-lg font-bold">
                  {result.summary.playstyle}
                </h3>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <RatingRow label="Rating" stars={ratingStars} />
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Chemistry</span>
                  <span style={{ color: ACCENT }}>{chemistry33}/33</span>
                </div>
                <div className="mt-1 h-1.5 w-full rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(chemistry33 / 33) * 100}%`,
                      background: `linear-gradient(90deg, ${ACCENT}, #5CFCE6)`,
                      boxShadow: `0 0 12px ${ACCENT}88`,
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-2">
              <SideButton label="Set Active" />
              <SideButton label="Tactics" />
              <SideButton label="Use Squad Builder" />
              <SideButton label="Rename" muted />
              <SideButton label="Clear Squad" muted />
            </div>
          </Panel>

          <Panel highlight>
            <PanelHeader label="AI Strategic Summary" tag="CORE" />
            <ul className="mt-3 space-y-3 text-sm">
              <li>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Core Squad Stability
                </p>
                <p className="mt-1 text-slate-300">
                  {labelFromScore(result.scores.overall)}.{" "}
                  {result.scoreReasons.overall}
                </p>
              </li>

              <li>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Identified Weaknesses
                </p>
                <p className="mt-1 text-slate-300">
                  {result.weaknesses
                    .slice(0, 2)
                    .map((w) => w.area)
                    .join(" · ")}
                </p>
              </li>

              <li>
                <p
                  className="text-xs font-semibold uppercase tracking-[0.18em]"
                  style={{ color: ACCENT }}
                >
                  Upgrade Pathway Alignment
                </p>
                <p className="mt-1 text-slate-300">
                  {overall100}/100 · focusing on{" "}
                  {result.summary.mainOpportunity.toLowerCase()}.
                </p>
              </li>
            </ul>
          </Panel>
        </div>

        {/* CENTER COLUMN */}
        <div className="space-y-6">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Formation Snapshot
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Rating {result.scores.overall.toFixed(1)} · Chem{" "}
                  {chemistry33}/33
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Chip>{result.recommendedTactic.style}</Chip>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {imagePreviewUrl ? (
                <img
                  src={imagePreviewUrl}
                  alt="Squad formation"
                  className="block max-h-[360px] w-full object-contain"
                />
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                  Squad image not available
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Stat label="Width" value={result.recommendedTactic.settings.width} />
              <Stat label="Depth" value={result.recommendedTactic.settings.depth} />
              <Stat
                label="Att. Width"
                value={result.recommendedTactic.settings.attackingWidth}
              />
              <Stat
                label="Box Players"
                value={result.recommendedTactic.settings.playersInBox}
              />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
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

          <PerformanceAlert
            mainWeakness={result.summary.mainWeakness}
            weaknesses={result.weaknesses}
          />

          <Panel>
            <PanelHeader label="Player Roles" tag="ROLES" />

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {result.playerInstructions.map((item) => (
                <div
                  key={item.position}
                  className="rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
                      style={{
                        borderColor: "rgba(61,219,193,0.35)",
                        color: ACCENT,
                      }}
                    >
                      {item.position}
                    </span>
                    <p className="text-sm font-semibold">{item.instruction}</p>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{item.reason}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-6">
          <Panel>
            <PanelHeader label="Squad Connectivity Graph" tag="LINKS" />
            <ConnectivityGraph
              strengths={result.strengths.length}
              weaknesses={result.weaknesses.length}
            />
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <MiniScore label="Atk" value={result.scores.attack} />
              <MiniScore label="Mid" value={result.scores.midfield} />
              <MiniScore label="Def" value={result.scores.defense} />
              <MiniScore label="Chem" value={result.scores.chemistry} />
              <MiniScore label="Fit" value={result.scores.tacticalFit} />
              <MiniScore label="Ovr" value={result.scores.overall} bright />
            </div>
          </Panel>

          <Panel>
            <PanelHeader label="Upgrade Pathways" tag={`${overall100}/100`} />

            <div className="mt-4">
              <div className="relative h-2.5 w-full rounded-full bg-white/[0.06]">
                <div
                  className="absolute left-0 top-0 h-full rounded-full"
                  style={{
                    width: `${overall100}%`,
                    background: `linear-gradient(90deg, ${ACCENT}, #5CFCE6)`,
                    boxShadow: `0 0 14px ${ACCENT}88`,
                  }}
                />
              </div>

              <div className="mt-3 grid grid-cols-5 gap-1 text-center text-[10px]">
                {[1, 2, 3, 4, 5].map((s) => (
                  <div
                    key={s}
                    className="rounded-md border px-1 py-1"
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
                    STAGE {s}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
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

          <Panel highlight>
            <PanelHeader label="Upgrade Priorities" tag="PRIORITY" />
            <div className="mt-3 space-y-3">
              {result.upgradePriorities.map((p) => (
                <div
                  key={p.priority}
                  className="rounded-xl border border-white/10 bg-black/30 p-3"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold"
                      style={{
                        background: "rgba(61,219,193,0.1)",
                        color: ACCENT,
                        border: "1px solid rgba(61,219,193,0.35)",
                      }}
                    >
                      {p.priority}
                    </span>
                    <p className="font-semibold">{p.area}</p>
                  </div>
                  <p className="mt-1 text-sm text-slate-300">
                    {p.recommendedProfile}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">{p.reason}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Analysis Report */}
      <Panel>
        <div className="flex items-center justify-between gap-3">
          <PanelHeader
            label="Squad Reinforcement Engine — Analysis Report"
            tag="REPORT"
          />
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Current squad (Rating {result.scores.overall.toFixed(1)}, Chem{" "}
          {chemistry33}/33) exhibits high individual card ratings but{" "}
          {result.summary.mainWeakness.toLowerCase()} introduces a positional
          inefficiency. {result.scoreReasons.overall}{" "}
          {result.scoreReasons.tacticalFit}{" "}
          {result.weaknesses[0]
            ? `The most critical immediate upgrade is ${result.weaknesses[0].area}, as it is the dominant bottleneck to full team rating. `
            : ""}
          Overall pathway progress is {overall100}/100, and stages{" "}
          {stage + 1} & {Math.min(5, stage + 2)} will specifically address
          player-acquisition and tactical-role alignment.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
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

        <div className="mt-5 rounded-xl border border-[#3DDBC1]/25 bg-[#3DDBC1]/[0.06] p-4">
          <p
            className="text-xs font-semibold uppercase tracking-[0.25em]"
            style={{ color: ACCENT }}
          >
            Final Coach Note
          </p>
          <p className="mt-2 text-sm text-slate-200">
            {result.finalCoachNote}
          </p>
        </div>
      </Panel>

      {/* Strengths & Weaknesses */}
      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <PanelHeader label="Strengths" tag="+" />
          <div className="mt-4 space-y-4">
            {result.strengths.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <PanelHeader label="Weaknesses" tag="!" />
          <div className="mt-4 space-y-4">
            {result.weaknesses.map((item) => (
              <div key={item.area}>
                <h3 className="font-semibold text-white">{item.area}</h3>
                <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
                <p
                  className="mt-2 text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: ACCENT }}
                >
                  {item.fixType.replaceAll("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------- SUBCOMPONENTS ----------------------------- */

function Panel({
  children,
  highlight,
}: {
  children: ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className="relative rounded-2xl border p-5"
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
        className="text-xs font-semibold uppercase tracking-[0.25em]"
        style={{ color: ACCENT }}
      >
        {label}
      </p>
      <span
        className="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
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
      className="flex h-10 w-10 items-center justify-center"
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
      className="rounded-full border px-2.5 py-1 text-[11px] font-medium"
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

function SideButton({
  label,
  muted,
}: {
  label: string;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-white/[0.04]"
      style={{
        borderColor: muted
          ? "rgba(255,255,255,0.06)"
          : "rgba(61,219,193,0.2)",
        color: muted ? "#94a3b8" : "white",
        background: muted ? "transparent" : "rgba(61,219,193,0.04)",
      }}
    >
      <span>{label}</span>
      <span style={{ color: muted ? "#475569" : ACCENT }}>›</span>
    </button>
  );
}

function RatingRow({ label, stars }: { label: string; stars: number }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs text-slate-400">{label}</p>
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
    <div
      className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center"
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="text-lg font-bold" style={{ color: ACCENT }}>
        {value}
      </p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-white">{value}</p>
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
      className="rounded-lg border px-2 py-2 text-center"
      style={{
        borderColor: bright
          ? "rgba(61,219,193,0.4)"
          : "rgba(255,255,255,0.08)",
        background: bright ? "rgba(61,219,193,0.08)" : "rgba(0,0,0,0.25)",
      }}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p
        className="text-base font-bold"
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
      className="rounded-lg border px-3 py-2"
      style={{
        borderColor: done
          ? "rgba(61,219,193,0.35)"
          : "rgba(255,255,255,0.08)",
        background: done ? "rgba(61,219,193,0.05)" : "rgba(0,0,0,0.25)",
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold" style={{ color: ACCENT }}>
          {label}
        </p>
        <span
          className="rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.2em]"
          style={{
            borderColor: "rgba(255,255,255,0.1)",
            color: "#94a3b8",
          }}
        >
          {level}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">{summary}</p>
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
      className="relative overflow-hidden rounded-2xl border p-5"
      style={{
        borderColor: "rgba(255,170,80,0.35)",
        background:
          "linear-gradient(180deg, rgba(255,170,80,0.08) 0%, rgba(8,16,24,0.4) 100%)",
      }}
    >
      <CornerTicks />
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-[0.25em]"
          style={{ color: "#FFB860" }}
        >
          Performance Alert
        </p>
        <span
          className="rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{
            borderColor: "rgba(255,170,80,0.4)",
            color: "#FFB860",
            background: "rgba(255,170,80,0.06)",
          }}
        >
          ALERT
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-200">
        {mainWeakness} — position stats below target threshold.
      </p>
      <ul className="mt-3 space-y-1.5 text-xs text-slate-400">
        {weaknesses.map((w) => (
          <li key={w.area} className="flex items-start gap-2">
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
    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
      <p
        className="text-[10px] font-semibold uppercase tracking-[0.25em]"
        style={{ color: ACCENT }}
      >
        {heading}
      </p>
      <p className="mt-1 text-sm text-slate-200">{body}</p>
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
  const radius = 70;
  const cx = 90;
  const cy = 90;

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
    <div className="mt-3 flex items-center justify-center">
      <svg width="180" height="180" viewBox="0 0 180 180">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={ACCENT} stopOpacity="0.6" />
            <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={radius + 8} fill="url(#coreGlow)" />

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
          r={8}
          fill={ACCENT}
          style={{ filter: `drop-shadow(0 0 6px ${ACCENT})` }}
        />

        {nodes.map((n, i) => (
          <circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r={n.weak ? 5 : 4}
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
