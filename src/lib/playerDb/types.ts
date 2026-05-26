// src/lib/playerDb/types.ts
//
// Types for the FC player database — the canonical roster used to enrich
// Match Plan recommendations with concrete player suggestions.

export type FcPlayerPosition =
  | "GK"
  | "RB" | "LB" | "CB"
  | "CDM" | "CM" | "CAM"
  | "RM" | "LM"
  | "RW" | "LW"
  | "CF" | "ST";

export type FcPlayer = {
  /** External ID from the source dataset (FUT.GG, EA, etc.). Stable across updates. */
  externalId: string;
  /** Full name as printed on the card. */
  name: string;
  /** Lowercased + diacritic-stripped name for trigram lookup. */
  normalizedName: string;
  /** Card type, e.g. "gold-rare", "icon", "totw", "totw-moments", "hero". */
  cardType: string;
  /** Primary position. */
  position: FcPlayerPosition;
  /** Alternative positions the player can play. */
  altPositions: FcPlayerPosition[];
  /** Overall rating. */
  overall: number;
  /** Six base attributes. */
  pace: number;
  shooting: number;
  passing: number;
  dribbling: number;
  defending: number;
  physical: number;
  /** Foot strength, 1-5. */
  weakFoot: number;
  /** Skill moves, 1-5. */
  skillMoves: number;
  /** "Right" or "Left". */
  preferredFoot: "Right" | "Left";
  /** Workrates as "ATT/DEF", e.g. "H/M". */
  workrates: string;
  /** PlayStyle names (FC26 trait equivalents), e.g. ["Quick Step", "Power Shot"]. */
  playstyles: string[];
  /** PlayStyles+ (the gold versions). */
  playstylesPlus: string[];
  nation: string;
  club: string;
  league: string;
  /** Card image URL if known. */
  imageUrl?: string;
  /** Approximate market price snapshot — optional, treat as stale. */
  priceSnapshot?: { coins: number; capturedAt: string };
};

/** A short profile string we can search the DB with, e.g. "fast defensive RB with pace and standing tackle". */
export type PlayerProfileQuery = {
  position?: FcPlayerPosition;
  /** Minimum overall. */
  minOverall?: number;
  /** Soft requirements expressed as raw stat minimums. */
  minPace?: number;
  minShooting?: number;
  minPassing?: number;
  minDribbling?: number;
  minDefending?: number;
  minPhysical?: number;
  /** PlayStyles that should be present (any of). */
  anyPlaystyles?: string[];
  /** Free-text description, used for trigram fallback. */
  text?: string;
  /** Max results to return. Defaults to 5. */
  limit?: number;
};
