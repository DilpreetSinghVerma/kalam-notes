@echo off
echo Starting Kalam Notes Installer Build...
cd /d "d:\Dilpreet Singh\My Projects\Notes"
npm run electron:build
echo.
echo Build process complete! You can find your setup .exe in the dist-electron folder!
pause
