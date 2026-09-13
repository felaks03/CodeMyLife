@echo off
REM Publica CodeMyLife desde Windows sin depender de Bash.
setlocal EnableExtensions
set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
pushd "%ROOT%"

for /f "delims=" %%V in ('powershell.exe -NoProfile -Command "(Get-Content ''frontend/package.json'' | ConvertFrom-Json).version"') do set "VERSION=%%V"
set "TAG=v%VERSION%"
echo ==> Comprobando el repositorio
for /f "delims=" %%B in ('git.exe rev-parse --abbrev-ref HEAD') do set "BRANCH=%%B"
if not "%BRANCH%"=="main" (
  echo Error: debes estar en la rama main.
  exit /b 1
)
for /f "delims=" %%S in ('git.exe status --porcelain') do (
  echo Error: hay cambios sin confirmar.
  exit /b 1
)
git.exe rev-parse -q --verify "refs/tags/%TAG%" >nul 2>&1
if not errorlevel 1 (
  echo Error: la etiqueta %TAG% ya existe.
  exit /b 1
)

echo ==> Compilando backend
pushd "%BACKEND%"
call npm.cmd ci --no-fund --no-audit && call npm.cmd run build
if errorlevel 1 exit /b 1
popd
echo ==> Probando y compilando frontend
pushd "%FRONTEND%"
call npm.cmd ci --no-fund --no-audit && call npm.cmd test && call npm.cmd run build && call npm.cmd run package
if errorlevel 1 exit /b 1
popd

set /p "ANSWER=Confirmas publicar %TAG% en origin/main? [s/N] "
if /i not "%ANSWER%"=="s" if /i not "%ANSWER%"=="si" exit /b 0
git.exe tag -a "%TAG%" -m "Release %TAG%"
git.exe push origin main
git.exe push origin "%TAG%"
echo Listo. Instalador disponible en frontend\dist_electron\
popd
