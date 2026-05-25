"use client";

import { BentoCard } from "./BentoCard";
import { Spinner } from "@/components/ui/Spinner";

type Props =
  | {
      mode: "pre";
      onRun: () => void;
      disabled: boolean;
      isLoading: boolean;
    }
  | {
      mode: "post";
      total: number;
      onClear?: () => void;
    };

export function BentoAction(props: Props) {
  if (props.mode === "pre") {
    const disabled = props.disabled || props.isLoading;
    return (
      <BentoCard className="overflow-hidden">
        <button
          type="button"
          onClick={props.onRun}
          disabled={disabled}
          className={`flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center transition ${
            disabled
              ? "cursor-not-allowed opacity-50 bg-white/[0.03]"
              : "bg-valaccent/10 hover:bg-valaccent/15 active:bg-valaccent/20"
          }`}
        >
          <div className="grid h-10 w-10 place-items-center rounded-full bg-valaccent text-valbg shadow-send-glow">
            {props.isLoading ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </div>
          <div className="text-xs font-semibold text-valtext">
            {props.isLoading ? "Working…" : "Run"}
          </div>
          <div className="text-[10px] text-valmuted leading-tight">
            {props.isLoading ? "Analyzing" : "Analysis"}
          </div>
        </button>
      </BentoCard>
    );
  }

  return (
    <BentoCard className="flex flex-col items-start justify-between p-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-valmuted">
        Flags
      </div>
      <div>
        <div className="text-3xl font-semibold tracking-tight tabular-nums text-valtext">
          {props.total}
        </div>
        <div className="mt-0.5 text-[11px] text-valmuted">All callouts</div>
      </div>
    </BentoCard>
  );
}
