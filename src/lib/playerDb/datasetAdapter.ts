// src/lib/playerDb/datasetAdapter.ts
//
// Parses a community FC26 player dataset (CSV or JSON) into FcPlayer records.
//
// The canonical source today is ismailoksuz/EAFC26-DataHub (data/players.csv,
// 18k+ players). But we keep this defensive: field names are resolved through
// FIELD_ALIASES so Kaggle-style, sofifa-style, and FUT-DB-style headers all
// work without code changes. Anything unmappable is dropped and counted, and
// the caller can surface the source's actual column names for diagnosis.

import type { FcPlayer, FcPlayerPosition } from "./types";

// Map FROM a list of possible source keys TO our canonical key. First match on
// a record wins. Case-insensitive lookup is handled in pick().
const FIELD_ALIASES: Record<string, string[]> = {
  externalId: ["sofifa_id", "id", "playerId", "player_id", "Player ID", "EAID", "ea_id"],
  name: ["short_name", "name", "common_name", "playerName", "Name", "Player", "full_name", "Full Name", "long_name"],
  overall: ["overall", "overall_rating", "ovr", "OVR", "Overall", "Rating", "RAT"],
  positions: ["player_positions", "positions", "position_group", "position", "Position", "Positions", "BP", "Best Position", "Pos", "preferred_positions"],
  preferredFoot: ["preferred_foot", "foot", "Foot", "Preferred Foot"],
  weakFoot: ["weak_foot", "weakFoot", "weak_foot_rating", "WF", "Weak Foot", "Weak foot"],
  skillMoves: ["skill_moves", "skillMoves", "skill_rating", "SM", "Skill Moves", "Skills"],
  workrate: ["work_rate", "workRate", "workrates", "Work Rate", "WorkRate", "W/R"],
  pace: ["pace", "speed", "PAC", "Pace", "PACE"],
  shooting: ["shooting", "shoot", "SHO", "Shooting", "SHOOTING"],
  passing: ["passing", "pass", "PAS", "Passing", "PASSING"],
  dribbling: ["dribbling", "dri", "DRI", "Dribbling", "DRIBBLING"],
  defending: ["defending", "def", "defense", "DEF", "Defending", "Defense", "DEFENDING"],
  physical: ["physic", "physical", "phy", "PHY", "Physical", "Physicality", "PHYSICAL"],
  nation: ["nationality_name", "nationality", "nation", "Nation", "Nationality", "Country"],
  club: ["club_name", "club", "Club", "Team", "team"],
  league: ["league_name", "league", "League"],
  imageUrl: ["player_face_url", "image", "image_url", "imageUrl", "card_image", "Image", "Image URL", "photo", "Photo", "avatar"],
  traits: ["player_traits", "traits", "Traits"],
  playstyles: ["playstyles", "play_styles", "PlayStyles", "Playstyles", "Play Styles", "playstyle"],
  playstylesPlus: ["playstyles_plus", "playstyles_plus_list", "PlayStyles+", "PlayStylesPlus"],
  // Card version / rarity — present in "cards" datasets that include special
  // items (TOTW, promos, icons, heroes). Absent in plain "players" datasets.
  cardType: ["card_type", "cardType", "version", "Version", "rarity", "Rarity", "revision", "Revision", "rating_type", "card_name", "Card"],
};

const KNOWN_POSITIONS = new Set<FcPlayerPosition>([
  "GK", "RB", "LB", "CB", "CDM", "CM", "CAM", "RM", "LM", "RW", "LW", "CF", "ST",
]);

type SourceRecord = Record<string, unknown>;

// Build a lowercase->original key index per record so aliases match regardless
// of header capitalization ("OVR" vs "ovr" vs "Ovr").
function pick(record: SourceRecord, lowerIndex: Map<string, string>, aliases: string[]): unknown {
  for (const alias of aliases) {
    const realKey = lowerIndex.get(alias.toLowerCase());
    if (realKey === undefined) continue;
    const v = record[realKey];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

function normalizePosition(raw: unknown): FcPlayerPosition | undefined {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase().trim();
  if (upper === "RWB") return "RB";
  if (upper === "LWB") return "LB";
  return KNOWN_POSITIONS.has(upper as FcPlayerPosition)
    ? (upper as FcPlayerPosition)
    : undefined;
}

function parsePositions(value: unknown): {
  position?: FcPlayerPosition;
  altPositions: FcPlayerPosition[];
} {
  if (!value) return { altPositions: [] };
  const parts = String(value)
    .split(/[,|/]/)
    .map((p) => normalizePosition(p))
    .filter((p): p is FcPlayerPosition => Boolean(p));
  if (parts.length === 0) return { altPositions: [] };
  return { position: parts[0], altPositions: parts.slice(1) };
}

function parsePlaystyles(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v): v is string => typeof v === "string");
  return String(value)
    .split(/[,|;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeName(name: string): string {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asInt(value: unknown, fallback = 0): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function adaptRecord(record: SourceRecord): FcPlayer | null {
  const lowerIndex = new Map<string, string>();
  for (const key of Object.keys(record)) lowerIndex.set(key.toLowerCase(), key);

  const nameRaw = pick(record, lowerIndex, FIELD_ALIASES.name);
  if (!nameRaw) return null;
  const name = String(nameRaw);

  const { position, altPositions } = parsePositions(
    pick(record, lowerIndex, FIELD_ALIASES.positions)
  );
  if (!position) return null;

  // Card type/version. Default to gold-rare for plain player datasets that
  // don't carry a version. Normalize to a slug ("totw", "fut-birthday").
  const cardTypeRaw = pick(record, lowerIndex, FIELD_ALIASES.cardType);
  const cardType = cardTypeRaw
    ? String(cardTypeRaw).toLowerCase().trim().replace(/\s+/g, "-")
    : "gold-rare";

  const overall = asInt(pick(record, lowerIndex, FIELD_ALIASES.overall));

  // External id must be unique PER CARD, not per player — a player can have
  // many cards. When the source gives an id we trust it; otherwise compose
  // name + card type + overall so e.g. base Salah and TOTW Salah don't collide.
  const externalIdRaw = pick(record, lowerIndex, FIELD_ALIASES.externalId);
  const externalId = externalIdRaw
    ? String(externalIdRaw)
    : `${normalizeName(name)}-${cardType}-${overall}-${position}`.replace(/\s+/g, "-");

  const playstyles = parsePlaystyles(pick(record, lowerIndex, FIELD_ALIASES.playstyles));
  const playstylesPlus = parsePlaystyles(
    pick(record, lowerIndex, FIELD_ALIASES.playstylesPlus)
  );
  const traitsAsPlaystyles =
    playstyles.length === 0
      ? parsePlaystyles(pick(record, lowerIndex, FIELD_ALIASES.traits))
      : [];

  const footRaw = String(pick(record, lowerIndex, FIELD_ALIASES.preferredFoot) ?? "Right");

  return {
    externalId,
    name,
    normalizedName: normalizeName(name),
    cardType,
    position,
    altPositions,
    overall,
    pace: asInt(pick(record, lowerIndex, FIELD_ALIASES.pace)),
    shooting: asInt(pick(record, lowerIndex, FIELD_ALIASES.shooting)),
    passing: asInt(pick(record, lowerIndex, FIELD_ALIASES.passing)),
    dribbling: asInt(pick(record, lowerIndex, FIELD_ALIASES.dribbling)),
    defending: asInt(pick(record, lowerIndex, FIELD_ALIASES.defending)),
    physical: asInt(pick(record, lowerIndex, FIELD_ALIASES.physical)),
    weakFoot: asInt(pick(record, lowerIndex, FIELD_ALIASES.weakFoot), 3),
    skillMoves: asInt(pick(record, lowerIndex, FIELD_ALIASES.skillMoves), 3),
    preferredFoot: footRaw.trim().toLowerCase().startsWith("l") ? "Left" : "Right",
    workrates: String(pick(record, lowerIndex, FIELD_ALIASES.workrate) ?? "M/M"),
    playstyles: playstyles.length > 0 ? playstyles : traitsAsPlaystyles,
    playstylesPlus,
    nation: String(pick(record, lowerIndex, FIELD_ALIASES.nation) ?? ""),
    club: String(pick(record, lowerIndex, FIELD_ALIASES.club) ?? ""),
    league: String(pick(record, lowerIndex, FIELD_ALIASES.league) ?? ""),
    imageUrl: pick(record, lowerIndex, FIELD_ALIASES.imageUrl)
      ? String(pick(record, lowerIndex, FIELD_ALIASES.imageUrl))
      : undefined,
  };
}

// ---- CSV parsing (no deps) ------------------------------------------------
// Handles quoted fields, escaped quotes (""), and commas/newlines inside
// quotes. Assumes the first row is the header.
function parseCsv(text: string): SourceRecord[] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      // Commit field/row on newline; swallow \r\n pairs.
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  // Trailing field/row (no final newline).
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }

  if (rows.length === 0) return [];
  const header = rows[0].map((h) => h.trim());
  const records: SourceRecord[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const rec: SourceRecord = {};
    for (let c = 0; c < header.length; c++) rec[header[c]] = cells[c];
    records.push(rec);
  }
  return records;
}

export type AdaptResult = {
  players: FcPlayer[];
  total: number;
  kept: number;
  dropped: number;
  /** Column names detected in the source, so the operator can verify mapping. */
  sourceColumns: string[];
  format: "csv" | "json";
};

/**
 * Adapt raw dataset text (CSV or JSON array) into FcPlayer records, keeping
 * only players with overall >= minOverall.
 */
export function adaptDataset(rawText: string, minOverall = 0): AdaptResult {
  const trimmed = rawText.trimStart();
  let records: SourceRecord[];
  let format: "csv" | "json";

  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    format = "json";
    const parsed = JSON.parse(trimmed);
    const arr = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.players)
        ? parsed.players
        : Array.isArray(parsed?.data)
          ? parsed.data
          : null;
    if (!arr) throw new Error("JSON dataset is not an array (or {players|data: [...]}).");
    records = arr as SourceRecord[];
  } else {
    format = "csv";
    records = parseCsv(rawText);
  }

  const sourceColumns = records.length > 0 ? Object.keys(records[0]) : [];
  const players: FcPlayer[] = [];
  let dropped = 0;

  for (const rec of records) {
    const player = adaptRecord(rec);
    if (!player || player.overall < minOverall) {
      dropped += 1;
      continue;
    }
    players.push(player);
  }

  players.sort((a, b) => b.overall - a.overall);

  return {
    players,
    total: records.length,
    kept: players.length,
    dropped,
    sourceColumns,
    format,
  };
}
