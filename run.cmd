@echo off
REM Lanzador completo de CodeMyLife para Windows.
setlocal EnableExtensions

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$projectRoot = [regex]::Escape(([System.IO.Path]::GetFullPath('%ROOT%')).TrimEnd('\')); Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('electron.exe', 'CodeMyLife.exe') -and $_.CommandLine -and $_.CommandLine -match $projectRoot } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep -Milliseconds 500" >nul 2>&1

REM La terminal debe estar elevada para modificar hosts.
net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo [INFO] Solicitando permisos de administrador para aplicar los bloqueos...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b 0
)
echo [INFO] Permisos de administrador confirmados.

pushd "%BACKEND%"
call npm.cmd install --no-fund --no-audit --loglevel=error
if errorlevel 1 (
  echo [ERROR] npm install del backend fallo con codigo %errorlevel%.
  exit /b 1
)
if not exist ".env" (
  echo [ERROR] Falta %BACKEND%\.env
  echo Copia .env.example a .env y configura MONGODB_URI y JWT_SECRET.
  exit /b 1
)
call npm.cmd run build
if errorlevel 1 (
  echo [ERROR] Compilacion del backend fallo con codigo %errorlevel%.
  exit /b 1
)
popd

start "CodeMyLife API" /b cmd.exe /d /c "cd /d ""%BACKEND%"" && npm.cmd start >nul 2>&1"
set "API_READY=0"
for /l %%I in (1,1,5) do (
  curl.exe -sf http://127.0.0.1:3000/health >nul 2>&1
  if not errorlevel 1 set "API_READY=1"
  if "%API_READY%"=="1" goto api_done
  timeout /t 1 /nobreak >nul
)
:api_done
if "%API_READY%"=="0" (
  rem Se continua usando el perfil local.
)
if "%API_READY%"=="1" (
  rem API conectada.
)

pushd "%FRONTEND%"
call npm.cmd install --no-fund --no-audit --loglevel=error
if errorlevel 1 (
  echo [ERROR] npm install del frontend fallo con codigo %errorlevel%.
  exit /b 1
)
call npm.cmd run build
if errorlevel 1 (
  echo [ERROR] Compilacion del frontend fallo con codigo %errorlevel%.
  exit /b 1
)
"%FRONTEND%\node_modules\electron\dist\electron.exe" "%FRONTEND%"
set "ELECTRON_EXIT=%errorlevel%"

exit /b %ELECTRON_EXIT%
