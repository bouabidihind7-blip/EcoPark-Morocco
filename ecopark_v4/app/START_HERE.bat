@echo off
echo.
echo ======================================================
echo    EcoPark Maroc - Demarrage
echo ======================================================
echo.
cd /d "%~dp0"
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Node.js requis. Telecharge: https://nodejs.org
    pause & exit /b 1
)
echo Node.js OK
echo.
echo Installation des dependances...
call npm install
echo.
echo ======================================================
echo    Navigateur local : http://localhost:5173
echo    QR Juges         : Profil - QR Code (dans l'app)
echo    Compte demo      : demo@ecopark.ma / demo123
echo    Ctrl+C pour arreter
echo ======================================================
echo.
call npm run dev
pause
