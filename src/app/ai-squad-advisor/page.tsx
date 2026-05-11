// src/app/ai-squad-advisor/page.tsx

"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import type { ValbriSquadAdvisorResult } from "@/lib/ai/valbriSquadAdvisorSchema";

export default function AiSquadAdvisorPage() {
  const [result, setResult] = useState<ValbriSquadAdvisorResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [selectedImageName, setSelectedImageName] = useState("");
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setSelectedImageName(file.name);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  async function handleAnalyzeClick() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const response = await fetch("/api/ai/squad-analysis", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("The analysis request failed.");
      }

      const data = await response.json();

      if (!data.success || !data.result) {
        throw new Error("The API did not return a valid result.");
      }

      setResult(data.result);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while analyzing the squad."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070A0F] text-white">
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-10">
          <p className="mb-3 text-sm font-medium text-[#00FF9A]">
            Valbri AI Tools
          </p>

          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            Valbri AI Squad Advisor
          </h1>

          <p className="mt-4 max-w-2xl text-base text-slate-400">
            Upload your FC squad and get tactical advice, squad score,
            weaknesses, player instructions, and upgrade paths.
          </p>

          <p className="mt-3 max-w-2xl text-sm text-slate-500">
            Get the best result from your current squad before spending coins.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <h2 className="text-xl font-semibold">Analyze Your Squad</h2>

            <p className="mt-2 text-sm text-slate-400">
              This is still the MVP test version. The button now calls our
              internal API route, but OpenAI is not connected yet.
            </p>

            <div className="mt-6 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Upload Squad Screenshot
                </label>

                <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-black/30 p-4 text-center text-sm text-slate-400 transition hover:border-[#00FF9A]/60 hover:bg-[#00FF9A]/5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                  {imagePreviewUrl ? (
                    <div className="space-y-3">
                      <img
                        src={imagePreviewUrl}
                        alt="Selected squad preview"
                        className="mx-auto max-h-40 rounded-lg border border-white/10 object-contain"
                      />

                      <p className="break-all text-xs text-slate-300">
                        {selectedImageName}
                      </p>

                      <p className="text-xs text-[#00FF9A]">
                        Click here to change image
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p>Tap here to choose squad image</p>
                      <p className="mt-1 text-xs text-slate-500">
                        PNG, JPG, or screenshot from your FC squad screen
                      </p>
                    </div>
                  )}
                </label>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Platform
                </label>

                <div className="grid grid-cols-3 gap-2">
                  {["PlayStation", "Xbox", "PC"].map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Division Rivals Level
                </label>

                <select className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-3 text-sm text-white">
                  <option>Division 10-8</option>
                  <option>Division 7-5</option>
                  <option>Division 4-2</option>
                  <option>Division 1</option>
                  <option>Elite</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Main Goal
                </label>

                <select className="w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-3 text-sm text-white">
                  <option>Best Overall Improvement</option>
                  <option>Better Attack</option>
                  <option>Better Defense</option>
                  <option>Better Tactics</option>
                  <option>Weekend League</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Current Tactics — Optional
                </label>

                <textarea
                  className="min-h-24 w-full rounded-xl border border-white/10 bg-[#0B1220] px-3 py-3 text-sm text-white placeholder:text-slate-500"
                  placeholder="Example: 4-3-3(4), Balanced, 58 depth, Direct Passing"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyzeClick}
                disabled={isLoading}
                className="w-full rounded-xl bg-[#00FF9A] px-4 py-3 font-semibold text-black transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? "Analyzing..." : "Analyze My Squad"}
              </button>

              {errorMessage ? (
                <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
                  {errorMessage}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            {!result ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
                <p className="text-sm font-medium text-[#00FF9A]">
                  Waiting for analysis
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Click “Analyze My Squad”
                </h2>

                <p className="mt-3 text-slate-400">
                  For now, the button will load a mock AI result from our test
                  API route. Later, this same flow will connect to OpenAI.
                </p>
              </div>
            ) : (
              <SquadAdvisorResultView result={result} />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function SquadAdvisorResultView({
  result,
}: {
  result: ValbriSquadAdvisorResult;
}) {
  return (
    <>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-sm font-medium text-[#00FF9A]">Squad Summary</p>

        <h2 className="mt-2 text-2xl font-bold">{result.summary.headline}</h2>

        <p className="mt-3 text-slate-400">{result.summary.text}</p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <InfoBox label="Playstyle" value={result.summary.playstyle} />
          <InfoBox label="Main Weakness" value={result.summary.mainWeakness} />
          <InfoBox
            label="Main Opportunity"
            value={result.summary.mainOpportunity}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ScoreCard label="Overall" value={result.scores.overall} />
        <ScoreCard label="Tactical Fit" value={result.scores.tacticalFit} />
        <ScoreCard label="Chemistry" value={result.scores.chemistry} />
        <ScoreCard label="Attack" value={result.scores.attack} />
        <ScoreCard label="Midfield" value={result.scores.midfield} />
        <ScoreCard label="Defense" value={result.scores.defense} />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ResultCard title="Strengths">
          <div className="space-y-4">
            {result.strengths.map((item) => (
              <div key={item.title}>
                <h3 className="font-semibold text-white">{item.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
              </div>
            ))}
          </div>
        </ResultCard>

        <ResultCard title="Weaknesses">
          <div className="space-y-4">
            {result.weaknesses.map((item) => (
              <div key={item.area}>
                <h3 className="font-semibold text-white">{item.area}</h3>
                <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
                <p className="mt-2 text-xs uppercase tracking-wide text-[#00FF9A]">
                  {item.fixType.replaceAll("_", " ")}
                </p>
              </div>
            ))}
          </div>
        </ResultCard>
      </div>

      <ResultCard title="Best Tactic For Current Squad">
        <h3 className="text-lg font-semibold">
          {result.recommendedTactic.style}
        </h3>

        <p className="mt-2 text-sm text-slate-400">
          {result.recommendedTactic.reason}
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {Object.entries(result.recommendedTactic.settings).map(
            ([key, value]) => (
              <div
                key={key}
                className="rounded-xl border border-white/10 bg-black/25 p-3"
              >
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  {formatLabel(key)}
                </p>
                <p className="mt-1 font-semibold text-white">{value}</p>
              </div>
            )
          )}
        </div>
      </ResultCard>

      <ResultCard title="Player Instructions">
        <div className="grid gap-3 md:grid-cols-2">
          {result.playerInstructions.map((item) => (
            <div
              key={item.position}
              className="rounded-xl border border-white/10 bg-black/25 p-4"
            >
              <p className="text-sm font-semibold text-[#00FF9A]">
                {item.position}
              </p>

              <p className="mt-1 font-semibold">{item.instruction}</p>

              <p className="mt-2 text-sm text-slate-400">{item.reason}</p>
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="Upgrade Priorities">
        <div className="space-y-4">
          {result.upgradePriorities.map((item) => (
            <div
              key={item.priority}
              className="rounded-xl border border-white/10 bg-black/25 p-4"
            >
              <p className="text-sm text-[#00FF9A]">
                Priority {item.priority}
              </p>

              <h3 className="mt-1 text-lg font-semibold">{item.area}</h3>

              <p className="mt-1 text-sm text-slate-300">
                {item.recommendedProfile}
              </p>

              <p className="mt-2 text-sm text-slate-500">{item.reason}</p>
            </div>
          ))}
        </div>
      </ResultCard>

      <div className="grid gap-6 md:grid-cols-3">
        <UpgradePathCard
          title="Basic"
          coinLevel={result.upgradePaths.basic.coinLevel}
          summary={result.upgradePaths.basic.summary}
          actions={result.upgradePaths.basic.actions}
        />

        <UpgradePathCard
          title="Economic"
          coinLevel={result.upgradePaths.economic.coinLevel}
          summary={result.upgradePaths.economic.summary}
          actions={result.upgradePaths.economic.actions}
        />

        <UpgradePathCard
          title="Best"
          coinLevel={result.upgradePaths.best.coinLevel}
          summary={result.upgradePaths.best.summary}
          actions={result.upgradePaths.best.actions}
        />
      </div>

      <div className="rounded-2xl border border-[#00FF9A]/30 bg-[#00FF9A]/10 p-5">
        <p className="text-sm font-medium text-[#00FF9A]">Final Coach Note</p>
        <p className="mt-2 text-slate-200">{result.finalCoachNote}</p>
      </div>
    </>
  );
}

function ScoreCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-slate-400">{label}</p>

      <p className="mt-2 text-3xl font-bold text-[#00FF9A]">
        {value.toFixed(1)}
        <span className="text-base text-slate-500"> / 10</span>
      </p>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {children}
    </div>
  );
}

function UpgradePathCard({
  title,
  coinLevel,
  summary,
  actions,
}: {
  title: string;
  coinLevel: string;
  summary: string;
  actions: Array<{ action: string; reason: string }>;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">{title}</h2>

        <span className="rounded-full bg-[#00FF9A]/10 px-3 py-1 text-xs font-semibold text-[#00FF9A]">
          {coinLevel}
        </span>
      </div>

      <p className="mt-3 text-sm text-slate-400">{summary}</p>

      <div className="mt-5 space-y-4">
        {actions.map((item) => (
          <div key={item.action}>
            <h3 className="font-semibold text-white">{item.action}</h3>
            <p className="mt-1 text-sm text-slate-400">{item.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
}