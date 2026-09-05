#!/usr/bin/env bash
# Arranca CodeMyLife en local: API + aplicacion de escritorio.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"

# Node instalado de forma portable en la carpeta del usuario.
if ! command -v node >/dev/null 2>&1 && [ -d "${LOCALAPPDATA:-}/nodejs" ]; then
  PATH="$LOCALAPPDATA/nodejs:$PATH"
  export PATH
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js no esta disponible en el PATH." >&2
  exit 1
fi

backend_pid=""
cleanup() {
  if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "==> Instalando dependencias del backend"
(cd "$BACKEND" && npm install --no-fund --no-audit)

if [ ! -f "$BACKEND/.env" ]; then
  echo "Error: falta $BACKEND/.env" >&2
  echo "       Copia .env.example a .env y rellena MONGODB_URI y JWT_SECRET." >&2
  echo "       Puedes usar un cluster gratuito de MongoDB Atlas." >&2
  exit 1
fi

echo "==> Compilando backend"
(cd "$BACKEND" && npm run build)

echo "==> Arrancando API"
(cd "$BACKEND" && npm start) &
backend_pid=$!

API_URL="${CODEMYLIFE_API_URL:-http://127.0.0.1:3000}"
echo "==> Esperando a $API_URL/health"
for _ in $(seq 1 60); do
  if curl -sf "$API_URL/health" >/dev/null 2>&1; then
    echo "    API lista"
    break
  fi
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    echo "Error: la API se ha detenido durante el arranque." >&2
    exit 1
  fi
  sleep 1
done

echo "==> Instalando dependencias del frontend"
(cd "$FRONTEND" && npm install --no-fund --no-audit)

echo "==> Arrancando aplicacion de escritorio"
echo "    Aviso: sin permisos de administrador el bloqueo no se aplicara."
(cd "$FRONTEND" && npm start)
