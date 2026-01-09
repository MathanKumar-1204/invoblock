@echo off
echo Installing Invoice Marketplace DApp Dependencies...

REM Install web3 dependency
npm install web3

REM Check if installation was successful
if %ERRORLEVEL% NEQ 0 (
    echo Error occurred during installation!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Installation completed successfully!
echo.
echo To run the application:
echo 1. Make sure you have deployed the smart contract and added the address to .env.local
echo 2. Run: npm run dev
echo.
echo Press any key to exit...
pause >nul