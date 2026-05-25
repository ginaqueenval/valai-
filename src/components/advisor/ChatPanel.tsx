"use client";

import { useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  DivisionLevel,
  Goal,
  Platform,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";
import { ChatBubble } from "./ChatBubble";
import { ChatComposer } from "./ChatComposer";

const SUGGESTIONS = [
  "What tactic best fits my squad?",
  "Which player should I upgrade first?",
  "Best instructions for the flagged players?",
];

type Props = {
  analysis: ValbriSquadAdvisorResult;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  currentTactics: string;
};

export function ChatPanel({
  analysis,
  platform,
  divisionLevel,
  goal,
  currentTactics,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
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

  return (
    <div>
      <div
        ref={scrollRef}
        className="app-scroll mb-5 max-h-[440px] min-h-[120px] space-y-4 overflow-y-auto pr-1"
      >
        {messages.length === 0 && !isSending ? (
          <div className="px-3 py-6 text-center text-sm text-valmuted">
            No messages yet. Try one of the prompts below or type your own.
          </div>
        ) : null}

        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}

        {isSending ? (
          <div className="flex items-center gap-2 px-3 py-2 text-xs text-valaccent">
            <span className="relative inline-flex h-2 w-2">
              <span className="absolute inset-0 rounded-full bg-valaccent animate-pulse-dot" />
              <span className="relative inline-block h-2 w-2 rounded-full bg-valaccent" />
            </span>
            Valai is thinking…
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="mb-3 rounded-2xl border border-[#FF5C7A]/30 bg-[#FF5C7A]/10 px-4 py-2 text-xs text-[#FF5C7A]">
          {error}
        </div>
      ) : null}

      <ChatComposer
        value={input}
        onChange={setInput}
        onSubmit={() => sendMessage(input)}
        isSending={isSending}
      />

      {messages.length === 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => sendMessage(s)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-xs font-medium text-valmuted transition hover:border-valaccent/30 hover:text-valtext"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
