@echo off
echo.
echo  ========================================
echo   AdsPulse - Setup Script (Windows)
echo  ========================================
echo.

:: ── Server setup ──────────────────────────────────────────────
echo [1/4] Installing server dependencies...
cd server
call npm install
if %errorlevel% neq 0 ( echo ERROR: Server npm install failed & pause & exit /b 1 )

:: Copy .env if not present
if not exist .env (
    copy .env.example .env
    echo [INFO] Created server/.env from example. Edit MONGO_URI if needed.
)

:: ── Client setup ──────────────────────────────────────────────
echo.
echo [2/4] Installing client dependencies...
cd ..\client
call npm install
if %errorlevel% neq 0 ( echo ERROR: Client npm install failed & pause & exit /b 1 )

:: ── Seed ──────────────────────────────────────────────────────
echo.
echo [3/4] Seeding database with demo data...
cd ..\server
call npm run seed
if %errorlevel% neq 0 (
    echo [WARN] Seed failed - make sure MongoDB is running on localhost:27017
    echo        You can run it manually later: cd server ^& npm run seed
)

:: ── Done ──────────────────────────────────────────────────────
echo.
echo  ========================================
echo   Setup complete!
echo  ========================================
echo.
echo  To start the app, open TWO terminals:
echo.
echo  Terminal 1 (Backend):
echo    cd server
echo    npm run dev
echo.
echo  Terminal 2 (Frontend):
echo    cd client
echo    npm start
echo.
echo  Then open: http://localhost:3000
echo  Login: demo@adspulse.com / demo123
echo.
pause
