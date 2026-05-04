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

export type CoinLevel = "Low" | "Medium" | "High";

export type FixType =
  | "tactical_adjustment"
  | "squad_upgrade"
  | "tactic_or_upgrade";

export type SquadAdvisorInput = {
  squadImage?: File | null;
  platform: Platform;
  divisionLevel: DivisionLevel;
  goal: Goal;
  currentTactics?: string;
};

export type ValbriSquadAdvisorResult = {
  summary: {
    headline: string;
    text: string;
    playstyle: string;
    mainWeakness: string;
    mainOpportunity: string;
  };

  scores: {
    overall: number;
    attack: number;
    midfield: number;
    defense: number;
    chemistry: number;
    tacticalFit: number;
  };

  scoreReasons: {
    overall: string;
    attack: string;
    midfield: string;
    defense: string;
    chemistry: string;
    tacticalFit: string;
  };

  strengths: Array<{
    title: string;
    reason: string;
  }>;

  weaknesses: Array<{
    area: string;
    reason: string;
    fixType: FixType;
  }>;

  recommendedTactic: {
    style: string;
    reason: string;
    settings: {
      defensiveStyle: string;
      width: number;
      depth: number;
      buildUpPlay: string;
      chanceCreation: string;
      attackingWidth: number;
      playersInBox: number;
      corners: number;
      freeKicks: number;
    };
  };

  playerInstructions: Array<{
    position: string;
    instruction: string;
    reason: string;
  }>;

  upgradePriorities: Array<{
    priority: number;
    area: string;
    recommendedProfile: string;
    reason: string;
  }>;

  upgradePaths: {
    basic: {
      summary: string;
      coinLevel: CoinLevel;
      actions: Array<{
        action: string;
        reason: string;
      }>;
    };

    economic: {
      summary: string;
      coinLevel: CoinLevel;
      actions: Array<{
        action: string;
        reason: string;
      }>;
    };

    best: {
      summary: string;
      coinLevel: CoinLevel;
      actions: Array<{
        action: string;
        reason: string;
      }>;
    };
  };

  finalCoachNote: string;
};