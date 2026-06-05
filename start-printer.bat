@echo off
title Zero Backhand - Thermal Printer Server
cd /d "%~dp0"
echo ========================================
echo  Zero Backhand Thermal Printer Server
echo ========================================
echo.
echo If printing from other devices does NOT work,
echo right-click fix-firewall.bat and choose
echo "Run as administrator" to open port 8766.
echo.
echo This window must stay open while printing.
echo Press Ctrl+C to stop.
echo.
python zb-printer-server.py
pause
