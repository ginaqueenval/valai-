// src/lib/ai/valbriSquadAdvisorSchema.ts

export type Platform = "PlayStation" | "Xbox" | "PC";

export type DivisionLevel =
  | "Division 10-8"
  | "Division 7-5"
  | "Division 4-2"
  | "Division 1"
  | "Elite";

export type Goal =
  | "Best Overall Improvement"
  | "Better Attack"
  | "Better Defense"
  | "Better Tactics"
  | "Weekend League";

export type PlayerCalloutSeverity = "info" | "warning" | "critical";

export type CommunitySignal = {
  positiveCount: number;
  negativeCount: number;
  bucket: "positive" | "negative" | "mixed";
  topQuote?: string;
  matchedTerm: string;
};

export type RecommendedReplacement = {
  profile: string;
  reason: string;
  communitySignal?: CommunitySignal;
};

export type PlayerCallout = {
  position: string;
  bbox: { x: number; y: number; w: number; h: number };
  side: "left" | "right";
  severity: PlayerCalloutSeverity;
  label: string;
  note: string;
  recommendedReplacement?: RecommendedReplacement;
};

export type SquadAdvisorInput = {
  squadImage?: File | null;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  currentTactics?: string;
};

export type ValbriSquadAdvisorResult = {
  playerCallouts: PlayerCallout[];
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};
