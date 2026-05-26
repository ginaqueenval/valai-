// src/components/advisor/StreamMessage.tsx
//
// Renders one entry in the chat stream. Handles plain text bubbles, the user's
// uploaded image, AI loading skeletons, the SquadDraft editor, and the
// MatchPlan card stack — all as messages in the same vertical thread.

import type {
  MatchPlan,
  Squad,
  SquadDraft,
} from "@/lib/ai/matchPlanSchema";
import { MatchPlanCards } from "./MatchPlanCards";
import { SquadDraftEditor } from "./SquadDraftEditor";
import { Spinner } from "@/components/ui/Spinner";

export type StreamEntry =
  | { id: string; kind: "user-text"; content: string }
  | { id: string; kind: "user-image"; imageUrl: string; caption?: string }
  | { id: string; kind: "ai-text"; content: string }
  | { id: string; kind: "ai-loading"; label: string }
  | {
      id: string;
      kind: "ai-squad-draft";
      draft: SquadDraft;
      isConfirming?: boolean;
      onConfirm: (squad: Squad) => void;
    }
  | { id: string; kind: "ai-match-plan"; plan: MatchPlan }
  | { id: string; kind: "system-error"; content: string };

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-auto max-w-[80%] animate-slide-up">
      <div className="mb-1 mr-2 text-right text-[10px] font-medium text-valmuted">
        You
      </div>
      {children}
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="mr-auto w-full max-w-[92%] animate-slide-up">
      <div className="mb-1 ml-2 text-[10px] font-medium text-valmuted">Valai</div>
      {children}
    </div>
  );
}

export function StreamMessage({ entry }: { entry: StreamEntry }) {
  switch (entry.kind) {
    case "user-text":
      return (
        <UserBubble>
          <div className="rounded-3xl rounded-br-md bg-valaccent px-4 py-3 text-sm font-medium text-valbg whitespace-pre-wrap">
            {entry.content}
          </div>
        </UserBubble>
      );

    case "user-image":
      return (
        <UserBubble>
          <div className="overflow-hidden rounded-3xl rounded-br-md border border-white/[0.06] bg-valcard">
            <img
              src={entry.imageUrl}
              alt="Squad screenshot"
              className="max-h-72 w-full object-contain"
            />
            {entry.caption ? (
              <div className="px-4 py-3 text-sm text-valtext whitespace-pre-wrap">
                {entry.caption}
              </div>
            ) : null}
          </div>
        </UserBubble>
      );

    case "ai-text":
      return (
        <AssistantBubble>
          <div className="rounded-3xl rounded-bl-md bg-valelev border border-white/[0.06] px-4 py-3 text-sm text-valtext leading-relaxed whitespace-pre-wrap">
            {entry.content}
          </div>
        </AssistantBubble>
      );

    case "ai-loading":
      return (
        <AssistantBubble>
          <div className="inline-flex items-center gap-2.5 rounded-3xl rounded-bl-md bg-valelev border border-white/[0.06] px-4 py-3 text-sm text-valmuted">
            <Spinner className="h-4 w-4" />
            {entry.label}
          </div>
        </AssistantBubble>
      );

    case "ai-squad-draft":
      return (
        <AssistantBubble>
          <SquadDraftEditor
            draft={entry.draft}
            onConfirm={entry.onConfirm}
            isSubmitting={entry.isConfirming}
          />
        </AssistantBubble>
      );

    case "ai-match-plan":
      return (
        <AssistantBubble>
          <MatchPlanCards plan={entry.plan} />
        </AssistantBubble>
      );

    case "system-error":
      return (
        <div className="mx-auto max-w-[90%] rounded-2xl border border-rose-400/30 bg-rose-400/10 px-4 py-3 text-sm text-rose-200 animate-slide-up">
          {entry.content}
        </div>
      );
  }
}
