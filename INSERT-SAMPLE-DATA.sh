#!/bin/bash

# INSERT-SAMPLE-DATA.sh
# Sends sample Reddit data from sample-reddit-data.json to the test endpoint
#
# Usage:
#   ./INSERT-SAMPLE-DATA.sh http://localhost:3000
#   ./INSERT-SAMPLE-DATA.sh https://valai-xxx.vercel.app

BASE_URL="${1:-http://localhost:3000}"

echo "Inserting sample Reddit data..."
echo "Target: $BASE_URL/api/test/insert-sample-data"
echo ""

curl -X POST "$BASE_URL/api/test/insert-sample-data" \
  -H "Content-Type: application/json" \
  -d @sample-reddit-data.json

echo ""
echo ""
echo "Done! Check the response above."
echo ""
echo "Next steps:"
echo "1. Verify data was inserted"
echo "2. Check /api/admin/stats to see the inserted data"
echo "3. Test the pipeline with /api/cron/ingest"
