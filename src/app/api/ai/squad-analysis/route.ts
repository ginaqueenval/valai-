// src/app/api/ai/squad-analysis/route.ts

import { NextResponse } from "next/server";
import { mockSquadAdvisorResult } from "@/lib/ai/mockSquadAdvisorResult";

export async function POST(request: Request) {
  const formData = await request.formData();

  const squadImage = formData.get("squadImage");
  const platform = formData.get("platform");
  const divisionLevel = formData.get("divisionLevel");
  const goal = formData.get("goal");
  const currentTactics = formData.get("currentTactics");

  console.log("Valai squad analysis request:", {
    hasImage: squadImage instanceof File,
    imageName: squadImage instanceof File ? squadImage.name : null,
    imageSize: squadImage instanceof File ? squadImage.size : null,
    platform,
    divisionLevel,
    goal,
    currentTactics,
  });

  return NextResponse.json({
    success: true,
    mode: "mock",
    receivedInput: {
      hasImage: squadImage instanceof File,
      imageName: squadImage instanceof File ? squadImage.name : null,
      imageSize: squadImage instanceof File ? squadImage.size : null,
      platform,
      divisionLevel,
      goal,
      currentTactics,
    },
    result: mockSquadAdvisorResult,
  });
}