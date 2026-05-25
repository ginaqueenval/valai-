#!/usr/bin/env node

/**
 * Full pipeline test (Reddit + Gemini classification).
 * Requires GEMINI_API_KEY environment variable.
 * Usage: GEMINI_API_KEY=your_key node test-full-pipeline.js
 */

import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log("val-e Full Pipeline Test");
  console.log("=======================\n");

  // Check for .env.local
  const envPath = path.join(__dirname, ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("❌ .env.local not found. Creating template...");
    fs.writeFileSync(envPath, "GEMINI_API_KEY=\nDATABASE_URL=\n");
    console.log(`✅ Created ${envPath}`);
    console.log("   Please add your GEMINI_API_KEY and run again");
    process.exit(1);
  }

  // Read .env.local
  const envContent = fs.readFileSync(envPath, "utf-8");
  const geminiKey = envContent.match(/GEMINI_API_KEY=(.+)/)?.[1]?.trim();
  const dbUrl = envContent.match(/DATABASE_URL=(.+)/)?.[1]?.trim();

  console.log(`Environment variables loaded from .env.local:`);
  console.log(`  GEMINI_API_KEY: ${geminiKey ? "✅ Set" : "❌ Missing"}`);
  console.log(`  DATABASE_URL: ${dbUrl ? "✅ Set" : "❌ Missing (optional for local test)"}`);

  if (!geminiKey) {
    console.error("\n❌ GEMINI_API_KEY is required. Please add it to .env.local");
    console.log("\nSteps:");
    console.log("1. Go to https://console.cloud.google.com/");
    console.log("2. Create a new project");
    console.log("3. Enable Gemini API");
    console.log("4. Create an API key");
    console.log("5. Add it to .env.local as: GEMINI_API_KEY=your_key_here");
    process.exit(1);
  }

  console.log("\n✅ Ready to run pipeline test!");
  console.log("\nNote: Full pipeline requires Node.js 18+ with TypeScript compilation.");
  console.log("For now, run the simpler Reddit test first:");
  console.log("  node test-reddit-local.js");
}

main().catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
