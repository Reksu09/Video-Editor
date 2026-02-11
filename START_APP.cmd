@echo off
setlocal enabledelayedexpansion

:: Set window title
title Viral Reels Generator AI - Startup

echo ===================================================
echo     VIRAL REELS GENERATOR AI - AUTOMATIC STARTUP
echo ===================================================
echo.

:: Check if Node.js is installed
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b
)

:: Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo This may take a few minutes...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b
    )
)

echo [INFO] Starting the web application...
echo [INFO] Your browser will open automatically once the server is ready.
echo.

:: Start a small helper to open the browser after a delay
start /b cmd /c "timeout /t 5 >nul && start http://localhost:5173"

:: Run the dev server
call npm run start

echo.
echo [INFO] Server stopped.
pause
