#!/usr/bin/env bash
echo ""
echo "======================================================"
echo "   EcoPark Maroc — Demarrage"
echo "======================================================"
echo ""
cd "$(dirname "$0")"
if ! command -v node &>/dev/null; then
  echo "ERROR: Node.js requis → https://nodejs.org"
  read -p "Appuie sur Entree..."
  exit 1
fi
echo "Node.js $(node -v) OK"
echo ""
echo "Installation des dependances..."
npm install
echo ""
echo "======================================================"
echo "   Navigateur local  : http://localhost:5173"
echo "   QR Code juges     : http://localhost:5173 → Profil → QR Code"
echo "   Compte demo       : demo@ecopark.ma / demo123"
echo "   Ctrl+C pour arreter"
echo "======================================================"
echo ""
npm run dev
