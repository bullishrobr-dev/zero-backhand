@echo off
echo ========================================
echo  Zero Backhand - Fix Windows Firewall
echo ========================================
echo.
echo This will allow other devices on your Wi-Fi
echo to connect to the printer server.
echo.
echo You may see a Windows UAC prompt. Click YES.
echo.
pause

echo Adding firewall rule for port 8766...
netsh advfirewall firewall add rule name="Zero Backhand Printer" dir=in action=allow protocol=tcp localport=8766

if errorlevel 1 (
    echo.
    echo ERROR: Could not add firewall rule.
    echo Make sure you right-clicked this file and chose "Run as administrator".
    echo.
) else (
    echo.
    echo SUCCESS! Firewall rule added.
    echo Other devices on the same Wi-Fi can now print.
    echo.
)

pause
