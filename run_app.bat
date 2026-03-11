@echo off
SETLOCAL EnableDelayedExpansion

echo [1/3] Installing dependencies...
call npm install

echo [2/3] Starting Storage Server (Port 3001)...
start /B node server.js

echo [3/3] Starting Vite Dev Server...
echo.
echo Application will be available at http://localhost:5173
echo.
call npx vite
