@echo off
REM Lanzador completo de CodeMyLife para Windows.
setlocal EnableExtensions

set "ROOT=%~dp0"
set "BACKEND=%ROOT%backend"
set "FRONTEND=%ROOT%frontend"
set "ELECTRON_ENABLE_LOGGING=1"

echo [CodeMyLife] Inicio: %date% %time%
echo [CodeMyLife] Raiz: %ROOT%
echo [CodeMyLife] Backend: %BACKEND%
echo [CodeMyLife] Frontend: %FRONTEND%
echo [CodeMyLife] Buscando instancias anteriores del proyecto...
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "$projectRoot = [System.IO.Path]::GetFullPath('%ROOT%'); Get-CimInstance Win32_Process | Where-Object { $_.Name -in @('electron.exe', 'CodeMyLife.exe') -and $_.CommandLine -and $_.CommandLine.Contains($projectRoot.TrimEnd('\')) } | ForEach-Object { Write-Output ('[CodeMyLife] Cerrando proceso anterior PID ' + $_.ProcessId); Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"
if errorlevel 1 echo [WARN] No se pudieron limpiar todas las instancias anteriores.

REM La terminal debe estar elevada para modificar hosts. No abrimos otra ventana:
REM si no esta elevada, mostramos el aviso en esta misma terminal y continuamos.
net session >nul 2>&1
if "%errorlevel%"=="0" (
  echo [CodeMyLife] Permisos de administrador: OK
) else (
  echo [WARN] Esta terminal NO tiene permisos de administrador.
  echo [WARN] La app arrancara, pero el bloqueo de Windows puede fallar.
  echo [WARN] Para aplicar hosts, abre VS Code como administrador y vuelve a ejecutar run.cmd.
)

echo ==> Instalando dependencias del backend
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
echo ==> Compilando backend
call npm.cmd run build
if errorlevel 1 (
  echo [ERROR] Compilacion del backend fallo con codigo %errorlevel%.
  exit /b 1
)
popd

echo ==> Arrancando API en segundo plano (logs visibles en esta terminal)
start "CodeMyLife API" /b cmd.exe /d /c "cd /d ""%BACKEND%"" && echo [API] Inicio %%date%% %%time%% && npm.cmd start"
set "API_READY=0"
for /l %%I in (1,1,5) do (
  echo [CodeMyLife] Comprobando API, intento %%I/5...
  curl.exe -sf http://127.0.0.1:3000/health >nul 2>&1
  if not errorlevel 1 set "API_READY=1"
  if "%API_READY%"=="1" goto api_done
  timeout /t 1 /nobreak >nul
)
:api_done
if "%API_READY%"=="0" (
  echo [WARN] La API no esta disponible. Se usara el perfil local.
  echo [WARN] Revisa arriba los logs de la API para ver el error exacto.
)
if "%API_READY%"=="1" (
  echo [OK] API conectada correctamente.
)

echo ==> Instalando dependencias del frontend
pushd "%FRONTEND%"
call npm.cmd install --no-fund --no-audit
if errorlevel 1 (
  echo [ERROR] npm install del frontend fallo con codigo %errorlevel%.
  exit /b 1
)
echo ==> Compilando frontend
call npm.cmd run build
if errorlevel 1 (
  echo [ERROR] Compilacion del frontend fallo con codigo %errorlevel%.
  exit /b 1
)
echo ==> Arrancando CodeMyLife
echo [CodeMyLife] Electron: %FRONTEND%\node_modules\electron\dist\electron.exe
"%FRONTEND%\node_modules\electron\dist\electron.exe" --enable-logging "%FRONTEND%"
set "ELECTRON_EXIT=%errorlevel%"
echo [CodeMyLife] Electron termino con codigo %ELECTRON_EXIT%.

exit /b %ELECTRON_EXIT%
