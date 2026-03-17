#!/bin/bash
echo "🏔️  Europe Alps Tour 2026 — Setup"
echo "==================================="
echo ""

# Initialize Next.js
echo "→ Creating Next.js project..."
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --no-git \
  --yes

# Install extras
echo "→ Installing dependencies..."
npm install framer-motion

# Copy env template
cp .env.example .env.local 2>/dev/null

echo ""
echo "✅ Done! Next steps:"
echo ""
echo "  1. Add an image search API key to .env.local"
echo "     (Google CSE, Unsplash, or Pexels — pick one)"
echo ""
echo "  2. Start Claude Code:"
echo "     claude"
echo ""
echo "  3. Tell it:"
echo "     Read CLAUDE.md and build the trip planning tool."
echo "     The data files (data/itinerary.json, src/types/,"
echo "     src/lib/) are already written. Start with step 1"
echo "     in the implementation order."
echo ""
echo "  4. Run the dev server:"
echo "     npm run dev"
echo ""
