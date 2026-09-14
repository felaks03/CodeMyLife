@echo off
setlocal EnableExtensions
set "ROOT=%~dp0"
set "FRONTEND=%ROOT%frontend"
set "BUMP=%~1"
if not defined BUMP set "BUMP=patch"
if /i not "%BUMP%"=="patch" if /i not "%BUMP%"=="minor" if /i not "%BUMP%"=="major" (
  echo Uso: newversion.cmd [patch^|minor^|major]
  exit /b 1
)

pushd "%FRONTEND%"
call npm.cmd version %BUMP% --no-git-tag-version
if errorlevel 1 exit /b 1
call npm.cmd test
if errorlevel 1 exit /b 1
call npm.cmd run build
if errorlevel 1 exit /b 1
for /f "delims=" %%V in ('powershell.exe -NoProfile -Command "(Get-Content package.json | ConvertFrom-Json).version"') do set "VERSION=%%V"
popd

pushd "%ROOT%"
git.exe add -A
git.exe commit -m "chore: release v%VERSION%"
if errorlevel 1 exit /b 1
git.exe tag -a "v%VERSION%" -m "Release v%VERSION%"
if errorlevel 1 exit /b 1
git.exe push origin main --follow-tags
if errorlevel 1 exit /b 1
echo Release v%VERSION% enviada. GitHub Actions generara el instalador y la release.
popd