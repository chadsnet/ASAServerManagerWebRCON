Write-Host "========================================" -ForegroundColor Cyan
Write-Host "    Ark RCON Admin Setup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Checking if Node.js is installed..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Node.js is installed! Version: $nodeVersion" -ForegroundColor Green
    } else {
        throw "Node.js not found"
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Node.js is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host "Choose the LTS version for best stability." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "After installing Node.js:" -ForegroundColor Yellow
    Write-Host "1. Close this window" -ForegroundColor White
    Write-Host "2. Open a new PowerShell window" -ForegroundColor White
    Write-Host "3. Navigate to this directory" -ForegroundColor White
    Write-Host "4. Run: npm install" -ForegroundColor White
    Write-Host "5. Run: npm start" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Failed to install dependencies!" -ForegroundColor Red
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Dependencies installed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Starting the application..." -ForegroundColor Yellow
Write-Host "The web app will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server when you're done." -ForegroundColor Yellow
Write-Host ""

npm start 