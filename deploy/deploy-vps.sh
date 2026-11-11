#!/usr/bin/env bash
# Option B : déploiement manuel, lancé directement sur le VPS (sans GitHub Actions).
# Usage : bash deploy/deploy-vps.sh [dossier_cible]
# Prérequis sur le VPS : git, Node.js 22 (ou 20.19+), rsync.
set -euo pipefail

DEST="${1:-/var/www/checkhub}"
BRANCH="${BRANCH:-claude/elegant-maxwell-ih2pz3}"
REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$REPO_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

cd web
npm ci
npm run build

mkdir -p "$DEST"
rsync -a --delete dist/ "$DEST/"
echo "Prototype déployé dans $DEST"
