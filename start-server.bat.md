@echo off
echo ============================================
echo   Pomodoro Focus — Local Server
echo ============================================
echo.
echo Starting server at http://localhost:5500
echo Press Ctrl+C to stop.
echo.

:: Change to the folder where this .bat file lives
cd /d "%~dp0"

python -m http.server 5500
pause