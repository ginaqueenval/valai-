// src/lib/ai/mockMatchPlan.ts
//
// Mock data for UI development. Use in components when the API is not wired
// up yet, or for storybook-style previews.

import type { MatchPlan, SquadDraft } from "./matchPlanSchema";

export const mockSquadDraft: SquadDraft = {
  formation: "4-2-3-1",
  confidence: "high",
  players: [
    { position: "GK", name: "Neuer", rating: 90, isStarter: true },
    { position: "RB", name: "Pavard", rating: 84, isStarter: true },
    { position: "CB", name: "Upamecano", rating: 84, isStarter: true },
    { position: "CB", name: "De Ligt", rating: 85, isStarter: true },
    { position: "LB", name: "Davies", rating: 85, isStarter: true },
    { position: "CDM", name: "Kimmich", rating: 89, isStarter: true },
    { position: "CDM", name: "Goretzka", rating: 86, isStarter: true },
    { position: "RM", name: "Sané", rating: 86, isStarter: true },
    { position: "CAM", name: "Müller", rating: 85, isStarter: true },
    { position: "LM", name: "Coman", rating: 85, isStarter: true },
    { position: "ST", name: "Kane", rating: 90, isStarter: true },
    { position: "SUB", name: "Gnabry", rating: 84, isStarter: false },
    { position: "SUB", name: "Musiala", rating: 84, isStarter: false },
    { position: "SUB", name: "Choupo-Moting", rating: 79, isStarter: false },
  ],
};

export const mockMatchPlan: MatchPlan = {
  headline: "Possession with wide overloads",
  reasoning:
    "Your midfield can keep the ball (Kimmich, Goretzka, Müller), your wingers are technical (Sané, Coman), but your CBs lack pace. Holding the ball reduces the counter-attacks you'd otherwise face.",
  styleOfPlay: "possession",
  alternativeStyle: {
    style: "counter-attack",
    reasoning:
      "If you face a high-pressing team, switch to counter-attack — Sané and Coman thrive in space behind a high defensive line.",
  },
  formation: {
    shape: "4-2-3-1",
    note: "Double pivot protects your CBs while Müller links midfield to Kane.",
  },
  customTactics: {
    defensiveStyle: "Balanced",
    defensiveWidth: 5,
    defensiveDepth: 4,
    offensiveStyle: "Possession",
    offensiveWidth: 7,
    playersInBox: 5,
    corners: 3,
    freeKicks: 3,
  },
  playerInstructions: [
    {
      target: "Sané",
      position: "RM",
      instructions: ["Stay Wide", "Get In Behind"],
      rationale:
        "Stretches the opposition fullback and opens space for Müller to drift into.",
    },
    {
      target: "Coman",
      position: "LM",
      instructions: ["Stay Wide", "Get Into Box for Cross"],
      rationale:
        "Crossing strength + Kane's heading make wide attacks high-value.",
    },
    {
      target: "Kimmich",
      position: "CDM",
      instructions: ["Stay Back While Attacking"],
      rationale: "Shields the CBs and recycles possession when attacks break.",
    },
    {
      target: "Müller",
      position: "CAM",
      instructions: ["Free Roam", "Get Into Box for Cross"],
      rationale:
        "Müller's value is in finding gaps — let him roam off Kane.",
    },
    {
      target: "Both CBs",
      instructions: ["Stay Back While Attacking"],
      rationale: "Davies and Pavard provide width; CBs must stay deep.",
    },
  ],
  watchOut: [
    {
      area: "Center back pace",
      risk:
        "Upamecano and De Ligt are not fast. Don't push the defensive line high — long balls behind will burn you.",
    },
    {
      area: "Striker mobility",
      risk:
        "Kane drops deep. If your wingers stay wide, the box can be empty on crosses — pre-call a midfield runner.",
    },
  ],
  planB: {
    ifLosing:
      "Bring on Musiala for Goretzka, push Müller to a CF role, switch to Attacking instructions. Width to 8.",
    ifWinning:
      "Switch to 4-1-4-1, Coman and Sané defensive work rates up, time waste, depth to 3.",
  },
  matchupHints:
    "vs. high press: short-pass exit via Kimmich. vs. low block: trust the wide overloads — don't force central passes.",
  swapSuggestions: [
    {
      targetPlayer: "Upamecano",
      position: "CB",
      profile: "Fast CB (pace 80+) with solid defending and aerial presence",
      filters: {
        minOverall: 84,
        minPace: 80,
        minDefending: 82,
        minPhysical: 80,
        anyPlaystyles: ["Anticipate", "Block", "Aerial"],
      },
      reason:
        "Replacing your slowest CB unlocks a higher defensive line and reduces vulnerability to balls over the top.",
    },
    {
      targetPlayer: "Pavard",
      position: "RB",
      profile: "Two-way RB with pace 85+ and crossing",
      filters: {
        minOverall: 83,
        minPace: 85,
        minDefending: 80,
        anyPlaystyles: ["Quick Step", "Whipped Pass"],
      },
      reason:
        "Adds a real wide-attack threat on the right to mirror Davies on the left.",
    },
  ],
};
