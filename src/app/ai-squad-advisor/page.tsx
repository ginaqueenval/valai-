"use client";

import { useState, type ChangeEvent } from "react";
import type {
  DivisionLevel,
  Goal,
  Platform,
  ValbriSquadAdvisorResult,
} from "@/lib/ai/valbriSquadAdvisorSchema";
import { Card } from "@/components/ui/Card";
import { StatusPill } from "@/components/ui/StatusPill";
import { LargeTitleHeader } from "@/components/ui/LargeTitleHeader";
import { IntakeForm } from "@/components/advisor/IntakeForm";
import { SquadPreview } from "@/components/advisor/SquadPreview";
import { CalloutGroup } from "@/components/advisor/CalloutGroup";
import { SummaryBar } from "@/components/advisor/SummaryBar";
import { ChatPanel } from "@/components/advisor/ChatPanel";
import { StandbyHero } from "@/components/advisor/StandbyHero";

export default function AiSquadAdvisorPage() {
  const [result, setResult] = useState<ValbriSquadAdvisorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageName, setSelectedImageName] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  const [platform, setPlatform] = useState<Platform>("PlayStation");
  const [divisionLevel, setDivisionLevel] = useState<DivisionLevel>("Division 7-5");
  const [goal, setGoal] = useState<Goal>("Best Overall Improvement");
  const [currentTactics, setCurrentTactics] = useState("");

  const [selectedCalloutId, setSelectedCalloutId] = useState<string | null>(null);

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
      setSelectedCalloutId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unknown error during squad analysis."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 md:px-8 py-12 md:py-16">
      <LargeTitleHeader
        eyebrow="AI Squad Advisor"
        title="Squad Advisor"
        subtitle="Upload a squad. Set your goal. We'll do the rest."
        status={
          result ? (
            <StatusPill>Analysis ready</StatusPill>
          ) : (
            <StatusPill dot>Engine standing by</StatusPill>
          )
        }
      />

      <Card className="p-8 md:p-10 animate-fade-in">
        <IntakeForm
          imagePreviewUrl={imagePreviewUrl}
          selectedImageName={selectedImageName}
          onImageChange={handleImageChange}
          platform={platform}
          setPlatform={setPlatform}
          divisionLevel={divisionLevel}
          setDivisionLevel={setDivisionLevel}
          goal={goal}
          setGoal={setGoal}
          currentTactics={currentTactics}
          setCurrentTactics={setCurrentTactics}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onSubmit={handleAnalyzeClick}
        />
      </Card>

      {result && imagePreviewUrl ? (
        <div className="mt-10 animate-fade-in">
          <Card className="p-5 md:p-6">
            <SquadPreview
              imageUrl={imagePreviewUrl}
              callouts={result.playerCallouts}
              selectedId={selectedCalloutId}
              onSelect={setSelectedCalloutId}
            />
          </Card>
        </div>
      ) : !result ? (
        <div className="mt-10">
          <StandbyHero />
        </div>
      ) : null}

      {result ? (
        <>
          <div className="mt-6 animate-fade-in">
            <SummaryBar
              result={result}
              platform={platform}
              divisionLevel={divisionLevel}
              goal={goal}
            />
          </div>

          <section className="mt-10 animate-fade-in">
            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              Player callouts
            </h2>
            <p className="mt-2 text-base text-valmuted leading-relaxed">
              Tap a row to highlight it on the squad and reveal the suggestion.
            </p>
            <div className="mt-6">
              <CalloutGroup
                callouts={result.playerCallouts}
                selectedId={selectedCalloutId}
                onSelect={setSelectedCalloutId}
              />
            </div>
          </section>

          <section className="mt-12 animate-fade-in">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
                  Tactical chat
                </h2>
                <p className="mt-2 text-base text-valmuted leading-relaxed">
                  Ask follow-ups. Your callouts stay in context.
                </p>
              </div>
              <StatusPill dot>Live</StatusPill>
            </div>
            <Card className="mt-6 p-5 md:p-6">
              <ChatPanel
                analysis={result}
                platform={platform}
                divisionLevel={divisionLevel}
                goal={goal}
                currentTactics={currentTactics}
              />
            </Card>
          </section>
        </>
      ) : null}
    </main>
  );
}
