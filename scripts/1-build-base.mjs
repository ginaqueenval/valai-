// scripts/1-build-base.mjs
//
// Stage 1 of the FC player DB hybrid pipeline.
//
// INPUT: a JSON file from a community FC26 dataset. Today the main candidate
//   is https://github.com/ismailoksuz/EAFC26-DataHub (Kaggle-sourced,
//   18,000+ players, see output/json/*.json in that repo).
//
//   The script accepts ANY array-of-records JSON. Field names are normalized
//   defensively via FIELD_ALIASES so we work with slightly different shapes.
//
// OUTPUT: a JSON file matching the FcPlayer shape from
//   src/lib/playerDb/types.ts. This file is what stage 2 (FUT.GG enrich) and
//   stage 3 (upload to admin endpoint) consume.
//
// USAGE
//   node scripts/1-build-base.mjs <input.json> [output.json] [--top=84]
//
//   --top=N   Keep only players with overall >= N (default: keep all).
//             Recommended: --top=80 or --top=84 for the meta slice.

import fs from "node:fs";
import path from "node:path";

// ---- arg parsing ----------------------------------------------------------

const args = process.argv.slice(2);
const positional = args.filter((a) => !a.startsWith("--"));
const flags = Object.fromEntries(
  args
    .filter((a) => a.startsWith("--"))
    .map((a) => {
      const [k, v = "true"] = a.slice(2).split("=");
      return [k, v];
    })
);

const inputPath = positional[0];
const outputPath = positional[1] ?? "data/fc26-base.json";
const minOverall = flags.top ? Number(flags.top) : 0;

if (!inputPath) {
  console.error(
    "Usage: node scripts/1-build-base.mjs <input.json> [output.json] [--top=84]"
  );
  process.exit(1);
}

// ---- field aliases --------------------------------------------------------
// Map FROM a list of possible source keys TO our canonical key. The first
// source key that's present on a record wins.

const FIELD_ALIASES = {
  externalId: ["sofifa_id", "id", "playerId", "player_id"],
  name: ["short_name", "name", "common_name", "playerName"],
  longName: ["long_name", "fullName"],
  overall: ["overall", "overall_rating", "ovr"],
  potential: ["potential"],
  positions: ["player_positions", "positions", "position_group", "position"],
  preferredFoot: ["preferred_foot", "foot"],
  weakFoot: ["weak_foot", "weakFoot", "weak_foot_rating"],
  skillMoves: ["skill_moves", "skillMoves", "skill_rating"],
  workrate: ["work_rate", "workRate", "workrates"],
  pace: ["pace", "speed"],
  shooting: ["shooting", "shoot"],
  passing: ["passing", "pass"],
  dribbling: ["dribbling", "dri"],
  defending: ["defending", "def", "defense"],
  physical: ["physic", "physical", "phy"],
  nation: ["nationality_name", "nationality", "nation"],
  club: ["club_name", "club"],
  league: ["league_name", "league"],
  imageUrl: ["player_face_url", "image", "image_url", "imageUrl", "card_image"],
  height: ["height_cm", "height"],
  weight: ["weight_kg", "weight"],
  traits: ["player_traits", "traits"],
  playstyles: ["playstyles", "play_styles"],
  playstylesPlus: ["playstyles_plus", "playstyles_plus_list"],
};

function pick(record, alias) {
  for (const key of alias) {
    if (record[key] !== undefined && record[key] !== null && record[key] !== "") {
      return record[key];
    }
  }
  return undefined;
}

// ---- helpers --------------------------------------------------------------

const KNOWN_POSITIONS = new Set([
  "GK",
  "RB", "LB", "CB",
  "CDM", "CM", "CAM",
  "RM", "LM",
  "RWB", "LWB",
  "RW", "LW",
  "CF", "ST",
]);

function normalizePosition(raw) {
  if (!raw) return undefined;
  const upper = String(raw).toUpperCase().trim();
  // FIFA datasets sometimes use "RWB" / "LWB" — collapse to RB/LB for our schema.
  if (upper === "RWB") return "RB";
  if (upper === "LWB") return "LB";
  if (KNOWN_POSITIONS.has(upper)) return upper;
  return undefined;
}

function parsePositions(value) {
  if (!value) return { position: undefined, altPositions: [] };
  const parts = String(value)
    .split(/[,|/]/)
    .map((p) => normalizePosition(p))
    .filter(Boolean);
  if (parts.length === 0) return { position: undefined, altPositions: [] };
  return { position: parts[0], altPositions: parts.slice(1) };
}

function parsePlaystyles(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string");
  return String(value)
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function asInt(value, fallback = 0) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? n : fallback;
}

function adaptRecord(record) {
  const name = pick(record, FIELD_ALIASES.name);
  if (!name) return null;
  const positionRaw = pick(record, FIELD_ALIASES.positions);
  const { position, altPositions } = parsePositions(positionRaw);
  if (!position) return null;

  const externalIdRaw = pick(record, FIELD_ALIASES.externalId);
  const externalId = externalIdRaw
    ? String(externalIdRaw)
    : `${normalizeName(name)}-${position}`.replace(/\s+/g, "-");

  const playstyles = parsePlaystyles(pick(record, FIELD_ALIASES.playstyles));
  const playstylesPlus = parsePlaystyles(
    pick(record, FIELD_ALIASES.playstylesPlus)
  );
  // If the dataset has traits but no explicit playstyles, treat traits as a
  // soft fallback. Stage 2 (FUT.GG) overrides this with the real list anyway.
  const traitsAsPlaystyles =
    playstyles.length === 0 ? parsePlaystyles(pick(record, FIELD_ALIASES.traits)) : [];

  return {
    externalId,
    name: String(name),
    normalizedName: normalizeName(name),
    cardType: "gold-rare", // Stage 2 refines this from FUT.GG.
    position,
    altPositions,
    overall: asInt(pick(record, FIELD_ALIASES.overall)),
    pace: asInt(pick(record, FIELD_ALIASES.pace)),
    shooting: asInt(pick(record, FIELD_ALIASES.shooting)),
    passing: asInt(pick(record, FIELD_ALIASES.passing)),
    dribbling: asInt(pick(record, FIELD_ALIASES.dribbling)),
    defending: asInt(pick(record, FIELD_ALIASES.defending)),
    physical: asInt(pick(record, FIELD_ALIASES.physical)),
    weakFoot: asInt(pick(record, FIELD_ALIASES.weakFoot), 3),
    skillMoves: asInt(pick(record, FIELD_ALIASES.skillMoves), 3),
    preferredFoot:
      String(pick(record, FIELD_ALIASES.preferredFoot) ?? "Right").startsWith("L")
        ? "Left"
        : "Right",
    workrates: String(pick(record, FIELD_ALIASES.workrate) ?? "M/M"),
    playstyles: playstyles.length > 0 ? playstyles : traitsAsPlaystyles,
    playstylesPlus,
    nation: String(pick(record, FIELD_ALIASES.nation) ?? ""),
    club: String(pick(record, FIELD_ALIASES.club) ?? ""),
    league: String(pick(record, FIELD_ALIASES.league) ?? ""),
    imageUrl: pick(record, FIELD_ALIASES.imageUrl)
      ? String(pick(record, FIELD_ALIASES.imageUrl))
      : undefined,
  };
}

// ---- main -----------------------------------------------------------------

const raw = fs.readFileSync(inputPath, "utf8");
let source;
try {
  source = JSON.parse(raw);
} catch (err) {
  console.error(`Failed to parse JSON from ${inputPath}: ${err.message}`);
  process.exit(1);
}

if (!Array.isArray(source)) {
  console.error(
    "Input JSON must be a top-level array of records. " +
      "If your file wraps records under a key, extract it first (e.g. with jq)."
  );
  process.exit(1);
}

let kept = 0;
let dropped = 0;
const adapted = [];
for (const record of source) {
  const player = adaptRecord(record);
  if (!player) {
    dropped += 1;
    continue;
  }
  if (player.overall < minOverall) {
    dropped += 1;
    continue;
  }
  adapted.push(player);
  kept += 1;
}

// Sort high-to-low so downstream stages (and humans) see meta cards first.
adapted.sort((a, b) => b.overall - a.overall);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(adapted, null, 2), "utf8");

console.log(
  `Wrote ${kept} players to ${outputPath} (dropped ${dropped} unmappable / below --top).`
);
if (kept > 0) {
  console.log(
    `Overall range: ${adapted[adapted.length - 1].overall} → ${adapted[0].overall}`
  );
}
