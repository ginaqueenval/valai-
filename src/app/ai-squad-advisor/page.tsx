// src/app/ai-squad-advisor/page.tsx
//
// Chat-stream coaching UI. Everything happens in one vertical thread:
//   - User uploads squad → vision extracts a draft → user edits & confirms
//     → AI returns a MatchPlan → conversation continues.
// The composer is always there at the bottom for image attachments and text.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LargeTitleHeader } from "@/components/ui/LargeTitleHeader";
import { StatusPill } from "@/components/ui/StatusPill";
import { StreamComposer } from "@/components/advisor/StreamComposer";
import {
  StreamMessage,
  type StreamEntry,
} from "@/components/advisor/StreamMessage";
import { DualUploadCard } from "@/components/advisor/DualUploadCard";
import type {
  MatchPlan,
  PlayStyle,
  Squad,
  SquadDraft,
} from "@/lib/ai/matchPlanSchema";
import { clearSession, loadSession, saveSession } from "@/lib/storage/session";

type Phase =
  | { type: "idle" }
  | { type: "extracting" }
  | { type: "confirming"; draft: SquadDraft; opponentSquad: Squad | null }
  | { type: "planning"; squad: Squad; opponentSquad: Squad | null }
  | { type: "ready"; squad: Squad; plan: MatchPlan; opponentSquad: Squad | null }
  | {
      type: "replanning";
      squad: Squad;
      plan: MatchPlan;
      opponentSquad: Squad | null;
    }
  | {
      type: "chatting";
      squad: Squad;
      plan: MatchPlan;
      opponentSquad: Squad | null;
    };

let entryCounter = 0;
function nextId() {
  entryCounter += 1;
  return `e${entryCounter}`;
}

export default function AiSquadAdvisorPage() {
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  // In idle the dual upload card carries the conversation, so we start with
  // an empty thread. The first stream entries get appended once the user
  // submits a squad.
  const [entries, setEntries] = useState<StreamEntry[]>([]);

  // Dual upload slots: left = user's own squad (required), right = opponent
  // (optional, triggers counter-tactical mode).
  const [selfImage, setSelfImage] = useState<File | null>(null);
  const [selfImageUrl, setSelfImageUrl] = useState("");
  const [opponentImage, setOpponentImage] = useState<File | null>(null);
  const [opponentImageUrl, setOpponentImageUrl] = useState("");

  // Composer is for follow-up chat after a plan exists.
  const [composerText, setComposerText] = useState("");
  const [pendingUserContext, setPendingUserContext] = useState("");
  const [hydrated, setHydrated] = useState(false);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  // Hydrate from localStorage on mount. We restore squad + plan + context as
  // a "resumed session" message so the user understands they're picking up
  // where they left off, not starting fresh.
  useEffect(() => {
    const stored = loadSession();
    setHydrated(true);
    if (!stored) return;

    setPendingUserContext(stored.userContext);
    setPhase({
      type: "ready",
      squad: stored.squad,
      plan: stored.plan,
      opponentSquad: null,
    });
    setEntries([
      {
        id: nextId(),
        kind: "ai-text",
        content:
          "Picking up from your last session. Your match plan is below — ask follow-ups, pivot the style, or reset to start over.",
      },
      { id: nextId(), kind: "ai-match-plan", plan: stored.plan },
    ]);
  }, []);

  // Persist whenever phase carries a ready plan. We only save on the "ready"
  // edges so we don't write during loading transitions.
  useEffect(() => {
    if (!hydrated) return;
    if (phase.type === "ready") {
      saveSession({
        squad: phase.squad,
        plan: phase.plan,
        userContext: pendingUserContext,
      });
    }
  }, [hydrated, phase, pendingUserContext]);

  function appendEntry(entry: StreamEntry) {
    setEntries((prev) => [...prev, entry]);
  }

  function replaceEntry(id: string, entry: StreamEntry) {
    setEntries((prev) => prev.map((e) => (e.id === id ? entry : e)));
  }

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [entries.length]);

  const isBusy =
    phase.type === "extracting" ||
    phase.type === "planning" ||
    phase.type === "replanning" ||
    phase.type === "chatting";

  function handleSelfImageChange(file: File | null) {
    if (selfImageUrl) URL.revokeObjectURL(selfImageUrl);
    if (file) {
      setSelfImage(file);
      setSelfImageUrl(URL.createObjectURL(file));
    } else {
      setSelfImage(null);
      setSelfImageUrl("");
    }
  }

  function handleOpponentImageChange(file: File | null) {
    if (opponentImageUrl) URL.revokeObjectURL(opponentImageUrl);
    if (file) {
      setOpponentImage(file);
      setOpponentImageUrl(URL.createObjectURL(file));
    } else {
      setOpponentImage(null);
      setOpponentImageUrl("");
    }
  }

  /** Calls the squad-extract endpoint for a single image. Returns the draft
   *  on success, throws on failure. */
  async function extractOneSquad(file: File): Promise<SquadDraft> {
    const fd = new FormData();
    fd.append("squadImage", file);
    const res = await fetch("/api/ai/squad-extract", { method: "POST", body: fd });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success || !data?.draft) {
      throw new Error(data?.error ?? `Extract failed (HTTP ${res.status}).`);
    }
    return data.draft as SquadDraft;
  }

  /** Pull the self image (required) and opponent image (optional) through
   *  vision extraction in parallel. The self draft gets confirmed by the
   *  user; the opponent is parsed silently and threaded into the plan call.
   *  Opponent extraction failing is non-fatal — we fall back to the
   *  single-squad path. */
  async function extractAndConfirm(self: File, opponent: File | null) {
    // Drop the user-uploaded images into the stream as visible messages so
    // the user has a record of what they sent.
    appendEntry({
      id: nextId(),
      kind: "user-image",
      imageUrl: URL.createObjectURL(self),
      caption: opponent ? "My squad" : undefined,
    });
    if (opponent) {
      appendEntry({
        id: nextId(),
        kind: "user-image",
        imageUrl: URL.createObjectURL(opponent),
        caption: "Opponent",
      });
    }

    const loadingId = nextId();
    appendEntry({
      id: loadingId,
      kind: "ai-loading",
      label: opponent ? "Reading both squads…" : "Reading your squad…",
    });

    setPhase({ type: "extracting" });

    const [selfResult, opponentResult] = await Promise.allSettled([
      extractOneSquad(self),
      opponent ? extractOneSquad(opponent) : Promise.resolve(null),
    ]);

    if (selfResult.status === "rejected") {
      replaceEntry(loadingId, {
        id: loadingId,
        kind: "system-error",
        content:
          selfResult.reason instanceof Error
            ? selfResult.reason.message
            : "Failed to extract your squad. Please try again.",
        onRetry: () => extractAndConfirm(self, opponent),
        retryLabel: "Retry extraction",
      });
      setPhase({ type: "idle" });
      return;
    }

    const draft = selfResult.value;

    let opponentSquad: Squad | null = null;
    if (opponent) {
      if (opponentResult.status === "fulfilled" && opponentResult.value) {
        const oppDraft = opponentResult.value;
        opponentSquad = {
          formation: oppDraft.formation,
          players: oppDraft.players,
        };
      } else {
        // Silent degrade: the user gets a soft warning but the flow continues
        // as a single-squad plan.
        appendEntry({
          id: nextId(),
          kind: "system-error",
          content:
            "Couldn't read the opponent screenshot — continuing without counter-tactic.",
        });
      }
    }

    replaceEntry(loadingId, {
      id: loadingId,
      kind: "ai-squad-draft",
      draft,
      onConfirm: (squad) => buildMatchPlan(squad, undefined, opponentSquad),
    });
    setPhase({ type: "confirming", draft, opponentSquad });
  }

  async function buildMatchPlan(
    squad: Squad,
    styleOverride?: PlayStyle,
    opponentOverride?: Squad | null
  ) {
    // For re-plans (pivots), reuse the opponent that the active plan was
    // built against. For first plans, opponentOverride is the value the
    // confirmation flow handed us.
    const opponentSquad =
      opponentOverride !== undefined
        ? opponentOverride
        : phase.type === "ready" ||
            phase.type === "chatting" ||
            phase.type === "replanning"
          ? phase.opponentSquad
          : null;

    const loadingId = nextId();
    appendEntry({
      id: loadingId,
      kind: "ai-loading",
      label: styleOverride
        ? `Rebuilding plan for ${styleOverride}…`
        : opponentSquad
          ? "Building counter-tactic plan…"
          : "Building your match plan…",
    });

    // Mark the existing squad-draft entry (if any) as a static confirmation so
    // it stops accepting edits while the plan is being built.
    setEntries((prev) =>
      prev.map((e) =>
        e.kind === "ai-squad-draft" ? { ...e, isConfirming: true } : e
      )
    );

    // Capture the previous plan so we can restore it on failure during a pivot.
    const prevReadyPlan =
      phase.type === "ready" || phase.type === "chatting"
        ? phase.plan
        : null;

    setPhase((prev) =>
      prev.type === "ready" || prev.type === "chatting"
        ? {
            type: "replanning",
            squad: prev.squad,
            plan: prev.plan,
            opponentSquad: prev.opponentSquad,
          }
        : { type: "planning", squad, opponentSquad }
    );

    try {
      const res = await fetch("/api/ai/match-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          squad,
          opponentSquad: opponentSquad ?? undefined,
          userContext: pendingUserContext || undefined,
          styleOverride,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.plan) {
        throw new Error(data?.error ?? `Plan failed (HTTP ${res.status}).`);
      }
      const plan = data.plan as MatchPlan;

      replaceEntry(loadingId, {
        id: loadingId,
        kind: "ai-match-plan",
        plan,
      });
      setPhase({ type: "ready", squad, plan, opponentSquad });
    } catch (err) {
      replaceEntry(loadingId, {
        id: loadingId,
        kind: "system-error",
        content:
          err instanceof Error
            ? err.message
            : "Failed to build match plan. Please try again.",
        onRetry: () => buildMatchPlan(squad, styleOverride, opponentSquad),
        retryLabel: styleOverride ? "Retry re-plan" : "Retry plan",
      });
      // Failed re-plan: keep the user on the previous plan, not back at
      // squad confirmation. Failed initial plan: drop back to confirming.
      if (prevReadyPlan) {
        setPhase({ type: "ready", squad, plan: prevReadyPlan, opponentSquad });
      } else {
        setPhase({
          type: "confirming",
          draft: { ...squad, confidence: "high" },
          opponentSquad,
        });
      }
    }
  }

  async function sendChatMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (phase.type !== "ready" && phase.type !== "chatting") return;

    const userEntryId = nextId();
    appendEntry({ id: userEntryId, kind: "user-text", content: trimmed });

    const loadingId = nextId();
    appendEntry({ id: loadingId, kind: "ai-loading", label: "Thinking…" });

    const prevPhase = phase;
    setPhase({
      type: "chatting",
      squad: prevPhase.squad,
      plan: prevPhase.plan,
      opponentSquad: prevPhase.opponentSquad,
    });

    // Build chat history from prior user-text / ai-text entries.
    const history = entries
      .filter((e) => e.kind === "user-text" || e.kind === "ai-text")
      .map((e) =>
        e.kind === "user-text"
          ? { role: "user" as const, content: e.content }
          : { role: "assistant" as const, content: (e as { content: string }).content }
      );
    history.push({ role: "user", content: trimmed });

    try {
      const res = await fetch("/api/ai/squad-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history,
          squad: prevPhase.squad,
          plan: prevPhase.plan,
          userContext: pendingUserContext || undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.reply) {
        throw new Error(data?.error ?? `Chat failed (HTTP ${res.status}).`);
      }

      replaceEntry(loadingId, {
        id: loadingId,
        kind: "ai-text",
        content: String(data.reply),
      });
    } catch (err) {
      replaceEntry(loadingId, {
        id: loadingId,
        kind: "system-error",
        content:
          err instanceof Error
            ? err.message
            : "Chat request failed. Please try again.",
        onRetry: () => sendChatMessage(trimmed),
        retryLabel: "Retry",
      });
    } finally {
      setPhase({
        type: "ready",
        squad: prevPhase.squad,
        plan: prevPhase.plan,
        opponentSquad: prevPhase.opponentSquad,
      });
    }
  }

  function handleResetSession() {
    clearSession();
    setPhase({ type: "idle" });
    setPendingUserContext("");
    handleSelfImageChange(null);
    handleOpponentImageChange(null);
    setComposerText("");
    setEntries([]);
  }

  function handleDualSubmit() {
    if (!selfImage) return;
    const self = selfImage;
    const opponent = opponentImage;
    // Don't reset the URLs immediately — the stream entries below hold their
    // own object URLs (created in extractAndConfirm). Clearing now would
    // revoke the URLs the dual card still owns; we clear after extract is
    // queued.
    setSelfImage(null);
    setSelfImageUrl("");
    setOpponentImage(null);
    setOpponentImageUrl("");
    extractAndConfirm(self, opponent);
  }

  function handleComposerSubmit() {
    if (phase.type === "ready" || phase.type === "chatting") {
      const text = composerText;
      setComposerText("");
      sendChatMessage(text);
    }
  }

  // The composer is now ONLY for follow-up chat. Initial uploads happen via
  // the dual upload card in idle. We mount the composer only after a plan
  // exists.
  const showComposer =
    phase.type === "ready" ||
    phase.type === "chatting" ||
    phase.type === "replanning";

  const lastPlanIndex = useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].kind === "ai-match-plan") return i;
    }
    return -1;
  }, [entries]);

  const status = useMemo(() => {
    const pill = (() => {
      switch (phase.type) {
        case "idle":
          return <StatusPill dot>Ready</StatusPill>;
        case "extracting":
          return <StatusPill dot>Reading squad</StatusPill>;
        case "confirming":
          return <StatusPill dot>Confirm lineup</StatusPill>;
        case "planning":
        case "replanning":
          return <StatusPill dot>Building plan</StatusPill>;
        case "ready":
          return <StatusPill>Plan ready</StatusPill>;
        case "chatting":
          return <StatusPill dot>Thinking</StatusPill>;
      }
    })();

    // Once there's a plan, show a Reset button next to the status so the user
    // can wipe persisted state and start over without spelunking through
    // browser storage.
    const showReset =
      phase.type === "ready" ||
      phase.type === "chatting" ||
      phase.type === "replanning";

    return (
      <div className="flex items-center gap-2">
        {pill}
        {showReset ? (
          <button
            type="button"
            onClick={handleResetSession}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-valmuted transition hover:bg-white/[0.08] hover:text-valtext"
          >
            Reset
          </button>
        ) : null}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase.type]);

  const isIdle = phase.type === "idle";

  return (
    <main
      className={`mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-4 md:px-6 ${
        isIdle ? "pt-6 pb-6" : "pt-8 pb-[140px]"
      }`}
    >
      {isIdle ? (
        // Idle state: no header, no welcome text. The dual upload card IS the
        // conversation entry point.
        <div className="mt-6 flex flex-1 flex-col items-center justify-center">
          <DualUploadCard
            selfImageUrl={selfImageUrl}
            opponentImageUrl={opponentImageUrl}
            onSelfImageChange={handleSelfImageChange}
            onOpponentImageChange={handleOpponentImageChange}
            onSubmit={handleDualSubmit}
            isSubmitting={false}
          />
        </div>
      ) : (
        <LargeTitleHeader
          eyebrow="AI Squad Advisor"
          title="Match Plan"
          subtitle="Upload your squad. Get an opinionated plan. Ask follow-ups."
          status={status}
        />
      )}

      <div className="mt-6 flex flex-col gap-4">
        {entries.map((entry, idx) => {
          // Only the latest ai-match-plan gets pivot chips. Older plans are
          // history — clicking a chip on an old plan would re-run from stale
          // state and confuse the thread. We include "replanning" here so the
          // chips render in their disabled (isPivoting) state during a re-plan
          // instead of disappearing.
          const isLatestPlan =
            entry.kind === "ai-match-plan" &&
            idx === lastPlanIndex &&
            (phase.type === "ready" ||
              phase.type === "chatting" ||
              phase.type === "replanning");

          const currentPhaseType = phase.type;
          const augmented =
            isLatestPlan && entry.kind === "ai-match-plan"
              ? {
                  ...entry,
                  onPivot: (style: PlayStyle) => {
                    if (phase.type === "ready" || phase.type === "chatting") {
                      buildMatchPlan(phase.squad, style);
                    }
                  },
                  isPivoting: currentPhaseType === "replanning",
                }
              : entry;

          return <StreamMessage key={entry.id} entry={augmented} />;
        })}
        <div ref={scrollEndRef} />
      </div>

      {showComposer ? (
      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:px-6 md:pb-6">
        <div className="mx-auto max-w-2xl">
          <StreamComposer
            value={composerText}
            onChange={setComposerText}
            attachedImage={null}
            attachedImageUrl=""
            onAttachImage={() => {}}
            onSubmit={handleComposerSubmit}
            isSending={isBusy}
            mode="chat"
            hideAttach
          />
        </div>
      </div>
      ) : null}
    </main>
  );
}
