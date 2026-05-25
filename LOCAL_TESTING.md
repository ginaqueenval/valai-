# Local Testing Guide for val-e Reddit Extraction

This guide helps you test the Reddit data extraction pipeline on your local computer.

## Prerequisites

You need:
- **Node.js** (v18 or newer) - [Download here](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Internet connection**
- **GEMINI_API_KEY** (optional, for full classification test)

## Quick Start (5 minutes)

### 1. Install Node.js
Download and install from https://nodejs.org/ (LTS version recommended).

Verify installation:
```bash
node --version
npm --version
```

### 2. Clone/Setup Repository
If you haven't already:
```bash
git clone https://github.com/ginaqueenval/valai-.git
cd valai-
git checkout claude/card-profiles-and-more-subreddits
```

### 3. Install Dependencies
```bash
npm install
```

This downloads all required packages (Next.js, React, Gemini SDK, etc.)

### 4. Test Reddit Extraction
```bash
node test-reddit-local.js
```

This script:
- ✅ Tests connection to Reddit from your computer
- ✅ Fetches real posts from 5 FC26-related subreddits
- ✅ Shows sample posts
- ✅ Reports total data collected

**Expected output if successful:**
```
val-e Reddit Extraction Test
============================

========================================
Testing r/EASportsFC
========================================
[fetch] https://www.reddit.com/r/EASportsFC/top.json?limit=10 (attempt 1)
[response] Status: 200 for https://...
[success] Parsed JSON

[results] Got 10 posts from r/EASportsFC

First 3 posts:
  1. "Squad Building Guide" by user1 (score: 2541)
  2. "Market Crash" by user2 (score: 1823)
  3. "Best Strikers" by user3 (score: 1456)
...

========== SUMMARY ==========
Total posts fetched: 50
Subreddits tested: 5

✅ SUCCESS: Reddit data extraction is working!
Your computer can reach Reddit. The issue is Vercel's IP being blocked.
```

## Testing with Gemini (Optional)

If you want to test classification with Gemini:

### 1. Get a Gemini API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use existing one)
3. Enable **Generative Language API**:
   - Search for "Generative Language API"
   - Click Enable
4. Create an API key:
   - Go to **APIs & Services** → **Credentials**
   - Click **Create Credentials** → **API Key**
   - Copy the key

### 2. Add to .env.local

Edit `.env.local` in your project root:
```
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=
```

### 3. Set Up Database (Optional)

If you want to test the full pipeline with database storage:

1. Create a free database at [Neon](https://neon.tech/)
2. Copy your connection string
3. Add to `.env.local`:
   ```
   DATABASE_URL=postgresql://user:password@db.neon.tech/db_name
   ```

4. The pipeline will auto-create tables on first run

### 4. Run Full Pipeline

```bash
# This will require TypeScript compilation
npm run build
npm start
```

Then visit: http://localhost:3000/api/cron/ingest?trigger=manual

Or trigger via curl:
```bash
curl http://localhost:3000/api/cron/ingest
```

## Troubleshooting

### ❌ "node: command not found"
- Node.js is not installed
- Download from https://nodejs.org/
- Restart your terminal after installing

### ❌ "npm ERR! code ECONNREFUSED"
- Your internet connection is down
- Check you can reach Google/Reddit in your browser first

### ❌ "Reddit responded 403"
- Your IP is blocked by Reddit (rare)
- Try with a VPN
- Or wait a bit and retry

### ❌ "Module not found"
- Run `npm install` again
- Delete `node_modules` folder and `.next` folder
- Run `npm install` again

### ❌ "GEMINI_API_KEY is missing"
- Edit `.env.local`
- Add your actual API key (don't leave it blank)

## What the Test Scripts Do

### test-reddit-local.js
- Connects to Reddit's public JSON API
- Fetches posts from 5 subreddits: EASportsFC, FIFA, fut, FC_26, fut_evos
- Shows actual post titles and scores
- **No database needed**
- **No API keys needed**

### test-full-pipeline.js
- Checks for environment variables
- Validates configuration
- Guides you through Gemini setup
- Prepares for full pipeline test

## Next Steps

1. **First:** Run `node test-reddit-local.js` to verify Reddit works
2. **Then:** If you want classification, get a Gemini API key and add to `.env.local`
3. **Finally:** Run the full pipeline with the development server

## Understanding What's Happening

When you run the test scripts:

1. **Reddit Fetch**: Your computer connects directly to Reddit's public API
   - This works from your computer ✅
   - This FAILS from Vercel's IP ❌ (IP is blocked by Reddit)

2. **Gemini Classify** (if enabled): Sends Reddit text to Google's API
   - Analyzes sentiment (positive/negative/mixed)
   - Extracts player mentions
   - Returns structured data

3. **Database Store** (if enabled): Saves results to Postgres
   - Stores sources (posts/comments)
   - Stores classifications
   - Stores entity mentions (player names)
   - Stores aggregates (community sentiment)

## Commands Reference

```bash
# Install dependencies
npm install

# Test Reddit extraction (no database needed)
node test-reddit-local.js

# Build the Next.js app
npm run build

# Run development server (http://localhost:3000)
npm run dev

# Run production server
npm start

# Lint code
npm run lint
```

## Questions?

- Check `.env.local` exists and has required variables
- Ensure Node.js version is 18+: `node --version`
- Try clearing cache: `rm -rf node_modules .next && npm install`
- Check internet connectivity by visiting https://reddit.com in your browser

---

**Summary:** Your local computer CAN reach Reddit. Vercel's IP is blocked. Local testing confirms the code works; it's a deployment issue, not a code issue.
