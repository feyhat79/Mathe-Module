@echo off
title AufgabenBuilder - Word Add-In Server
color 0A

:: 1. Verzeichnis sicher ansteuern (auch bei WSL / UNC-Pfad)
pushd "%~dp0"
w: 2>nul
cd /d "w:\home\Feyhat\Projekte\AufgabenBuilder - Original" 2>nul

echo ===================================================================
echo   AufgabenBuilder Mathe - Microsoft Word Add-in Server
echo ===================================================================
echo.

:: 2. Pruefen ob das HTTPS-Zertifikat fuer Microsoft Word existiert
set CERT_FILE=%USERPROFILE%\.office-addin-dev-certs\localhost.crt
if not exist "%CERT_FILE%" (
    echo [INFO] Microsoft Word verlangt zwingend eine sichere HTTPS-Verbindung.
    echo Einmalige Erstellung des vertrauenswuerdigen lokalen SSL-Zertifikats...
    echo.
    echo (Falls Windows ein Bestaetigungsfenster anzeigt: Bitte auf "JA" klicken!)
    echo.
    call npx office-addin-dev-certs install
    echo.
)

:: 3. Server starten
echo [INFO] Starte Add-in Server auf HTTPS (Port 3000)...
echo.
echo Bitte dieses Konsolenfenster geoeffnet lassen, solange Word aktiv ist!
echo ===================================================================
echo.

call npm run dev:word

echo.
echo Server wurde beendet.
pause
popd
