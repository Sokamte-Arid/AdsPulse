#!/bin/bash
set -e

echo ""
echo "========================================"
echo "  AdsPulse - Setup Script"
echo "========================================"
echo ""

# ── Server ────────────────────────────────────────────────────
echo "[1/3] Installing server dependencies..."
cd server
npm install

if [ ! -f .env ]; then
  cp .env.example .env
  echo "[INFO] Created server/.env — edit MONGO_URI if needed."
fi

# ── Client ────────────────────────────────────────────────────
echo ""
echo "[2/3] Installing client dependencies..."
cd ../client
npm install

# ── Seed ──────────────────────────────────────────────────────
echo ""
echo "[3/3] Seeding database with demo data..."
cd ../server
npm run seed || echo "[WARN] Seed failed — make sure MongoDB is running. Run manually: cd server && npm run seed"

echo ""
echo "========================================"
echo "  Setup complete!"
echo "========================================"
echo ""
echo "  Start in two terminals:"
echo ""
echo "  Terminal 1: cd server && npm run dev"
echo "  Terminal 2: cd client && npm start"
echo ""
echo "  Open: http://localhost:3000"
echo "  Login: demo@adspulse.com / demo123"
echo ""
