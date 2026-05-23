// src/lib/ai/mockSquadAdvisorResult.ts

import type { ValbriSquadAdvisorResult } from "./valbriSquadAdvisorSchema";

export const mockSquadAdvisorResult: ValbriSquadAdvisorResult = {
  playerCallouts: [
    {
      position: "RB",
      bbox: { x: 0.66, y: 0.5, w: 0.12, h: 0.18 },
      side: "right",
      severity: "critical",
      label: "PERFORMANCE ALERT",
      note: "Defensive position stats below target threshold for the right flank.",
      recommendedReplacement: {
        profile:
          "Fast defensive RB with stamina, pace, and strong standing tackle",
        reason:
          "Stabilizes the right flank against transition attacks and overlaps.",
      },
    },
    {
      position: "RW",
      bbox: { x: 0.66, y: 0.12, w: 0.12, h: 0.18 },
      side: "right",
      severity: "warning",
      label: "POSITION CHEMISTRY",
      note: "High output, but chemistry link weakens the right flank synergy.",
      recommendedReplacement: {
        profile:
          "Fast winger with high dribbling, weak-foot 4+, and defensive work rate",
        reason: "Restores chemistry while supporting the RB defensively.",
      },
    },
    {
      position: "ST",
      bbox: { x: 0.43, y: 0.05, w: 0.12, h: 0.18 },
      side: "left",
      severity: "info",
      label: "SYNERGY TARGET",
      note: "Lowest-rated link with strikers — clinical profile would lift conversion.",
      recommendedReplacement: {
        profile:
          "Clinical ST with pace, finishing, movement, and 4-star weak foot",
        reason: "Improves chance conversion in higher divisions.",
      },
    },
    {
      position: "CAM",
      bbox: { x: 0.43, y: 0.27, w: 0.12, h: 0.18 },
      side: "left",
      severity: "info",
      label: "POTENTIAL UNLOCKED",
      note: "Free roam + stay forward can lift creator output significantly.",
    },
  ],
};
