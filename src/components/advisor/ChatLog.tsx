"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/ai/valbriSquadAdvisorSchema";
import { ChatBubble } from "./ChatBubble";

type Props = {
  messages: ChatMessage[];
  isSending: boolean;
  error: string;
};

export function ChatLog({ messages, isSending, error }: Props) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isSending]);

  if (messages.length === 0 && !isSending && !error) return null;

  return (
    <div
      ref={scrollRef}
      className="app-scroll mt-4 max-h-[50vh] space-y-3 overflow-y-auto rounded-3xl bg-valcard border border-white/[0.06] p-4"
    >
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

      {error ? (
        <div className="rounded-2xl border border-[#FF5C7A]/30 bg-[#FF5C7A]/10 px-4 py-2 text-xs text-[#FF5C7A]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
