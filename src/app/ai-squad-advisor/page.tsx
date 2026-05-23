// src/app/ai-squad-advisor/page.tsx

"use client";

import type { ChangeEvent, FormEvent } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ChatMessage,
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
            currentTactics={currentTactics}
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
            Card-level callouts · Upgrade profiles · Tactical chat
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
        Drop a squad screenshot. The engine flags the cards that need
        attention and recommends replacement profiles.
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
                <div
                  className="mx-auto mb-3 flex h-12 w-12 items-center justify-center"
                  style={{ color: HUD.primary }}
                >
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
                    background: active
                      ? `${HUD.primary}14`
                      : "rgba(255,255,255,0.02)",
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
            onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) => setCurrentTactics(event.target.value)}
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
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
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
          Once the squad image is ingested, the engine auto-launches the
          landscape command center: per-card callouts, replacement profiles,
          and a tactical chat below.
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
  const callouts = result.playerCallouts ?? [];
  const critical = callouts.filter((c) => c.severity === "critical").length;
  const warning = callouts.filter((c) => c.severity === "warning").length;
  const info = callouts.filter((c) => c.severity === "info").length;

  return (
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
            {callouts.length} player callout{callouts.length === 1 ? "" : "s"} ready
          </h2>
          <p className="mt-2 text-xs text-slate-400">
            Open the command center to see each card&apos;s issue, suggested
            replacement profile, and chat with the engine about tactics.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
            <HudChip small variant="critical">
              {critical} critical
            </HudChip>
            <HudChip small variant="alert">
              {warning} warning
            </HudChip>
            <HudChip small>{info} info</HudChip>
            <HudChip small>{platform}</HudChip>
            <HudChip small variant="elite">
              {divisionLevel}
            </HudChip>
            <HudChip small variant="synergy">
              {goal}
            </HudChip>
          </div>
        </div>
        <HudButton variant="primary" onClick={onReopen}>
          <HudIcon type="target" width={12} height={12} />
          <span>Open command center</span>
        </HudButton>
      </div>
    </HudPanel>
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
  currentTactics,
  onClose,
}: {
  result: ValbriSquadAdvisorResult;
  imagePreviewUrl: string;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  currentTactics: string;
  onClose: () => void;
}) {
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
                {callouts.length} player callout
                {callouts.length === 1 ? "" : "s"} · scroll for tactical chat
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
        <div
          className="hud-scroll flex-1 overflow-y-auto"
          style={{ height: "calc(100dvh - 56px)" }}
        >
          <div className="p-3">
            <AnalysisStage
              imagePreviewUrl={imagePreviewUrl}
              callouts={callouts}
            />
          </div>

          {/* Scroll cue */}
          <div className="flex flex-col items-center gap-1 py-4">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.35em]"
              style={{ color: HUD.primary }}
            >
              // Scroll for tactical chat
            </p>
            <span
              className="hud-breathe text-base"
              style={{ color: HUD.primary }}
              aria-hidden
            >
              ▼
            </span>
          </div>

          <div className="px-3 pb-8">
            <ChatBot
              analysis={result}
              platform={platform}
              divisionLevel={divisionLevel}
              goal={goal}
              currentTactics={currentTactics}
            />
          </div>
        </div>
      </HudBackground>
    </div>
  );
}

/* ============================================================
   ANALYSIS STAGE — 3 columns (left callouts | image | right callouts)
   with global SVG connector overlay
   ============================================================ */

type Connector = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
};

function AnalysisStage({
  imagePreviewUrl,
  callouts,
}: {
  imagePreviewUrl: string;
  callouts: PlayerCallout[];
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const leftCallouts = useMemo(
    () => callouts.filter((c) => c.side === "left"),
    [callouts]
  );
  const rightCallouts = useMemo(
    () => callouts.filter((c) => c.side === "right"),
    [callouts]
  );

  // Stable IDs so refs / measurements survive re-renders
  const calloutIds = useMemo(
    () =>
      callouts.map(
        (c, i) =>
          `${c.side}-${c.position}-${i}-${c.bbox.x.toFixed(3)}-${c.bbox.y.toFixed(3)}`
      ),
    [callouts]
  );

  const calloutRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());
  const setCalloutRef = useCallback(
    (id: string) => (el: HTMLDivElement | null) => {
      if (el) calloutRefs.current.set(id, el);
      else calloutRefs.current.delete(id);
    },
    []
  );

  const [stageSize, setStageSize] = useState({ w: 0, h: 0 });
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const [frames, setFrames] = useState<
    { id: string; x: number; y: number; w: number; h: number; color: string; severity: PlayerCalloutSeverity }[]
  >([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img) return;
    if (!img.complete || img.naturalWidth === 0) return;

    const stageRect = stage.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    setStageSize({ w: stageRect.width, h: stageRect.height });
    setImgSize({ w: imgRect.width, h: imgRect.height });

    // Frames SVG is a direct sibling of the <img> inside the same wrapper,
    // so its (0,0) aligns with the image's top-left — no offset needed.
    const nextFrames = callouts.map((c, i) => {
      const x = c.bbox.x * imgRect.width;
      const y = c.bbox.y * imgRect.height;
      const w = c.bbox.w * imgRect.width;
      const h = c.bbox.h * imgRect.height;
      const variant = severityToVariant(c.severity);
      return {
        id: calloutIds[i],
        x,
        y,
        w,
        h,
        color: variantConfig(variant).color,
        severity: c.severity,
      };
    });
    setFrames(nextFrames);

    // Connectors are drawn in stage-local coords.
    const cardOriginX = imgRect.left - stageRect.left;
    const cardOriginY = imgRect.top - stageRect.top;

    const nextConnectors: Connector[] = [];
    callouts.forEach((c, i) => {
      const id = calloutIds[i];
      const calloutEl = calloutRefs.current.get(id);
      if (!calloutEl) return;

      const cardX = cardOriginX + c.bbox.x * imgRect.width;
      const cardY = cardOriginY + c.bbox.y * imgRect.height;
      const cardW = c.bbox.w * imgRect.width;
      const cardH = c.bbox.h * imgRect.height;
      const cardCy = cardY + cardH / 2;

      const calloutRect = calloutEl.getBoundingClientRect();
      const calloutLeft = calloutRect.left - stageRect.left;
      const calloutRight = calloutRect.right - stageRect.left;
      const calloutCy = calloutRect.top - stageRect.top + calloutRect.height / 2;

      const isRight = c.side === "right";
      const fromX = isRight ? cardX + cardW : cardX;
      const fromY = cardCy;
      const toX = isRight ? calloutLeft : calloutRight;
      const toY = calloutCy;

      nextConnectors.push({
        id,
        fromX,
        fromY,
        toX,
        toY,
        color: variantConfig(severityToVariant(c.severity)).color,
      });
    });
    setConnectors(nextConnectors);
  }, [callouts, calloutIds]);

  useLayoutEffect(() => {
    measure();
  }, [measure, imagePreviewUrl, leftCallouts.length, rightCallouts.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    let stageRo: ResizeObserver | null = null;
    let imgRo: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      stageRo = new ResizeObserver(() => measure());
      if (stageRef.current) stageRo.observe(stageRef.current);
      imgRo = new ResizeObserver(() => measure());
      if (imgRef.current) imgRo.observe(imgRef.current);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      stageRo?.disconnect();
      imgRo?.disconnect();
    };
  }, [measure]);

  return (
    <div
      ref={stageRef}
      className="relative grid gap-3"
      style={{ gridTemplateColumns: "minmax(220px, 1fr) 2.4fr minmax(220px, 1fr)" }}
    >
      {/* LEFT COLUMN */}
      <div className="flex flex-col gap-3">
        {leftCallouts.length === 0 ? (
          <EmptySideNote side="left" />
        ) : (
          leftCallouts.map((c) => {
            const idx = callouts.indexOf(c);
            const id = calloutIds[idx];
            return (
              <CalloutCard
                key={id}
                refCb={setCalloutRef(id)}
                callout={c}
              />
            );
          })
        )}
      </div>

      {/* CENTER COLUMN — image with targeting frames */}
      <div
        ref={imageWrapRef}
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

        {/* Top strip */}
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
          <div className="flex items-center gap-2 text-[10px]" style={{ color: HUD.inkDim }}>
            <span>
              FLAGS{" "}
              <span style={{ color: HUD.primary }}>{callouts.length}</span>
            </span>
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

          <div className="hud-scanline pointer-events-none absolute inset-0" />

          {/* Targeting frames over cards */}
          {imgSize.w > 0 && frames.length > 0 ? (
            <svg
              className="pointer-events-none absolute left-0 top-0"
              style={{ width: imgSize.w, height: imgSize.h }}
            >
              {frames.map((f) => (
                <TargetingFrame
                  key={f.id}
                  x={f.x}
                  y={f.y}
                  w={f.w}
                  h={f.h}
                  color={f.color}
                  chemistryRing={f.severity === "info"}
                />
              ))}
            </svg>
          ) : null}
        </div>
      </div>

      {/* RIGHT COLUMN */}
      <div className="flex flex-col gap-3">
        {rightCallouts.length === 0 ? (
          <EmptySideNote side="right" />
        ) : (
          rightCallouts.map((c) => {
            const idx = callouts.indexOf(c);
            const id = calloutIds[idx];
            return (
              <CalloutCard
                key={id}
                refCb={setCalloutRef(id)}
                callout={c}
              />
            );
          })
        )}
      </div>

      {/* GLOBAL CONNECTOR OVERLAY (spans all columns) */}
      {stageSize.w > 0 && connectors.length > 0 ? (
        <svg
          className="pointer-events-none absolute left-0 top-0 z-[3]"
          style={{ width: stageSize.w, height: stageSize.h }}
        >
          {connectors.map((c) => (
            <ConnectorLine
              key={c.id}
              fromX={c.fromX}
              fromY={c.fromY}
              toX={c.toX}
              toY={c.toY}
              color={c.color}
            />
          ))}
        </svg>
      ) : null}
    </div>
  );
}

function EmptySideNote({ side }: { side: "left" | "right" }) {
  return (
    <div
      className="flex items-center justify-center px-3 py-6 text-center text-[10px] uppercase tracking-[0.25em]"
      style={{
        color: HUD.inkMute,
        border: `1px dashed ${HUD.primary}22`,
        background: "rgba(0,0,0,0.25)",
        clipPath:
          "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
      }}
    >
      No {side}-side flags
    </div>
  );
}

/* ============================================================
   CALLOUT CARD — per-player diagnostic + replacement profile
   ============================================================ */

function CalloutCard({
  callout,
  refCb,
}: {
  callout: PlayerCallout;
  refCb: (el: HTMLDivElement | null) => void;
}) {
  const variant = severityToVariant(callout.severity);
  const color = variantConfig(variant).color;

  return (
    <div
      ref={refCb}
      className="relative"
      style={{
        background: "rgba(4,8,15,0.92)",
        border: `1px solid ${color}66`,
        boxShadow: `0 0 18px ${color}22`,
        clipPath:
          "polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)",
      }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.22em]"
        style={{ color, borderColor: `${color}33` }}
      >
        <span className="flex items-center gap-1.5">
          <span
            className="inline-flex h-4 w-4 items-center justify-center"
            style={{
              border: `1px solid ${color}88`,
              background: `${color}18`,
            }}
          >
            {callout.position}
          </span>
          {callout.label}
        </span>
        <span style={{ color: HUD.inkMute }}>{callout.severity}</span>
      </div>

      <div className="space-y-2 px-3 py-2.5">
        <p className="text-[11px] leading-snug text-slate-200">
          {callout.note}
        </p>

        {callout.recommendedReplacement ? (
          <div
            className="space-y-1 px-2.5 py-2"
            style={{
              border: `1px solid ${HUD.primary}33`,
              background: `${HUD.primary}08`,
              clipPath:
                "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
            }}
          >
            <p
              className="text-[9px] font-semibold uppercase tracking-[0.25em]"
              style={{ color: HUD.primary }}
            >
              Replacement Profile
            </p>
            <p className="text-[11px] font-semibold text-white">
              {callout.recommendedReplacement.profile}
            </p>
            <p className="text-[10px] leading-snug text-slate-400">
              {callout.recommendedReplacement.reason}
            </p>
          </div>
        ) : (
          <p
            className="text-[9px] uppercase tracking-[0.25em]"
            style={{ color: HUD.inkMute }}
          >
            Tactical fix — no replacement needed
          </p>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   CHAT BOT
   ============================================================ */

function ChatBot({
  analysis,
  platform,
  divisionLevel,
  goal,
  currentTactics,
}: {
  analysis: ValbriSquadAdvisorResult;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  currentTactics: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, isSending]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setInput("");
    setIsSending(true);
    setError("");

    try {
      const response = await fetch("/api/ai/squad-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          analysis,
          platform,
          divisionLevel,
          goal,
          currentTactics,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.success || !data?.reply) {
        throw new Error(
          data?.error ?? `Chat request failed (HTTP ${response.status}).`
        );
      }
      setMessages([
        ...nextMessages,
        { role: "assistant", content: String(data.reply) },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setIsSending(false);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  const suggestions = [
    "What tactic best fits my squad?",
    "Which player should I upgrade first?",
    "Best instructions for the flagged players?",
  ];

  return (
    <HudPanel
      title="Tactical Chat"
      tag="CHAT"
      icon={<HudIcon type="core" />}
      variant="elite"
      compact
    >
      <p className="text-[11px] text-slate-400">
        The engine has your squad callouts in context. Ask about tactics,
        formations, upgrade order, or anything else about this squad.
      </p>

      <div
        ref={scrollRef}
        className="hud-scroll mt-3 max-h-[420px] min-h-[200px] space-y-2 overflow-y-auto px-1 py-2"
        style={{
          border: `1px solid ${HUD.primary}22`,
          background: "rgba(0,0,0,0.35)",
        }}
      >
        {messages.length === 0 && !isSending ? (
          <div className="px-3 py-6 text-center text-[11px] text-slate-500">
            No messages yet. Try one of the prompts below or type your own.
          </div>
        ) : null}

        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}

        {isSending ? (
          <div className="flex items-center gap-2 px-3 py-2 text-[11px]" style={{ color: HUD.primary }}>
            <RadarRing size={14} />
            <span>Engine thinking…</span>
          </div>
        ) : null}
      </div>

      {messages.length === 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              disabled={isSending}
              className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] transition disabled:opacity-50"
              style={{
                color: HUD.primary,
                border: `1px solid ${HUD.primary}44`,
                background: `${HUD.primary}08`,
                clipPath:
                  "polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%)",
              }}
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-3 flex items-stretch gap-2">
        <input
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          placeholder="Ask the engine about your squad…"
          disabled={isSending}
          className="block w-full bg-black/40 px-3 py-2 text-xs text-white placeholder:text-slate-600 disabled:opacity-50"
          style={{
            border: `1px solid ${HUD.primary}33`,
            clipPath:
              "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
          }}
        />
        <HudButton
          variant="primary"
          type="submit"
          disabled={isSending || input.trim().length === 0}
        >
          <HudIcon type="target" width={12} height={12} />
          <span>Send</span>
        </HudButton>
      </form>

      {error ? (
        <div
          className="mt-2 px-3 py-2 text-[11px]"
          style={{
            color: HUD.critical,
            border: `1px solid ${HUD.critical}55`,
            background: `${HUD.critical}10`,
            clipPath:
              "polygon(6px 0, 100% 0, 100% calc(100% - 6px), calc(100% - 6px) 100%, 0 100%, 0 6px)",
          }}
        >
          <span className="font-semibold uppercase tracking-[0.2em]">
            Chat error ·{" "}
          </span>
          {error}
        </div>
      ) : null}
    </HudPanel>
  );
}

function ChatBubble({
  role,
  content,
}: {
  role: "user" | "assistant";
  content: string;
}) {
  const isUser = role === "user";
  const color = isUser ? HUD.synergy : HUD.primary;
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} px-2`}
    >
      <div
        className="max-w-[80%] whitespace-pre-wrap px-3 py-2 text-[11px] leading-snug text-slate-100"
        style={{
          border: `1px solid ${color}44`,
          background: `${color}10`,
          clipPath: isUser
            ? "polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)"
            : "polygon(0 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%)",
        }}
      >
        <p
          className="mb-1 text-[8px] font-semibold uppercase tracking-[0.3em]"
          style={{ color }}
        >
          {isUser ? "You" : "Engine"}
        </p>
        {content}
      </div>
    </div>
  );
}
