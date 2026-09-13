#!/usr/bin/env bash
# Solo compila frontend + backend sin intentar ejecutar o conectar a BD.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# Node instalado de forma portable
if ! command -v node >/dev/null 2>&1 && [ -d "${LOCALAPPDATA:-}/nodejs" ]; then
  PATH="$LOCALAPPDATA/nodejs:$PATH"
  export PATH
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js no esta disponible." >&2
  exit 1
fi

echo "==> Instalando dependencias del backend"
(cd "$BACKEND" && npm install --no-fund --no-audit)

echo "==> Compilando backend"
(cd "$BACKEND" && npm run build)

echo "==> Instalando dependencias del frontend"
(cd "$FRONTEND" && npm install --no-fund --no-audit)

echo "==> Compilando frontend"
(cd "$FRONTEND" && npm run build)

echo "✓ Compilacion exitosa"
