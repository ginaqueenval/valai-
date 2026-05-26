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
import type {
  MatchPlan,
  PlayStyle,
  Squad,
  SquadDraft,
} from "@/lib/ai/matchPlanSchema";

type Phase =
  | { type: "idle" }
  | { type: "extracting" }
  | { type: "confirming"; draft: SquadDraft }
  | { type: "planning"; squad: Squad }
  | { type: "ready"; squad: Squad; plan: MatchPlan }
  | { type: "replanning"; squad: Squad; plan: MatchPlan }
  | { type: "chatting"; squad: Squad; plan: MatchPlan };

let entryCounter = 0;
function nextId() {
  entryCounter += 1;
  return `e${entryCounter}`;
}

export default function AiSquadAdvisorPage() {
  const [phase, setPhase] = useState<Phase>({ type: "idle" });
  const [entries, setEntries] = useState<StreamEntry[]>(() => [
    {
      id: nextId(),
      kind: "ai-text",
      content:
        "Hi. Drop a squad screenshot and I'll build you a match plan — formation, tactics, key instructions, and a Plan B. Add a sentence about what you're trying to do if you want me to calibrate.",
    },
  ]);

  const [composerText, setComposerText] = useState("");
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [attachedImageUrl, setAttachedImageUrl] = useState("");
  const [pendingUserContext, setPendingUserContext] = useState("");

  const scrollEndRef = useRef<HTMLDivElement | null>(null);

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

  function handleAttachImage(file: File | null) {
    if (attachedImageUrl) URL.revokeObjectURL(attachedImageUrl);
    if (file) {
      setAttachedImage(file);
      setAttachedImageUrl(URL.createObjectURL(file));
    } else {
      setAttachedImage(null);
      setAttachedImageUrl("");
    }
  }

  async function extractSquad(file: File, caption: string) {
    const userImageEntryId = nextId();
    appendEntry({
      id: userImageEntryId,
      kind: "user-image",
      imageUrl: URL.createObjectURL(file),
      caption: caption.trim() || undefined,
    });

    const loadingId = nextId();
    appendEntry({
      id: loadingId,
      kind: "ai-loading",
      label: "Reading your squad…",
    });

    setPhase({ type: "extracting" });

    try {
      const fd = new FormData();
      fd.append("squadImage", file);
      const res = await fetch("/api/ai/squad-extract", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.draft) {
        throw new Error(data?.error ?? `Extract failed (HTTP ${res.status}).`);
      }

      const draft = data.draft as SquadDraft;

      replaceEntry(loadingId, {
        id: loadingId,
        kind: "ai-squad-draft",
        draft,
        onConfirm: (squad) => buildMatchPlan(squad),
      });
      setPhase({ type: "confirming", draft });
    } catch (err) {
      replaceEntry(loadingId, {
        id: loadingId,
        kind: "system-error",
        content:
          err instanceof Error
            ? err.message
            : "Failed to extract squad. Please try again.",
      });
      setPhase({ type: "idle" });
    }
  }

  async function buildMatchPlan(squad: Squad, styleOverride?: PlayStyle) {
    const loadingId = nextId();
    appendEntry({
      id: loadingId,
      kind: "ai-loading",
      label: styleOverride
        ? `Rebuilding plan for ${styleOverride}…`
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
        ? { type: "replanning", squad: prev.squad, plan: prev.plan }
        : { type: "planning", squad }
    );

    try {
      const res = await fetch("/api/ai/match-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          squad,
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
      setPhase({ type: "ready", squad, plan });
    } catch (err) {
      replaceEntry(loadingId, {
        id: loadingId,
        kind: "system-error",
        content:
          err instanceof Error
            ? err.message
            : "Failed to build match plan. Please try again.",
      });
      // Failed re-plan: keep the user on the previous plan, not back at
      // squad confirmation. Failed initial plan: drop back to confirming.
      if (prevReadyPlan) {
        setPhase({ type: "ready", squad, plan: prevReadyPlan });
      } else {
        setPhase({ type: "confirming", draft: { ...squad, confidence: "high" } });
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
    setPhase({ type: "chatting", squad: prevPhase.squad, plan: prevPhase.plan });

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
      });
    } finally {
      setPhase({ type: "ready", squad: prevPhase.squad, plan: prevPhase.plan });
    }
  }

  function handleComposerSubmit() {
    if (attachedImage) {
      const file = attachedImage;
      const caption = composerText;
      setPendingUserContext(caption.trim());
      handleAttachImage(null);
      setComposerText("");
      extractSquad(file, caption);
      return;
    }
    if (phase.type === "ready" || phase.type === "chatting") {
      const text = composerText;
      setComposerText("");
      sendChatMessage(text);
    }
  }

  const composerMode = useMemo<"needs-squad" | "chat">(() => {
    return phase.type === "ready" || phase.type === "chatting"
      ? "chat"
      : "needs-squad";
  }, [phase.type]);

  const lastPlanIndex = useMemo(() => {
    for (let i = entries.length - 1; i >= 0; i--) {
      if (entries[i].kind === "ai-match-plan") return i;
    }
    return -1;
  }, [entries]);

  const status = useMemo(() => {
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
  }, [phase.type]);

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col px-4 pt-8 pb-[140px] md:px-6">
      <LargeTitleHeader
        eyebrow="AI Squad Advisor"
        title="Match Plan"
        subtitle="Upload your squad. Get an opinionated plan. Ask follow-ups."
        status={status}
      />

      <div className="mt-6 flex flex-col gap-4">
        {entries.map((entry, idx) => {
          // Only the latest ai-match-plan gets pivot chips. Older plans are
          // history — clicking a chip on an old plan would re-run from stale
          // state and confuse the thread.
          const isLatestPlan =
            entry.kind === "ai-match-plan" &&
            idx === lastPlanIndex &&
            (phase.type === "ready" || phase.type === "chatting");

          const augmented =
            isLatestPlan && entry.kind === "ai-match-plan"
              ? {
                  ...entry,
                  onPivot: (style: PlayStyle) => {
                    if (phase.type === "ready" || phase.type === "chatting") {
                      buildMatchPlan(phase.squad, style);
                    }
                  },
                  isPivoting: phase.type === "replanning",
                }
              : entry;

          return <StreamMessage key={entry.id} entry={augmented} />;
        })}
        <div ref={scrollEndRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 px-4 pb-4 md:px-6 md:pb-6">
        <div className="mx-auto max-w-2xl">
          <StreamComposer
            value={composerText}
            onChange={setComposerText}
            attachedImage={attachedImage}
            attachedImageUrl={attachedImageUrl}
            onAttachImage={handleAttachImage}
            onSubmit={handleComposerSubmit}
            isSending={isBusy}
            mode={composerMode}
          />
        </div>
      </div>
    </main>
  );
}
