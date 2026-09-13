@echo off
REM Lanzador para Windows: ejecuta produccion.sh con el Bash que incluye Git.
setlocal

call :find_bash
if "%BASH_EXE%"=="" (
  echo No se ha encontrado Bash. Instala Git para Windows desde https://git-scm.com/download/win
  exit /b 1
)

"%BASH_EXE%" "%~dp0produccion.sh" %*
exit /b %errorlevel%

:find_bash
set "BASH_EXE="
for %%B in (bash.exe) do if not "%%~$PATH:B"=="" set "BASH_EXE=%%~$PATH:B"
if not "%BASH_EXE%"=="" exit /b
if exist "%ProgramFiles%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles%\Git\bin\bash.exe" & exit /b
if exist "%ProgramFiles(x86)%\Git\bin\bash.exe" set "BASH_EXE=%ProgramFiles(x86)%\Git\bin\bash.exe" & exit /b
if exist "%LOCALAPPDATA%\Programs\Git\bin\bash.exe" set "BASH_EXE=%LOCALAPPDATA%\Programs\Git\bin\bash.exe"
exit /b
