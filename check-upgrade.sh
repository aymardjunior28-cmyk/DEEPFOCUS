#!/bin/bash
# 🔍 Script de Vérification Rapide - DeepFocus Upgrade

echo "=========================================="
echo "  🔍 Vérification DeepFocus Upgrade v2.0"
echo "=========================================="
echo ""

# Couleurs
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✅${NC} $1"
  else
    echo -e "${RED}❌${NC} $1 MANQUANT!"
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✅${NC} $1/"
  else
    echo -e "${RED}❌${NC} $1/ MANQUANT!"
  fi
}

# Vérifier les fichiers modifiés
echo "${YELLOW}1. Fichiers Modifiés :${NC}"
check_file "server/index.js"
check_file "src/api.js"
check_file "src/styles.css"

echo ""
echo "${YELLOW}2. Fichiers Créés - Composants :${NC}"
check_file "src/components/Planning.jsx"
check_file "src/components/Invitations.jsx"
check_file "src/Dashboard.jsx"

echo ""
echo "${YELLOW}3. Documentation :${NC}"
check_file "UPGRADE.md"
check_file "INTEGRATION.md"
check_file "TESTING.md"
check_file "EXAMPLES.md"
check_file "DEPLOYMENT.md"
check_file "README_UPGRADE.md"

echo ""
echo "${YELLOW}4. Arborescence :${NC}"
check_dir "src/components"
check_dir "server"
check_dir "public"

echo ""
echo "${YELLOW}5. Package Dependencies :${NC}"
if [ -f "package.json" ]; then
  echo -e "${GREEN}✅${NC} package.json"
  echo "   Vérification dépendances critiques..."
  
  if grep -q '"react"' package.json; then
    echo -e "   ${GREEN}✅${NC} React"
  fi
  
  if grep -q '"express"' package.json; then
    echo -e "   ${GREEN}✅${NC} Express"
  fi
  
  if grep -q '"bcryptjs"' package.json; then
    echo -e "   ${GREEN}✅${NC} Bcryptjs"
  fi
  
  if grep -q '"jsonwebtoken"' package.json; then
    echo -e "   ${GREEN}✅${NC} JWT"
  fi
else
  echo -e "${RED}❌${NC} package.json MANQUANT!"
fi

echo ""
echo "=========================================="
echo ""
echo "✨ ${GREEN}Checklist de Démarrage :${NC}"
echo ""
echo "1️⃣  npm install"
echo "2️⃣  npm run dev"
echo "3️⃣  Ouvrir http://localhost:5173"
echo "4️⃣  S'enregistrer"
echo "5️⃣  Aller au Planning"
echo ""
echo "📚 Documentation à lire :"
echo "   - README_UPGRADE.md (Overview)"
echo "   - INTEGRATION.md (Comment intégrer)"
echo "   - EXAMPLES.md (Code samples)"
echo "   - TESTING.md (Tests)"
echo ""
echo "=========================================="
echo ""
echo -e "${GREEN}✅ Vérification Terminée!${NC}"
echo ""

# Ligne finale avec conseil
echo "🚀 Prêt à démarrer ? Exécutez :"
echo ""
echo "  npm run dev"
echo ""
echo "Puis consultez README_UPGRADE.md pour bien commencer!"
echo ""
