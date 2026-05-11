// src/app/api/ai/squad-analysis/route.ts

import { NextResponse } from "next/server";
import { mockSquadAdvisorResult } from "@/lib/ai/mockSquadAdvisorResult";

export async function POST() {
  return NextResponse.json({
    success: true,
    mode: "mock",
    result: mockSquadAdvisorResult,
  });
}