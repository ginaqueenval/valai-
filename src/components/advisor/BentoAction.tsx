// src/components/advisor/BentoAction.tsx
//
// Small C8 card. Pre-analysis: "Run Analysis" CTA. Post-analysis: small action button.

import { Spinner } from "@/components/ui/Spinner";

export function BentoAction({
  mode,
  isLoading,
  onAction,
  disabled,
}: {
  mode: "pre" | "post";
  isLoading: boolean;
  onAction: () => void;
  disabled?: boolean;
}) {
  if (mode === "pre") {
    return (
      <button
        onClick={onAction}
        disabled={disabled || isLoading}
        className={`w-full rounded-2xl px-4 py-6 text-center font-semibold text-sm transition-all ${
          disabled || isLoading
            ? "bg-white/[0.08] text-valmuted cursor-not-allowed"
            : "bg-valaccent text-valbg hover:bg-valhover shadow-[0_8px_24px_rgba(0,255,154,0.18)]"
        }`}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-2">
            <Spinner className="h-4 w-4" />
            Analyzing…
          </div>
        ) : (
          "Run Analysis"
        )}
      </button>
    );
  }

  // Post-analysis: small re-run button
  return (
    <button
      onClick={onAction}
      disabled={disabled || isLoading}
      className="w-full rounded-2xl border border-white/[0.08] bg-valelev px-3 py-4 text-center text-xs font-semibold uppercase tracking-[0.08em] text-valmuted hover:text-valtext hover:bg-white/[0.04] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      title="Re-run analysis with new squad"
    >
      {isLoading ? "…" : "Re-run"}
    </button>
  );
}
