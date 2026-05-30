// src/app/ai-squad-advisor/page.tsx
//
// Bento-grid dashboard + chat. Two sections:
//   - Dashboard (top): intake controls + analysis results in bento grid
//   - Chat log (middle): conversation history, grows as messages accumulate
//   - Bottom bar (sticky): composer + iOS tab bar

"use client";

import { useEffect, useRef, useState } from "react";
import { DashboardTitle } from "@/components/advisor/DashboardTitle";
import { DashboardBento } from "@/components/advisor/DashboardBento";
import { ChatLog } from "@/components/advisor/ChatLog";
import { StreamComposer } from "@/components/advisor/StreamComposer";
import { BottomBar } from "@/components/layout/BottomBar";
import { DualUploadCard } from "@/components/advisor/DualUploadCard";
import type {
  MatchPlan,
  OutputLanguage,
  Platform,
  Squad,
  SquadDraft,
} from "@/lib/ai/matchPlanSchema";
import { clearSession, loadSession, saveSession } from "@/lib/storage/session";
import { DIVISION_OPTIONS } from "@/components/advisor/BentoDivision";
import type { StreamEntry } from "@/components/advisor/StreamMessage";
import type { ChipItem } from "@/components/advisor/BentoChipStrip";

const LANGUAGE_STORAGE_KEY = "valai:language:v1";

let entryCounter = 0;
function nextId() {
  entryCounter += 1;
  return `e${entryCounter}`;
}

export default function AiSquadAdvisorPage() {
  // Dashboard state
  const [result, setResult] = useState<MatchPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Image uploads (dual slots)
  const [selfImage, setSelfImage] = useState<File | null>(null);
  const [selfImageUrl, setSelfImageUrl] = useState("");
  const [opponentImage, setOpponentImage] = useState<File | null>(null);
  const [opponentImageUrl, setOpponentImageUrl] = useState("");

  // Intake controls
  const [platform, setPlatform] = useState<Platform>("PlayStation");
  const [divisionLevel, setDivisionLevel] = useState(DIVISION_OPTIONS[6]);
  const [currentTactics, setCurrentTactics] = useState("");

  // Chat state
  const [entries, setEntries] = useState<StreamEntry[]>([]);
  const [composerText, setComposerText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // AI output language
  const [language, setLanguage] = useState<OutputLanguage>("en");

  // Confirmed squad (extracted from image)
  const [squad, setSquad] = useState<Squad | null>(null);
  const [opponentSquad, setOpponentSquad] = useState<Squad | null>(null);

  function handleLanguageChange(next: OutputLanguage) {
    setLanguage(next);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // ignore quota / private mode
    }
  }

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const storedLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (storedLang) setLanguage(storedLang as OutputLanguage);
    } catch {
      // ignore
    }

    const stored = loadSession();
    if (stored) {
      setSquad(stored.squad);
      setResult(stored.plan);
    }
    setHydrated(true);
  }, []);

  // Persist when result changes
  useEffect(() => {
    if (!hydrated || !squad || !result) return;
    saveSession({
      squad,
      plan: result,
      userContext: currentTactics,
    });
  }, [hydrated, squad, result, currentTactics]);

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

  async function handleDualSubmit() {
    if (!selfImage) return;

    setIsLoading(true);
    setErrorMessage(null);

    let draft: SquadDraft;
    try {
      draft = await extractOneSquad(selfImage);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to extract squad.");
      setIsLoading(false);
      return;
    }

    const extractedSquad: Squad = {
      formation: draft.formation,
      players: draft.players,
    };

    let extractedOpponent: Squad | null = null;
    if (opponentImage) {
      try {
        const oppDraft = await extractOneSquad(opponentImage);
        extractedOpponent = {
          formation: oppDraft.formation,
          players: oppDraft.players,
        };
      } catch {
        // Silent fail: continue without opponent
      }
    }

    // Auto-build the match plan
    try {
      const res = await fetch("/api/ai/match-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          squad: extractedSquad,
          opponentSquad: extractedOpponent ?? undefined,
          userContext: currentTactics || undefined,
          language,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.plan) {
        throw new Error(data?.error ?? "Failed to build plan.");
      }

      setSquad(extractedSquad);
      setOpponentSquad(extractedOpponent);
      setResult(data.plan as MatchPlan);
      setErrorMessage(null);

      // Clear image selections
      setSelfImage(null);
      setSelfImageUrl("");
      setOpponentImage(null);
      setOpponentImageUrl("");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to build plan.");
    } finally {
      setIsLoading(false);
    }
  }

  async function sendChatMessage(content: string) {
    if (!result || !squad) return;

    const trimmed = content.trim();
    if (!trimmed) return;

    setEntries((prev) => [
      ...prev,
      { id: nextId(), kind: "user-text", content: trimmed },
    ]);
    setComposerText("");
    setIsSending(true);

    const history = entries
      .filter((e) => e.kind === "user-text" || e.kind === "ai-text")
      .map((e) =>
        e.kind === "user-text"
          ? { role: "user" as const, content: e.content }
          : { role: "assistant" as const, content: (e as any).content }
      );
    history.push({ role: "user", content: trimmed });

    try {
      const res = await fetch("/api/ai/squad-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: history,
          squad,
          plan: result,
          language,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !data?.reply) {
        throw new Error(data?.error ?? "Chat failed.");
      }

      setEntries((prev) => [
        ...prev,
        { id: nextId(), kind: "ai-text", content: data.reply },
      ]);
    } catch (err) {
      setEntries((prev) => [
        ...prev,
        {
          id: nextId(),
          kind: "system-error",
          content: err instanceof Error ? err.message : "Chat failed.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  function handleReset() {
    clearSession();
    setResult(null);
    setSquad(null);
    setOpponentSquad(null);
    setEntries([]);
    setComposerText("");
    setSelfImage(null);
    setSelfImageUrl("");
    setOpponentImage(null);
    setOpponentImageUrl("");
  }

  // Chip strip items (goals or callouts)
  const chipItems: ChipItem[] = result
    ? [] // TODO: callout navigator chips
    : [
        { id: "best-overall", label: "Best Overall", active: true },
        { id: "better-attack", label: "Better Attack", active: false },
        { id: "better-defense", label: "Better Defense", active: false },
        { id: "better-tactics", label: "Better Tactics", active: false },
        { id: "weekend-league", label: "Weekend League", active: false },
      ];

  const stats = result
    ? {
        critical: result.watchOut?.filter((w) => w.area.includes("critical")).length ?? 0,
        callouts: result.watchOut?.length ?? 0,
        warning: result.watchOut?.filter((w) => w.area.includes("warning")).length ?? 0,
      }
    : { critical: "—", callouts: "—", warning: "—" };

  const bentoMode = result ? "post" : "pre";

  return (
    <main className="mx-auto max-w-2xl px-4 md:px-6 pt-6 pb-[180px]">
      <DashboardTitle isReady={!!result} />

      {!result ? (
        // Pre-analysis: show DualUploadCard
        <div className="mt-8 max-w-md mx-auto">
          <DualUploadCard
            selfImageUrl={selfImageUrl}
            opponentImageUrl={opponentImageUrl}
            onSelfImageChange={(file) => {
              if (selfImageUrl) URL.revokeObjectURL(selfImageUrl);
              if (file) {
                setSelfImage(file);
                setSelfImageUrl(URL.createObjectURL(file));
              } else {
                setSelfImage(null);
                setSelfImageUrl("");
              }
            }}
            onOpponentImageChange={(file) => {
              if (opponentImageUrl) URL.revokeObjectURL(opponentImageUrl);
              if (file) {
                setOpponentImage(file);
                setOpponentImageUrl(URL.createObjectURL(file));
              } else {
                setOpponentImage(null);
                setOpponentImageUrl("");
              }
            }}
            onSubmit={handleDualSubmit}
            isSubmitting={isLoading}
            language={language}
            onLanguageChange={handleLanguageChange}
          />
        </div>
      ) : (
        // Post-analysis: show Bento
        <>
          <DashboardBento
            mode={bentoMode}
            isLoading={isLoading}
            onAnalyzeClick={handleReset}
            selfImageUrl={selfImageUrl}
            onSelfImageChange={() => {}}
            platform={platform}
            onPlatformChange={setPlatform}
            divisionLevel={divisionLevel}
            onDivisionChange={setDivisionLevel}
            currentTactics={currentTactics}
            onTacticsChange={setCurrentTactics}
            stats={stats}
            chipItems={chipItems}
            onChipSelect={() => {}}
            disabled={false}
          />

          {entries.length > 0 && (
            <ChatLog entries={entries} isSending={isSending} error={errorMessage} />
          )}
        </>
      )}

      {errorMessage && !result && (
        <div className="mt-4 p-3 rounded-lg bg-red-500/10 text-sm text-red-400">
          {errorMessage}
        </div>
      )}

      <BottomBar>
        <StreamComposer
          value={composerText}
          onChange={setComposerText}
          attachedImage={null}
          attachedImageUrl=""
          onAttachImage={() => {}}
          onSubmit={() => result && sendChatMessage(composerText)}
          isSending={isSending}
          mode="chat"
          hideAttach
        />
      </BottomBar>
    </main>
  );
}
