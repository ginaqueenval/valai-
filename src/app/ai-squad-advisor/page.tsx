"use client";

import { useState, type ChangeEvent } from "react";
import type {
  ChatMessage,
  PlayerCallout,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";
import { DashboardBento } from "@/components/advisor/DashboardBento";
import { ChatLog } from "@/components/advisor/ChatLog";
import { ChatComposer } from "@/components/advisor/ChatComposer";
import { BottomBar } from "@/components/layout/BottomBar";
import { Spinner } from "@/components/ui/Spinner";
import { calloutId } from "@/components/advisor/SquadPreview";

const DEFAULT_PLATFORM = "PlayStation" as const;
const DEFAULT_DIVISION = "Division 7-5" as const;
const DEFAULT_GOAL = "Best Overall Improvement" as const;

export default function AiSquadAdvisorPage() {
  const [result, setResult] = useState<ValbriSquadAdvisorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const [selectedCalloutId, setSelectedCalloutId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState("");

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setSelectedImageFile(file);
    setSelectedImageName(file.name);
    setImagePreviewUrl(URL.createObjectURL(file));
    setErrorMessage("");
  }

  function handleCalloutSelect(id: string | null) {
    setSelectedCalloutId(id);
    if (!id || !result) return;
    const found = result.playerCallouts.find(
      (c: PlayerCallout, i: number) => calloutId(c, i) === id
    );
    if (!found) return;
    setChatInput(`Tell me more about ${found.label} (${found.position}).`);
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
      formData.append("platform", DEFAULT_PLATFORM);
      formData.append("divisionLevel", DEFAULT_DIVISION);
      formData.append("goal", DEFAULT_GOAL);
      formData.append("currentTactics", "");

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
      setSelectedCalloutId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error during squad analysis."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending || !result) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(nextMessages);
    setChatInput("");
    setIsSending(true);
    setChatError("");

    try {
      const response = await fetch("/api/ai/squad-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages,
          analysis: result,
          platform: DEFAULT_PLATFORM,
          divisionLevel: DEFAULT_DIVISION,
          goal: DEFAULT_GOAL,
          currentTactics: "",
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
      setChatError(err instanceof Error ? err.message : "Chat failed.");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <main className="mx-auto max-w-2xl px-4 pt-8 pb-[140px]">
        {errorMessage ? (
          <div className="mb-3 rounded-2xl border border-[#FF5C7A]/30 bg-[#FF5C7A]/10 px-4 py-3 text-sm text-[#FF5C7A]">
            {errorMessage}
          </div>
        ) : null}

        <DashboardBento
          result={result}
          imagePreviewUrl={imagePreviewUrl}
          selectedImageName={selectedImageName}
          onImageChange={handleImageChange}
          selectedCalloutId={selectedCalloutId}
          setSelectedCalloutId={handleCalloutSelect}
        />

        {result ? (
          <ChatLog messages={messages} isSending={isSending} error={chatError} />
        ) : null}
      </main>

      <BottomBar>
        {result ? (
          <ChatComposer
            value={chatInput}
            onChange={setChatInput}
            onSubmit={() => sendMessage(chatInput)}
            isSending={isSending}
          />
        ) : imagePreviewUrl ? (
          <button
            type="button"
            onClick={handleAnalyzeClick}
            disabled={isLoading}
            className={`w-full rounded-full px-6 py-3.5 text-base font-semibold transition-all ${
              isLoading
                ? "bg-white/10 text-valmuted cursor-not-allowed"
                : "bg-valaccent text-valbg shadow-cta-hover hover:bg-valhover"
            } flex items-center justify-center gap-2`}
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" /> Analyzing…
              </>
            ) : (
              "Run Analysis"
            )}
          </button>
        ) : null}
      </BottomBar>
    </>
  );
}
