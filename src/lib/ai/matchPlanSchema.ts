// src/lib/ai/matchPlanSchema.ts
//
// Source of truth for the Match Plan flow.
//
// Flow:
//   1) User uploads a squad screenshot.
//   2) Vision extracts a SquadDraft (formation + 11 players + bench, with
//      confidence). User edits / confirms to produce a confirmed Squad.
//   3) The AI generates a MatchPlan for that Squad. The plan is opinionated:
//      AI decides the best style of play for THIS squad and explains why.
//   4) User chats. Follow-up questions are answered with the squad + plan as
//      context. If the user requests a style override, AI returns a NEW
//      MatchPlan adjusted for that style, with suggested player swaps.

export type Platform = "PlayStation" | "Xbox" | "PC";

export type CommunitySignal = {
  positiveCount: number;
  negativeCount: number;
  bucket: "positive" | "negative" | "mixed";
  topQuote?: string;
  matchedTerm: string;
};

// ---------- Squad ----------

export type SquadPlayer = {
  /** Position label as shown on the card, e.g. "GK", "CB", "RB", "CM", "LW", "ST". */
  position: string;
  /** Player name. May be empty if vision couldn't read it. */
  name: string;
  /** Overall rating if visible on the card. */
  rating?: number;
  /** Whether this player is in the starting XI. */
  isStarter: boolean;
};

export type Squad = {
  /** Shape string, e.g. "4-2-3-1", "4-3-3", "5-2-1-2". */
  formation: string;
  /** All 11 starters first, then up to 7 bench players. */
  players: SquadPlayer[];
};

export type SquadDraft = Squad & {
  /** Overall confidence in the extraction. */
  confidence: "high" | "medium" | "low";
  /** Free-text notes the vision step wants to surface to the user. */
  notes?: string;
};

// ---------- Match Plan ----------

export type PlayStyle =
  | "possession"
  | "counter-attack"
  | "high-press"
  | "tiki-taka"
  | "wing-play"
  | "long-ball"
  | "balanced"
  | "park-the-bus"
  | "gegenpress";

/** Tactical sliders (FC custom tactics). All optional; AI fills what matters. */
export type CustomTactics = {
  defensiveStyle?: string;
  defensiveWidth?: number;
  defensiveDepth?: number;
  offensiveStyle?: string;
  offensiveWidth?: number;
  playersInBox?: number;
  corners?: number;
  freeKicks?: number;
};

export type PlayerInstruction = {
  /** Who this targets — name if known, else position ("LW", "Both CBs"). */
  target: string;
  /** Position for disambiguation when there are multiple at the same role. */
  position?: string;
  /** 1-4 instructions in FC's wording, e.g. "Stay Wide", "Get Into Box". */
  instructions: string[];
  /** One-sentence why. */
  rationale: string;
};

export type WatchOutItem = {
  /** Short label of the weak spot, e.g. "Center back pace". */
  area: string;
  /** One-sentence risk description. */
  risk: string;
};

export type StyleAlternative = {
  style: PlayStyle;
  /** Why this is a viable second option. */
  reasoning: string;
};

export type MatchPlan = {
  /** Punchy one-liner: "Possession-based with wide attack". */
  headline: string;
  /** 1-2 sentences explaining why this plan suits THIS squad. */
  reasoning: string;

  styleOfPlay: PlayStyle;
  /** Optional fallback style the user could switch to mid-match. */
  alternativeStyle?: StyleAlternative;

  formation: {
    shape: string;
    /** Why this shape — 1 sentence. */
    note: string;
  };

  customTactics: CustomTactics;

  /** 3-7 most important player instructions. */
  playerInstructions: PlayerInstruction[];

  /** 2-4 weak spots the user should be aware of. */
  watchOut: WatchOutItem[];

  planB: {
    /** What to do if losing by a goal. */
    ifLosing: string;
    /** What to do if winning and trying to close the game out. */
    ifWinning: string;
  };

  /** Optional: extra tips for specific matchup styles the user might face. */
  matchupHints?: string;
};

// ---------- Chat ----------

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  /** Optional structured payload for AI messages that include a new plan. */
  plan?: MatchPlan;
};

// ---------- API payloads ----------

export type SquadExtractResponse =
  | { success: true; modelUsed: string; draft: SquadDraft }
  | { success: false; error: string };

export type MatchPlanRequest = {
  squad: Squad;
  platform?: Platform;
  /** Free-text from the user about their context: "I want to beat my friend",
   *  "Weekend League grind", etc. Optional. */
  userContext?: string;
  /** If the user is requesting a specific style override. */
  styleOverride?: PlayStyle;
};

export type MatchPlanResponse =
  | { success: true; modelUsed: string; plan: MatchPlan }
  | { success: false; error: string };
