// src/components/advisor/ChatLog.tsx
//
// Scrollable message list between dashboard and composer.

import { useRef, useEffect } from "react";
import { StreamMessage } from "./StreamMessage";
import type { StreamEntry } from "./StreamMessage";

export function ChatLog({
  entries,
  isSending,
  error,
}: {
  entries: StreamEntry[];
  isSending: boolean;
  error?: string | null;
}) {
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries, isSending]);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 space-y-4 max-h-[50vh] overflow-y-auto app-scroll">
      {entries.map((entry) => (
        <StreamMessage key={entry.id} entry={entry} />
      ))}
      {isSending && (
        <div className="text-sm text-valmuted italic">Assistant is thinking…</div>
      )}
      {error && (
        <div className="text-sm text-red-400 bg-red-500/10 rounded-lg p-3">
          {error}
        </div>
      )}
      <div ref={scrollEndRef} />
    </div>
  );
}
