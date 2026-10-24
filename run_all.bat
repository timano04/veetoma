@echo off
title Veetoma Starter
cd /d "%~dp0"

if "%~1"=="core-api" goto run_core
if "%~1"=="web" goto run_web

echo [1/2] Starting Core API (Port 8080)...
start "Veetoma Core API" cmd /k ""%~f0" core-api"

echo [2/2] Starting Web App (Port 3000)...
start "Veetoma Web App" cmd /k ""%~f0" web"

echo.
echo All services launched in separate windows.
timeout /t 3
exit /b

:run_core
title Veetoma Core API (Port 8080)
cd /d "%~dp0apps\core-api"
set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.11.10-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "MAVEN_OPTS=-Xmx2g -XX:+UseG1GC"
echo Starting Spring Boot on http://localhost:8080 ...
mvn spring-boot:run
pause
exit /b

:run_web
title Veetoma Web App (Port 3000)
cd /d "%~dp0apps\web"
echo Starting Next.js Web on http://localhost:3000 ...
npm run dev
pause
exit /b
