@echo off
echo ========================================
echo    Ark RCON Admin Setup Script
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/
    echo Choose the LTS version for best stability.
    echo.
    echo After installing Node.js:
    echo 1. Close this window
    echo 2. Open a new PowerShell window
    echo 3. Navigate to this directory
    echo 4. Run: npm install
    echo 5. Run: npm start
    echo.
    pause
    exit /b 1
)

echo Node.js is installed!
echo.

echo Installing dependencies...
npm install
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Failed to install dependencies!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.
echo Starting the application...
echo The web app will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server when you're done.
echo.

npm start 