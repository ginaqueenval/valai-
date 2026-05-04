// src/lib/ai/mockSquadAdvisorResult.ts

import type { ValbriSquadAdvisorResult } from "./valbriSquadAdvisorSchema";

export const mockSquadAdvisorResult: ValbriSquadAdvisorResult = {
  summary: {
    headline: "Strong squad, but the right side needs protection",
    text: "Your squad has good chemistry and a balanced attacking shape, but the right side is slightly weaker than the rest of the team.",
    playstyle: "Balanced wide attack",
    mainWeakness: "Right side defensive balance",
    mainOpportunity:
      "Improve RB/RW balance and use safer right-side instructions",
  },

  scores: {
    overall: 8.6,
    attack: 8.4,
    midfield: 8.3,
    defense: 8.5,
    chemistry: 10,
    tacticalFit: 7.8,
  },

  scoreReasons: {
    overall:
      "The squad is strong overall, with full chemistry and good balance, but one side limits the tactical ceiling.",
    attack:
      "The attack is good, but the RW/ST area can be improved for higher divisions.",
    midfield:
      "The midfield is balanced enough to support a 4-3-3 style.",
    defense:
      "The center backs and goalkeeper are solid, but the right side needs more protection.",
    chemistry: "The squad appears to have full chemistry.",
    tacticalFit:
      "The squad fits a balanced wide style, but aggressive overlapping would be risky until the right side improves.",
  },

  strengths: [
    {
      title: "Full chemistry",
      reason:
        "Full chemistry improves the squad’s overall consistency and makes the team easier to play with.",
    },
    {
      title: "Solid central structure",
      reason:
        "The goalkeeper, center backs, and midfield give the team a stable base.",
    },
    {
      title: "Good wide attacking potential",
      reason:
        "The squad can create chances through the wings, especially when the stronger side is used correctly.",
    },
  ],

  weaknesses: [
    {
      area: "Right Back / Right Wing side",
      reason:
        "The right side looks weaker than the left side, which can make the team vulnerable during transitions.",
      fixType: "tactic_or_upgrade",
    },
    {
      area: "Striker ceiling",
      reason:
        "The striker is usable, but a more clinical profile would help in higher divisions and Weekend League.",
      fixType: "squad_upgrade",
    },
    {
      area: "Aggressive fullback instructions",
      reason:
        "If both fullbacks are pushed forward, the squad may leave too much space behind the defense.",
      fixType: "tactical_adjustment",
    },
  ],

  recommendedTactic: {
    style: "Balanced wide attack",
    reason:
      "This style uses the wingers without exposing the weaker side too much. It helps the squad attack through wide areas while keeping enough defensive cover.",
    settings: {
      defensiveStyle: "Balanced",
      width: 45,
      depth: 58,
      buildUpPlay: "Balanced",
      chanceCreation: "Direct Passing",
      attackingWidth: 58,
      playersInBox: 5,
      corners: 2,
      freeKicks: 2,
    },
  },

  playerInstructions: [
    {
      position: "ST",
      instruction: "Stay Central + Get In Behind",
      reason:
        "Keeps the striker available for direct passes and quick attacks.",
    },
    {
      position: "LW",
      instruction: "Cut Inside + Get In Behind",
      reason:
        "Allows the stronger wide side to attack the box and create shooting or cutback chances.",
    },
    {
      position: "RW",
      instruction: "Stay Wide + Come Back On Defense",
      reason:
        "Helps protect the weaker right side while still giving attacking width.",
    },
    {
      position: "CAM",
      instruction: "Free Roam + Stay Forward",
      reason:
        "Lets the main creator find space between midfield and defense.",
    },
    {
      position: "RCM",
      instruction: "Stay Back While Attacking + Cover Center",
      reason:
        "Adds extra protection behind the weaker right side.",
    },
    {
      position: "RB",
      instruction: "Stay Back While Attacking",
      reason:
        "Reduces the risk of counter-attacks down the right side.",
    },
    {
      position: "LB",
      instruction: "Balanced Attack",
      reason:
        "The left side can support attacks more safely if it is stronger than the right side.",
    },
  ],

  upgradePriorities: [
    {
      priority: 1,
      area: "RB",
      recommendedProfile:
        "Fast defensive fullback with stamina, pace, and strong defending",
      reason:
        "RB is the highest-impact upgrade because it improves defensive stability and right-side balance.",
    },
    {
      priority: 2,
      area: "RW",
      recommendedProfile:
        "Fast winger with good dribbling, passing, and defensive work rate",
      reason:
        "A better RW would make the attack less predictable and support the RB defensively.",
    },
    {
      priority: 3,
      area: "ST",
      recommendedProfile:
        "Clinical striker with pace, finishing, movement, and strong weak foot",
      reason:
        "This would improve chance conversion in higher divisions and Weekend League.",
    },
  ],

  upgradePaths: {
    basic: {
      summary:
        "Get better results from the current squad with tactical changes only.",
      coinLevel: "Low",
      actions: [
        {
          action: "Set RB to Stay Back While Attacking",
          reason: "Protects the weaker side without changing players.",
        },
        {
          action: "Use RW on Come Back On Defense",
          reason: "Adds extra cover on the right side.",
        },
        {
          action: "Keep depth around 55–60",
          reason:
            "This gives enough pressure without leaving too much space behind the defense.",
        },
      ],
    },

    economic: {
      summary: "Make the best value upgrades without rebuilding the squad.",
      coinLevel: "Medium",
      actions: [
        {
          action: "Upgrade RB first",
          reason:
            "This gives the biggest improvement for the smallest squad change.",
        },
        {
          action: "Upgrade RW second if possible",
          reason:
            "This balances the attack and improves right-side support.",
        },
      ],
    },

    best: {
      summary: "Build the strongest competitive version of this squad.",
      coinLevel: "High",
      actions: [
        {
          action: "Upgrade RB, RW, and ST",
          reason:
            "This fixes the main tactical weaknesses and raises the team’s attacking ceiling.",
        },
        {
          action: "Add a stronger defensive CM if using higher depth",
          reason:
            "A stronger defensive midfielder makes aggressive tactics safer.",
        },
      ],
    },
  },

  finalCoachNote:
    "Your squad is already usable. First protect the right side with safer instructions, then upgrade RB when you want the biggest improvement.",
};