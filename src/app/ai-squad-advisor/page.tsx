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
import {
  HUD,
  HudBackground,
  HudButton,
  HudChip,
  HudCorners,
  HudHeading,
  HudIcon,
  HudListButton,
  HudMeter,
  HudPanel,
  HexBadge,
  PulseDot,
  RadarRing,
  TargetingFrame,
  ConnectorLine,
  type HudVariant,
  variantConfig,
} from "@/components/hud";

function severityToVariant(s: PlayerCalloutSeverity): HudVariant {
  if (s === "critical") return "critical";
  if (s === "warning") return "alert";
  return "default";
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

/* ============================================================
   MAIN PAGE
   ============================================================ */

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
        throw new Error("Squad screenshot required for intake.");
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
          : "Unknown error during squad analysis."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <HudBackground>
        <section className="mx-auto max-w-7xl px-4 py-8 lg:py-12">
          <PageHero />

          <div className="mt-8 grid gap-5 lg:grid-cols-[420px_1fr]">
            <IntakePanel
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

            <div className="flex min-h-0 flex-col gap-5">
              {!result ? (
                <StandbyPanel />
              ) : (
                <InlineSummary
                  result={result}
                  platform={platform}
                  divisionLevel={divisionLevel}
                  goal={goal}
                  onReopen={() => setAnalysisMode(true)}
                />
              )}
            </div>
          </div>
        </section>
      </HudBackground>

      {analysisMode && result ? (
        isMobilePortrait ? (
          <RotateOverlay onClose={() => setAnalysisMode(false)} />
        ) : (
          <CommandCenter
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

/* ============================================================
   PAGE HERO
   ============================================================ */

function PageHero() {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <HexBadge label="V" size={44} />
        <div>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.4em]"
            style={{ color: HUD.primary }}
          >
            Valbri // AI Squad Intelligence System
          </p>
          <h1
            className="mt-1 text-2xl font-bold leading-none tracking-tight md:text-3xl"
            style={{ color: HUD.ink }}
          >
            Squad Reinforcement Engine
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Tactical analysis · Chemistry diagnostics · Upgrade pathways
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <PulseDot color={HUD.primary} label="ENGINE ONLINE" />
        <RadarRing size={26} />
      </div>
    </div>
  );
}

/* ============================================================
   INTAKE PANEL
   ============================================================ */

function IntakePanel(props: {
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
    <HudPanel
      title="Squad Intake"
      tag="01"
      icon={<HudIcon type="scan" />}
      variant="default"
      scanline
    >
      <p className="text-xs text-slate-400">
        Drop a squad screenshot. The engine ingests, scans the formation,
        and returns a tactical report.
      </p>

      <div className="mt-5 space-y-5">
        {/* Image upload */}
        <div>
          <HudHeading className="mb-2">Squad Screenshot</HudHeading>
          <label
            htmlFor="squad-image-upload"
            className="block cursor-pointer border border-dashed p-4 text-center text-xs text-slate-400 transition hover:border-[#5CFCE6] hover:bg-[#3DDBC1]/[0.05]"
            style={{
              borderColor: `${HUD.primary}55`,
              background: `${HUD.primary}06`,
              clipPath:
                "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
            }}
          >
            <input
              id="squad-image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="sr-only"
            />
            {imagePreviewUrl ? (
              <div className="space-y-2">
                <img
                  src={imagePreviewUrl}
                  alt="Selected squad preview"
                  className="mx-auto max-h-40 border border-white/10 object-contain"
                />
                <p className="break-all text-[11px] text-slate-300">
                  {selectedImageName}
                </p>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                  style={{ color: HUD.primary }}
                >
                  Tap to replace input
                </p>
              </div>
            ) : (
              <div className="py-6">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center" style={{ color: HUD.primary }}>
                  <HudIcon type="target" />
                </div>
                <p
                  className="text-[10px] font-semibold uppercase tracking-[0.3em]"
                  style={{ color: HUD.primary }}
                >
                  Drop or select squad image
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  PNG · JPG · screenshot of your FC squad screen
                </p>
              </div>
            )}
          </label>
        </div>

        {/* Platform */}
        <div>
          <HudHeading className="mb-2">Platform</HudHeading>
          <div className="grid grid-cols-3 gap-2">
            {(["PlayStation", "Xbox", "PC"] as Platform[]).map((item) => {
              const active = platform === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setPlatform(item)}
                  className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition"
                  style={{
                    color: active ? HUD.primary : HUD.inkDim,
                    background: active ? `${HUD.primary}14` : "rgba(255,255,255,0.02)",
                    border: `1px solid ${active ? HUD.primary : "rgba(255,255,255,0.08)"}`,
                    clipPath:
                      "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
                    boxShadow: active ? `0 0 12px ${HUD.primary}33` : undefined,
                  }}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        {/* Division */}
        <div>
          <HudHeading className="mb-2">Division Rivals Level</HudHeading>
          <HudSelect
            value={divisionLevel}
            onChange={(v) => setDivisionLevel(v as DivisionLevel)}
            options={[
              "Division 10-8",
              "Division 7-5",
              "Division 4-2",
              "Division 1",
              "Elite",
            ]}
          />
        </div>

        {/* Goal */}
        <div>
          <HudHeading className="mb-2">Main Goal</HudHeading>
          <HudSelect
            value={goal}
            onChange={(v) => setGoal(v as Goal)}
            options={[
              "Best Overall Improvement",
              "Better Attack",
              "Better Defense",
              "Better Tactics",
              "Weekend League",
            ]}
          />
        </div>

        {/* Tactics */}
        <div>
          <HudHeading className="mb-2">Current Tactics · Optional</HudHeading>
          <textarea
            value={currentTactics}
            onChange={(event) => setCurrentTactics(event.target.value)}
            className="block min-h-20 w-full bg-black/40 px-3 py-2 text-xs text-white placeholder:text-slate-600"
            placeholder="4-3-3(4) · Balanced · 58 depth · Direct Passing"
            style={{
              border: `1px solid ${HUD.primary}33`,
              clipPath:
                "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            }}
          />
        </div>

        <HudButton
          variant="primary"
          size="lg"
          onClick={handleAnalyzeClick}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <RadarRing size={16} color={HUD.bg} />
              <span>Engine running…</span>
            </>
          ) : (
            <>
              <HudIcon type="scan" width={14} height={14} />
              <span>Run analysis</span>
            </>
          )}
        </HudButton>

        {errorMessage ? (
          <div
            className="px-3 py-2 text-[11px]"
            style={{
              color: HUD.critical,
              border: `1px solid ${HUD.critical}55`,
              background: `${HUD.critical}10`,
              clipPath:
                "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            }}
          >
            <span className="font-semibold uppercase tracking-[0.2em]">
              Engine error ·{" "}
            </span>
            {errorMessage}
          </div>
        ) : null}
      </div>
    </HudPanel>
  );
}

function HudSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="block w-full appearance-none bg-black/40 px-3 py-2.5 pr-8 text-xs text-white"
        style={{
          border: `1px solid ${HUD.primary}33`,
          clipPath:
            "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
        }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs"
        style={{ color: HUD.primary }}
      >
        ▾
      </span>
    </div>
  );
}

/* ============================================================
   STANDBY (no result yet)
   ============================================================ */

function StandbyPanel() {
  return (
    <HudPanel
      title="Reinforcement Engine"
      tag="STANDBY"
      icon={<HudIcon type="core" />}
      variant="elite"
      scanline
    >
      <div className="flex flex-col items-center py-10 text-center">
        <div className="relative mb-5">
          <RadarRing size={64} />
          <div
            className="absolute inset-0 m-auto h-6 w-6 rounded-full"
            style={{
              background: `radial-gradient(circle, ${HUD.primary}, transparent 70%)`,
              boxShadow: `0 0 24px ${HUD.primary}`,
            }}
          />
        </div>
        <PulseDot color={HUD.primary} label="Awaiting squad intake" />
        <h2 className="mt-3 text-xl font-bold" style={{ color: HUD.ink }}>
          Drop a squad. Engine standing by.
        </h2>
        <p className="mt-2 max-w-md text-xs text-slate-400">
          Once the squad image is ingested, the engine auto-launches a
          landscape tactical command center with full diagnostics.
        </p>
      </div>
    </HudPanel>
  );
}

/* ============================================================
   INLINE SUMMARY (after closing fullscreen)
   ============================================================ */

function InlineSummary({
  result,
  platform,
  divisionLevel,
  goal,
  onReopen,
}: {
  result: ValbriSquadAdvisorResult;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  onReopen: () => void;
}) {
  const overall100 = Math.round(result.scores.overall * 10);
  const chemistry33 = Math.round(result.scores.chemistry * 3.3);

  return (
    <>
      <HudPanel
        title="Analysis Ready"
        tag="LIVE"
        icon={<HudIcon type="target" />}
        variant="upgrade"
        meta={<PulseDot color={HUD.primary} />}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: HUD.primary }}
            >
              Squad Reinforcement Engine
            </p>
            <h2 className="mt-1 text-lg font-bold text-white">
              {result.summary.headline}
            </h2>
            <p className="mt-2 text-xs text-slate-400">
              Rotate device or click below to enter the full command center.
            </p>
          </div>
          <HudButton variant="primary" onClick={onReopen}>
            <HudIcon type="target" width={12} height={12} />
            <span>Open command center</span>
          </HudButton>
        </div>
      </HudPanel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <HudMeter label="OVR" value={result.scores.overall} variant="default" />
        <HudMeter label="Chem" value={result.scores.chemistry} variant="synergy" />
        <HudMeter label="Tactical Fit" value={result.scores.tacticalFit} variant="elite" />
        <HudMeter label="Attack" value={result.scores.attack} variant="default" />
        <HudMeter label="Midfield" value={result.scores.midfield} variant="default" />
        <HudMeter label="Defense" value={result.scores.defense} variant={result.scores.defense < 7 ? "alert" : "default"} />
      </div>

      <HudPanel
        title="Final Coach Note"
        tag="REPORT"
        icon={<HudIcon type="upgrade" />}
        variant="elite"
      >
        <p className="text-xs text-slate-300">{result.finalCoachNote}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
          <HudChip small>{platform}</HudChip>
          <HudChip small variant="elite">
            {divisionLevel}
          </HudChip>
          <HudChip small variant="synergy">
            {goal}
          </HudChip>
          <span className="ml-auto" style={{ color: HUD.primary }}>
            Pathway · {overall100}/100 · Chem {chemistry33}/33
          </span>
        </div>
      </HudPanel>
    </>
  );
}

/* ============================================================
   ROTATE OVERLAY
   ============================================================ */

function RotateOverlay({ onClose }: { onClose: () => void }) {
  return (
    <HudBackground>
      <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center px-6 text-center">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 px-3 py-1 text-xs"
          style={{
            color: HUD.inkDim,
            border: `1px solid ${HUD.primary}33`,
            clipPath:
              "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
          }}
        >
          ✕ Close
        </button>

        <div className="relative">
          <RadarRing size={120} />
          <div
            className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center"
            style={{ color: HUD.primary }}
          >
            <HudIcon type="scan" width={32} height={32} />
          </div>
        </div>

        <p
          className="mt-6 text-[10px] font-semibold uppercase tracking-[0.4em]"
          style={{ color: HUD.primary }}
        >
          Tactical Command Center
        </p>
        <h2 className="mt-3 max-w-md text-2xl font-bold text-white">
          Rotate device to engage landscape mode
        </h2>
        <p className="mt-3 max-w-md text-xs text-slate-400">
          The command center is desktop-first. Turn your phone sideways for
          the full 3-column tactical view.
        </p>
        <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-slate-600">
          // Disable rotation lock if your screen does not auto-rotate
        </p>

        <HudButton variant="default" onClick={onClose} className="mt-8">
          Stay in portrait
        </HudButton>
      </div>
    </HudBackground>
  );
}

/* ============================================================
   COMMAND CENTER (fullscreen landscape dashboard)
   ============================================================ */

function CommandCenter({
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
  const stage = useMemo(() => {
    if (overall100 >= 90) return 5;
    if (overall100 >= 80) return 4;
    if (overall100 >= 65) return 3;
    if (overall100 >= 50) return 2;
    return 1;
  }, [overall100]);

  const callouts = result.playerCallouts ?? [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col text-white">
      <HudBackground>
        {/* === Header bar === */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-4 py-2.5 backdrop-blur"
          style={{
            borderColor: `${HUD.primary}33`,
            background: `linear-gradient(180deg, ${HUD.primary}08, rgba(4,8,15,0.6))`,
          }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <HexBadge size={36} />
            <div className="min-w-0">
              <p
                className="text-[9px] font-semibold uppercase tracking-[0.4em]"
                style={{ color: HUD.primary }}
              >
                Valbri // Squad Reinforcement Engine
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-200">
                {result.summary.headline}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden items-center gap-2 lg:flex">
              <PulseDot color={HUD.synergy} label="LIVE" />
              <HudChip small>{platform}</HudChip>
              <HudChip small variant="elite">
                {divisionLevel}
              </HudChip>
              <HudChip small variant="synergy">
                {goal}
              </HudChip>
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="px-2.5 py-1 text-xs"
              style={{
                color: HUD.inkDim,
                border: `1px solid ${HUD.primary}55`,
                background: `${HUD.primary}10`,
                clipPath:
                  "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              ✕ Disengage
            </button>
          </div>
        </div>

        {/* === Body === */}
        <div className="hud-scroll flex-1 overflow-y-auto" style={{ height: "calc(100dvh - 56px)" }}>
          {/* Above-the-fold tactical command */}
          <div className="cc-grid gap-3 p-3">
            <LeftColumn result={result} chemistry33={chemistry33} overall100={overall100} />

            <CenterCanvas
              imagePreviewUrl={imagePreviewUrl}
              callouts={callouts}
              result={result}
              chemistry33={chemistry33}
            />

            <RightColumn
              result={result}
              overall100={overall100}
              stage={stage}
            />
          </div>

          {/* Scroll cue */}
          <div className="flex flex-col items-center gap-1 py-4">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.35em]"
              style={{ color: HUD.primary }}
            >
              // Scroll for full breakdown
            </p>
            <span
              className="hud-breathe text-base"
              style={{ color: HUD.primary }}
              aria-hidden
            >
              ▼
            </span>
          </div>

          {/* Below-the-fold breakdown */}
          <BelowFoldBreakdown
            result={result}
            overall100={overall100}
            stage={stage}
            chemistry33={chemistry33}
          />
        </div>
      </HudBackground>
    </div>
  );
}

/* ============================================================
   LEFT COLUMN
   ============================================================ */

function LeftColumn({
  result,
  chemistry33,
  overall100,
}: {
  result: ValbriSquadAdvisorResult;
  chemistry33: number;
  overall100: number;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <HudPanel
        title="Squad ID"
        tag="UNIT"
        icon={<HudIcon type="core" />}
        variant="default"
        compact
      >
        <div className="flex items-center gap-3">
          <div
            className="relative flex h-12 w-12 items-center justify-center"
            style={{
              border: `1px solid ${HUD.primary}55`,
              background: `${HUD.primary}10`,
              clipPath:
                "polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)",
            }}
          >
            <span
              className="font-mono text-lg font-bold tabular-nums"
              style={{ color: HUD.primary, textShadow: `0 0 8px ${HUD.primary}` }}
            >
              {overall100}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.25em] text-slate-500">
              Playstyle
            </p>
            <h3 className="truncate text-sm font-bold leading-tight text-white">
              {result.summary.playstyle}
            </h3>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          <HudMeter
            label="Chemistry"
            value={chemistry33}
            max={33}
            variant="synergy"
            decimals={0}
            unit="/33"
          />
          <HudMeter
            label="Overall"
            value={overall100}
            max={100}
            variant="default"
            decimals={0}
            unit="/100"
          />
        </div>

        <div className="mt-3 space-y-1.5">
          <HudListButton label="Set Active" icon={<HudIcon type="target" width={10} height={10} />} />
          <HudListButton label="Tactics" icon={<HudIcon type="upgrade" width={10} height={10} />} />
          <HudListButton label="Squad Builder" icon={<HudIcon type="synergy" width={10} height={10} />} />
        </div>
      </HudPanel>

      <HudPanel
        title="Strategic Summary"
        tag="CORE"
        icon={<HudIcon type="core" />}
        variant="elite"
        scanline
        compact
      >
        <ul className="space-y-3 text-xs">
          <li>
            <HudHeading color={HUD.elite}>Core Stability</HudHeading>
            <p className="mt-1 text-slate-300">{result.scoreReasons.overall}</p>
          </li>
          <li>
            <HudHeading color={HUD.alert}>Identified Weaknesses</HudHeading>
            <ul className="mt-1 space-y-1">
              {result.weaknesses.slice(0, 3).map((w) => (
                <li key={w.area} className="flex gap-2 text-slate-300">
                  <span style={{ color: HUD.alert }}>›</span>
                  <span>
                    <span className="text-white">{w.area}</span> · {w.reason}
                  </span>
                </li>
              ))}
            </ul>
          </li>
          <li>
            <HudHeading color={HUD.synergy}>Pathway Alignment</HudHeading>
            <p className="mt-1 text-slate-300">
              {overall100}/100 · focusing on{" "}
              {result.summary.mainOpportunity.toLowerCase()}.
            </p>
          </li>
        </ul>
      </HudPanel>
    </div>
  );
}

/* ============================================================
   CENTER CANVAS — squad image with targeting overlays
   ============================================================ */

function CenterCanvas({
  imagePreviewUrl,
  callouts,
  result,
  chemistry33,
}: {
  imagePreviewUrl: string;
  callouts: PlayerCallout[];
  result: ValbriSquadAdvisorResult;
  chemistry33: number;
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

  // Distribute callouts vertically, by side
  const placed = useMemo(() => {
    if (!imgSize.h) return [];
    const minGap = 70;
    const byside: Record<"left" | "right", PlayerCallout[]> = {
      left: callouts.filter((c) => c.side === "left").sort((a, b) => a.bbox.y - b.bbox.y),
      right: callouts.filter((c) => c.side === "right").sort((a, b) => a.bbox.y - b.bbox.y),
    };
    const out: { callout: PlayerCallout; anchorY: number; cardCx: number; cardCy: number; cardEdgeX: number }[] = [];
    for (const side of ["left", "right"] as const) {
      let lastY = -Infinity;
      for (const c of byside[side]) {
        let y = (c.bbox.y + c.bbox.h / 2) * imgSize.h;
        if (y - lastY < minGap) y = lastY + minGap;
        if (y > imgSize.h - 16) y = imgSize.h - 16;
        const cardCx = (c.bbox.x + c.bbox.w / 2) * imgSize.w;
        const cardCy = (c.bbox.y + c.bbox.h / 2) * imgSize.h;
        const cardEdgeX = side === "right" ? (c.bbox.x + c.bbox.w) * imgSize.w : c.bbox.x * imgSize.w;
        out.push({ callout: c, anchorY: y, cardCx, cardCy, cardEdgeX });
        lastY = y;
      }
    }
    return out;
  }, [callouts, imgSize.w, imgSize.h]);

  return (
    <div className="flex min-h-0 flex-col gap-3">
      {/* Image canvas */}
      <div
        className="relative"
        style={{
          background: "rgba(4,8,15,0.6)",
          border: `1px solid ${HUD.primary}33`,
          boxShadow: `inset 0 0 30px ${HUD.primary}10`,
          clipPath:
            "polygon(12px 0, 100% 0, 100% calc(100% - 12px), calc(100% - 12px) 100%, 0 100%, 0 12px)",
        }}
      >
        <HudCorners color={HUD.primary} size={12} inset={6} />

        {/* Top strip — readout */}
        <div
          className="flex items-center justify-between gap-3 border-b px-3 py-1.5"
          style={{
            borderColor: `${HUD.primary}26`,
            background: `linear-gradient(180deg, ${HUD.primary}10, transparent)`,
          }}
        >
          <div className="flex items-center gap-2">
            <RadarRing size={18} />
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.3em]"
              style={{ color: HUD.primary }}
            >
              Battlefield Scan
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span style={{ color: HUD.inkDim }}>
              RTG{" "}
              <span style={{ color: HUD.primary }}>
                {result.scores.overall.toFixed(1)}
              </span>
            </span>
            <span style={{ color: HUD.inkDim }}>
              CHM{" "}
              <span style={{ color: HUD.synergy }}>{chemistry33}/33</span>
            </span>
            <HudChip small variant="elite">
              {result.recommendedTactic.style}
            </HudChip>
          </div>
        </div>

        {/* Image */}
        <div className="relative">
          {imagePreviewUrl ? (
            <img
              ref={imgRef}
              src={imagePreviewUrl}
              alt="Squad battlefield"
              onLoad={measure}
              className="block w-full"
              style={{ height: "auto" }}
            />
          ) : (
            <div
              className="flex h-48 items-center justify-center text-xs"
              style={{ color: HUD.inkMute }}
            >
              No squad image — re-upload to scan
            </div>
          )}

          {/* Scanline over image */}
          <div className="hud-scanline pointer-events-none absolute inset-0" />

          {/* SVG overlay for frames + connectors */}
          {imgSize.w > 0 && placed.length > 0 ? (
            <svg
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: imgSize.w, height: imgSize.h }}
            >
              {placed.map((p, i) => {
                const x = p.callout.bbox.x * imgSize.w;
                const y = p.callout.bbox.y * imgSize.h;
                const w = p.callout.bbox.w * imgSize.w;
                const h = p.callout.bbox.h * imgSize.h;
                const isRight = p.callout.side === "right";
                const variant = severityToVariant(p.callout.severity);
                const color = variantConfig(variant).color;

                const fromX = isRight ? x + w + 2 : x - 2;
                const fromY = p.cardCy;
                // Callout anchor (panel side) is at image edge
                const toX = isRight ? imgSize.w - 18 : 18;
                const toY = p.anchorY;

                return (
                  <g key={i}>
                    <TargetingFrame
                      x={x}
                      y={y}
                      w={w}
                      h={h}
                      color={color}
                      chemistryRing={p.callout.severity === "info"}
                    />
                    <ConnectorLine
                      fromX={fromX}
                      fromY={fromY}
                      toX={toX}
                      toY={toY}
                      color={color}
                    />
                  </g>
                );
              })}
            </svg>
          ) : null}

          {/* Floating analysis panels on image edges */}
          {placed.map((p, i) => {
            const isRight = p.callout.side === "right";
            const variant = severityToVariant(p.callout.severity);
            const color = variantConfig(variant).color;
            return (
              <div
                key={i}
                className="absolute z-[2]"
                style={{
                  top: p.anchorY - 30,
                  [isRight ? "right" : "left"]: 6,
                  width: "30%",
                  maxWidth: 170,
                  minWidth: 110,
                  background: "rgba(4,8,15,0.92)",
                  border: `1px solid ${color}66`,
                  boxShadow: `0 0 18px ${color}33`,
                  clipPath:
                    "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
                  padding: "6px 8px",
                }}
              >
                <div
                  className="flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.2em]"
                  style={{ color }}
                >
                  <span>{p.callout.position}</span>
                  <span>{p.callout.label}</span>
                </div>
                <p className="mt-1 text-[10px] leading-tight text-slate-200">
                  {p.callout.note}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Telemetry under image */}
      <HudPanel
        title="Tactical Telemetry"
        tag="LIVE"
        icon={<HudIcon type="scan" />}
        variant="default"
        compact
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <HudMeter label="Overall AI Rating" value={result.scores.overall} variant="default" />
          <HudMeter label="Chemistry" value={result.scores.chemistry} variant="synergy" />
          <HudMeter label="Tactical Fit" value={result.scores.tacticalFit} variant="elite" />
          <HudMeter label="Defensive Stability" value={result.scores.defense} variant={result.scores.defense < 7 ? "alert" : "default"} />
          <HudMeter label="Press Resistance" value={(result.scores.midfield + result.scores.defense) / 2} variant="default" />
          <HudMeter label="Upgrade Potential" value={Math.max(0, 10 - result.scores.overall + 3)} variant="upgrade" />
        </div>
      </HudPanel>
    </div>
  );
}

/* ============================================================
   RIGHT COLUMN
   ============================================================ */

function RightColumn({
  result,
  overall100,
  stage,
}: {
  result: ValbriSquadAdvisorResult;
  overall100: number;
  stage: number;
}) {
  return (
    <div className="flex min-h-0 flex-col gap-3">
      <HudPanel
        title="Performance Alert"
        tag="ALERT"
        icon={<HudIcon type="alert" />}
        variant="alert"
        compact
      >
        <p className="text-xs text-slate-200">
          {result.summary.mainWeakness} — position stats below target
          threshold.
        </p>
        <ul className="mt-2 space-y-1 text-[11px]">
          {result.weaknesses.slice(0, 3).map((w) => (
            <li key={w.area} className="flex items-start gap-2 text-slate-400">
              <span style={{ color: HUD.alert }}>›</span>
              <span>
                <span className="text-white">{w.area}</span> · {w.reason}
              </span>
            </li>
          ))}
        </ul>
      </HudPanel>

      <HudPanel
        title="Connectivity Graph"
        tag="LINKS"
        icon={<HudIcon type="synergy" />}
        variant="synergy"
        compact
      >
        <ConnectivityGraph
          strengths={result.strengths.length}
          weaknesses={result.weaknesses.length}
        />
        <div className="mt-2 grid grid-cols-2 gap-2">
          <HudMeter label="Attack" value={result.scores.attack} variant="default" />
          <HudMeter label="Defense" value={result.scores.defense} variant={result.scores.defense < 7 ? "alert" : "default"} />
        </div>
      </HudPanel>

      <HudPanel
        title="Upgrade Pathway"
        tag={`${overall100}/100`}
        icon={<HudIcon type="upgrade" />}
        variant="upgrade"
        compact
      >
        <div
          className="relative h-2 w-full"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${HUD.primary}26`,
          }}
        >
          <div
            className="absolute left-0 top-0 h-full"
            style={{
              width: `${overall100}%`,
              background: `linear-gradient(90deg, ${HUD.primary}, ${HUD.bright})`,
              boxShadow: `0 0 10px ${HUD.primary}`,
            }}
          />
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1 text-center text-[9px]">
          {[1, 2, 3, 4, 5].map((s) => {
            const active = stage >= s;
            return (
              <div
                key={s}
                className="border px-1 py-1 font-semibold uppercase tracking-[0.18em]"
                style={{
                  color: active ? HUD.primary : HUD.inkMute,
                  borderColor: active ? `${HUD.primary}55` : "rgba(255,255,255,0.08)",
                  background: active ? `${HUD.primary}14` : "transparent",
                  clipPath: "polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%)",
                }}
              >
                S{s}
              </div>
            );
          })}
        </div>
      </HudPanel>
    </div>
  );
}

/* ============================================================
   BELOW THE FOLD
   ============================================================ */

function BelowFoldBreakdown({
  result,
  overall100,
  stage,
  chemistry33,
}: {
  result: ValbriSquadAdvisorResult;
  overall100: number;
  stage: number;
  chemistry33: number;
}) {
  return (
    <div className="space-y-3 px-3 pb-8">
      {/* Recommended tactic */}
      <HudPanel
        title="Recommended Tactic"
        tag="FIT"
        icon={<HudIcon type="upgrade" />}
        variant="elite"
        compact
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-bold text-white">
            {result.recommendedTactic.style}
          </h3>
          <HudChip small variant="elite">
            Best fit
          </HudChip>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          {result.recommendedTactic.reason}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <TacticStat label="Width" value={result.recommendedTactic.settings.width} />
          <TacticStat label="Depth" value={result.recommendedTactic.settings.depth} />
          <TacticStat label="Att. Width" value={result.recommendedTactic.settings.attackingWidth} />
          <TacticStat label="Box Players" value={result.recommendedTactic.settings.playersInBox} />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
          <TacticKV label="Defensive" value={result.recommendedTactic.settings.defensiveStyle} />
          <TacticKV label="Build-Up" value={result.recommendedTactic.settings.buildUpPlay} />
          <TacticKV label="Chance Creation" value={result.recommendedTactic.settings.chanceCreation} />
        </div>
      </HudPanel>

      {/* Player roles */}
      <HudPanel
        title="Player Roles"
        tag="ROLES"
        icon={<HudIcon type="target" />}
        variant="default"
        compact
      >
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {result.playerInstructions.map((item) => (
            <div
              key={item.position}
              className="p-2.5"
              style={{
                border: `1px solid ${HUD.primary}22`,
                background: "rgba(0,0,0,0.3)",
                clipPath:
                  "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
              }}
            >
              <div className="flex items-center gap-2">
                <HudChip small>{item.position}</HudChip>
                <p className="text-xs font-semibold text-white">
                  {item.instruction}
                </p>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">{item.reason}</p>
            </div>
          ))}
        </div>
      </HudPanel>

      {/* Priorities + stages + strengths */}
      <div className="grid gap-3 lg:grid-cols-3">
        <HudPanel
          title="Upgrade Priorities"
          tag="PRIORITY"
          icon={<HudIcon type="upgrade" />}
          variant="upgrade"
          compact
        >
          <div className="space-y-2">
            {result.upgradePriorities.map((p) => (
              <div
                key={p.priority}
                className="p-2"
                style={{
                  border: `1px solid ${HUD.primary}33`,
                  background: "rgba(0,0,0,0.3)",
                  clipPath:
                    "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 items-center justify-center font-mono text-[10px] font-bold"
                    style={{
                      color: HUD.primary,
                      border: `1px solid ${HUD.primary}55`,
                      background: `${HUD.primary}10`,
                    }}
                  >
                    {p.priority}
                  </span>
                  <p className="text-xs font-semibold text-white">{p.area}</p>
                </div>
                <p className="mt-1 text-[11px] text-slate-300">
                  {p.recommendedProfile}
                </p>
                <p className="mt-0.5 text-[10px] text-slate-500">{p.reason}</p>
              </div>
            ))}
          </div>
        </HudPanel>

        <HudPanel
          title="Pathway Stages"
          tag="ROUTE"
          icon={<HudIcon type="scan" />}
          variant="default"
          compact
        >
          <div className="space-y-2 text-xs">
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
        </HudPanel>

        <HudPanel
          title="Strengths"
          tag="+"
          icon={<HudIcon type="synergy" />}
          variant="synergy"
          compact
        >
          <div className="space-y-2 text-xs">
            {result.strengths.map((item) => (
              <div key={item.title}>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="mt-0.5 text-slate-400">{item.reason}</p>
              </div>
            ))}
          </div>
        </HudPanel>
      </div>

      {/* Weaknesses */}
      <HudPanel
        title="Weaknesses"
        tag="!"
        icon={<HudIcon type="alert" />}
        variant="alert"
        compact
      >
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {result.weaknesses.map((item) => (
            <div
              key={item.area}
              className="p-2.5"
              style={{
                border: `1px solid ${HUD.alert}33`,
                background: "rgba(0,0,0,0.3)",
                clipPath:
                  "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
              }}
            >
              <p className="text-xs font-semibold text-white">{item.area}</p>
              <p className="mt-1 text-[11px] text-slate-400">{item.reason}</p>
              <p
                className="mt-1.5 text-[9px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: HUD.alert }}
              >
                {item.fixType.replaceAll("_", " ")}
              </p>
            </div>
          ))}
        </div>
      </HudPanel>

      {/* Analysis report */}
      <HudPanel
        title="Squad Reinforcement Engine // Analysis Report"
        tag="REPORT"
        icon={<HudIcon type="core" />}
        variant="elite"
        scanline
        compact
      >
        <p className="text-xs leading-relaxed text-slate-300">
          Current squad (Rating {result.scores.overall.toFixed(1)}, Chem{" "}
          {chemistry33}/33) exhibits high individual card ratings but{" "}
          {result.summary.mainWeakness.toLowerCase()} introduces a positional
          inefficiency. {result.scoreReasons.overall}{" "}
          {result.scoreReasons.tacticalFit}
          {result.weaknesses[0]
            ? ` The most critical immediate upgrade is ${result.weaknesses[0].area}, as it is the dominant bottleneck to full team rating.`
            : ""}{" "}
          Overall pathway progress is {overall100}/100. Stages{" "}
          {Math.min(5, stage + 1)} & {Math.min(5, stage + 2)} will specifically
          address player-acquisition and tactical-role alignment.
        </p>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <ReportCard
            heading="Form Performance"
            body={`${result.summary.mainWeakness} needs attention.`}
            color={HUD.alert}
          />
          <ReportCard
            heading="Synergy Target"
            body={result.summary.mainOpportunity}
            color={HUD.synergy}
          />
          <ReportCard
            heading="Potential Unlocked"
            body={`Switch to "${result.recommendedTactic.style}".`}
            color={HUD.primary}
          />
        </div>

        <div
          className="mt-3 p-3"
          style={{
            border: `1px solid ${HUD.primary}44`,
            background: `${HUD.primary}10`,
            clipPath:
              "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
          }}
        >
          <HudHeading color={HUD.primary}>Final Coach Note</HudHeading>
          <p className="mt-1.5 text-xs text-slate-200">{result.finalCoachNote}</p>
        </div>
      </HudPanel>
    </div>
  );
}

/* ============================================================
   Subcomponents
   ============================================================ */

function TacticStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="px-2 py-1.5 text-center"
      style={{
        border: `1px solid ${HUD.primary}22`,
        background: "rgba(0,0,0,0.3)",
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p
        className="font-mono text-base font-bold tabular-nums"
        style={{ color: HUD.primary, textShadow: `0 0 6px ${HUD.primary}33` }}
      >
        {value}
      </p>
    </div>
  );
}

function TacticKV({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="px-2 py-1.5"
      style={{
        border: `1px solid ${HUD.primary}22`,
        background: "rgba(0,0,0,0.3)",
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.2em] text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 truncate text-xs font-semibold text-white">{value}</p>
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
      className="px-2 py-1.5"
      style={{
        border: `1px solid ${done ? HUD.primary + "55" : "rgba(255,255,255,0.08)"}`,
        background: done ? `${HUD.primary}10` : "rgba(0,0,0,0.3)",
      }}
    >
      <div className="flex items-center justify-between">
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: done ? HUD.primary : HUD.inkDim }}
        >
          {label}
        </p>
        <span
          className="border px-1.5 py-0.5 text-[8px] uppercase tracking-[0.18em]"
          style={{ borderColor: "rgba(255,255,255,0.1)", color: HUD.inkDim }}
        >
          {level}
        </span>
      </div>
      <p className="mt-1 text-[10px] text-slate-400">{summary}</p>
    </div>
  );
}

function ReportCard({
  heading,
  body,
  color,
}: {
  heading: string;
  body: string;
  color: string;
}) {
  return (
    <div
      className="p-2.5"
      style={{
        border: `1px solid ${color}44`,
        background: "rgba(0,0,0,0.3)",
        clipPath:
          "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
      }}
    >
      <p
        className="text-[9px] font-semibold uppercase tracking-[0.25em]"
        style={{ color }}
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
  const radius = 56;
  const cx = 75;
  const cy = 75;

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
    <div className="flex items-center justify-center">
      <svg width="150" height="150" viewBox="0 0 150 150">
        <defs>
          <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={HUD.synergy} stopOpacity="0.5" />
            <stop offset="100%" stopColor={HUD.synergy} stopOpacity="0" />
          </radialGradient>
        </defs>

        <circle cx={cx} cy={cy} r={radius + 6} fill="url(#coreGlow)" />

        {/* Rotating outer ring */}
        <g className="hud-sweep" style={{ transformOrigin: `${cx}px ${cy}px` }}>
          {[0, 90, 180, 270].map((deg) => {
            const rad = (deg * Math.PI) / 180;
            const x1 = cx + (radius + 8) * Math.cos(rad);
            const y1 = cy + (radius + 8) * Math.sin(rad);
            const x2 = cx + (radius + 12) * Math.cos(rad);
            const y2 = cy + (radius + 12) * Math.sin(rad);
            return (
              <line
                key={deg}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={HUD.synergy}
                strokeWidth={1.5}
                opacity={0.7}
              />
            );
          })}
        </g>

        {/* Spokes */}
        {nodes.map((n, i) => (
          <line
            key={`s-${i}`}
            x1={cx}
            y1={cy}
            x2={n.x}
            y2={n.y}
            stroke={n.weak ? HUD.alert : HUD.synergy}
            strokeOpacity={n.weak ? 0.5 : 0.3}
            strokeWidth={1}
          />
        ))}

        {/* Cross-links */}
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
                  stroke={HUD.synergy}
                  strokeOpacity={0.08}
                  strokeWidth={1}
                />
              ) : null
            )
        )}

        {/* Center */}
        <circle
          cx={cx}
          cy={cy}
          r={6}
          fill={HUD.synergy}
          style={{ filter: `drop-shadow(0 0 6px ${HUD.synergy})` }}
        />

        {/* Nodes */}
        {nodes.map((n, i) => (
          <circle
            key={`n-${i}`}
            cx={n.x}
            cy={n.y}
            r={n.weak ? 4 : 3.5}
            fill={n.weak ? HUD.alert : n.strong ? HUD.synergy : "#94a3b8"}
            style={{
              filter: n.weak
                ? `drop-shadow(0 0 4px ${HUD.alert})`
                : n.strong
                ? `drop-shadow(0 0 4px ${HUD.synergy})`
                : undefined,
            }}
          />
        ))}
      </svg>
    </div>
  );
}
