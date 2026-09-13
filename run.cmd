@echo off
REM Lanzador completo de CodeMyLife para Windows.
setlocal EnableExtensions

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$projectRoot = [System.IO.Path]::GetFullPath('%ROOT%'); Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('electron.exe', 'CodeMyLife.exe') -and $_.CommandLine -and $_.CommandLine.Contains($projectRoot.TrimEnd('\')) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" >nul 2>&1

REM La terminal debe estar elevada para modificar hosts. No abrimos otra ventana:
REM si no esta elevada, mostramos el aviso en esta misma terminal y continuamos.
net session >nul 2>&1
if "%errorlevel%"=="0" (
  rem Permisos de administrador confirmados.
) else (
  echo [WARN] Esta terminal NO tiene permisos de administrador.
  echo [WARN] La app arrancara, pero el bloqueo de Windows puede fallar.
  echo [WARN] Para aplicar hosts, abre VS Code como administrador y vuelve a ejecutar run.cmd.
)

pushd "%BACKEND%"
call npm.cmd install --no-fund --no-audit
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
call npm.cmd install --no-fund --no-audit
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
