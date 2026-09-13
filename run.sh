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

tsc_pid=""
backend_pid=""
cleanup() {
  if [ -n "$tsc_pid" ] && kill -0 "$tsc_pid" 2>/dev/null; then
    kill "$tsc_pid" 2>/dev/null || true
  fi
  if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

# Cerrar instancias previas huérfanas si las hubiera para liberar el lock de ventana
taskkill //F //IM electron.exe >/dev/null 2>&1 || true
taskkill //F //IM CodeMyLife.exe >/dev/null 2>&1 || true

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

echo "==> Intentando arrancar API..."
(cd "$BACKEND" && npm start) &
backend_pid=$!

API_URL="${CODEMYLIFE_API_URL:-http://127.0.0.1:3000}"
echo "==> Verificando API en $API_URL/health"
api_ready=false
for _ in $(seq 1 5); do
  if curl -sf "$API_URL/health" >/dev/null 2>&1; then
    echo "    API lista y conectada a la base de datos."
    api_ready=true
    break
  fi
  if ! kill -0 "$backend_pid" 2>/dev/null; then
    break
  fi
  sleep 1
done

if [ "$api_ready" = false ]; then
  echo "    Nota: No se pudo conectar a la base de datos MongoDB."
  echo "    La aplicacion iniciara en modo local / perfil de prueba."
  if [ -n "$backend_pid" ] && kill -0 "$backend_pid" 2>/dev/null; then
    kill "$backend_pid" 2>/dev/null || true
  fi
  backend_pid=""
fi

echo "==> Instalando dependencias del frontend"
(cd "$FRONTEND" && npm install --no-fund --no-audit)

echo "==> Compilando frontend"
(cd "$FRONTEND" && npm run build)

echo "==> Iniciando observador TypeScript (Hot Reload activo)"
(cd "$FRONTEND" && npx tsc -p tsconfig.json -w --preserveWatchOutput) &
tsc_pid=$!

echo "==> Arrancando aplicacion de escritorio"
echo "    Aviso: sin permisos de administrador el bloqueo no se aplicara."
"$FRONTEND/node_modules/electron/dist/electron.exe" "$FRONTEND"
