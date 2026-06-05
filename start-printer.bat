@echo off
title Zero Backhand - Thermal Printer Server
cd /d "%~dp0"
echo ========================================
echo  Zero Backhand Thermal Printer Server
echo ========================================
echo.
echo This window must stay open while printing.
echo Press Ctrl+C to stop.
echo.
python zb-printer-server.py
pause
