#!/usr/bin/env bash
# Publica CodeMyLife: valida el repo, compila, empaqueta el instalador y sube los cambios.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
BRANCH="${CODEMYLIFE_RELEASE_BRANCH:-main}"

if ! command -v node >/dev/null 2>&1 && [ -d "${LOCALAPPDATA:-}/nodejs" ]; then
  PATH="$LOCALAPPDATA/nodejs:$PATH"
  export PATH
fi

for tool in node npm git; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Error: '$tool' no esta disponible en el PATH." >&2
    exit 1
  fi
done

cd "$ROOT"

echo "==> Comprobando el repositorio"
current_branch="$(git rev-parse --abbrev-ref HEAD)"
if [ "$current_branch" != "$BRANCH" ]; then
  echo "Error: estas en '$current_branch' y se esperaba '$BRANCH'." >&2
  exit 1
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Error: hay cambios sin confirmar. Haz commit antes de publicar." >&2
  git status --short
  exit 1
fi

VERSION="$(node -p "require('./frontend/package.json').version")"
TAG="v$VERSION"

if git rev-parse -q --verify "refs/tags/$TAG" >/dev/null; then
  echo "Error: la etiqueta $TAG ya existe. Sube la version en frontend/package.json." >&2
  exit 1
fi

echo "==> Compilando backend"
(cd "$BACKEND" && npm ci --no-fund --no-audit && npm run build)

echo "==> Compilando y probando frontend"
(cd "$FRONTEND" && npm ci --no-fund --no-audit && npm test && npm run build)

echo "==> Empaquetando instalador de Windows"
(cd "$FRONTEND" && npm run package)

echo "==> Publicando $TAG en el remoto"
read -r -p "Confirmas subir $TAG a origin/$BRANCH? [s/N] " answer
case "$answer" in
  s|S|si|SI|y|Y) ;;
  *) echo "Cancelado."; exit 0 ;;
esac

git tag -a "$TAG" -m "Release $TAG"
git push origin "$BRANCH"
git push origin "$TAG"

if [ -n "${CODEMYLIFE_DEPLOY_CMD:-}" ]; then
  echo "==> Desplegando backend"
  bash -c "$CODEMYLIFE_DEPLOY_CMD"
else
  echo "==> Backend no desplegado"
  echo "    Define CODEMYLIFE_DEPLOY_CMD con el comando de despliegue en AWS."
fi

echo
echo "Listo. Instalador disponible en frontend/dist_electron/"
