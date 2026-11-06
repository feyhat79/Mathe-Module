@echo off
title AufgabenBuilder - Zu GitHub hochladen
color 0B

pushd "%~dp0"
w: 2>nul
cd /d "w:\home\Feyhat\Projekte\AufgabenBuilder - Original" 2>nul

echo ===================================================================
echo   AufgabenBuilder - Zu GitHub hochladen (feyhat79/Mathe-Module)
echo ===================================================================
echo.

if not exist ".git" (
    echo [1/4] Git Repository initialisieren...
    git init
    git branch -M main
    git remote add origin https://github.com/feyhat79/Mathe-Module.git
) else (
    echo [1/4] Git Repository aktualisieren...
    git remote set-url origin https://github.com/feyhat79/Mathe-Module.git
)

echo.
echo [2/4] Aenderungen erfassen...
git add .

echo.
echo [3/4] Versionsstand sichern (Commit)...
git commit -m "AufgabenBuilder & Word Add-in (GitHub Pages)"

echo.
echo [4/4] Zu GitHub uebertragen (Push)...
git push -u origin main

echo.
echo ===================================================================
echo Vorgang abgeschlossen!
echo ===================================================================
pause
popd
