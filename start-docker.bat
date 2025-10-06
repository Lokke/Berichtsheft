@echo off

echo 🚀 Starte Berichtsheft-Anwendung mit Docker...

REM Prüfe ob Docker läuft
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker läuft nicht. Bitte starten Sie Docker Desktop.
    pause
    exit /b 1
)

REM Erstelle notwendige Verzeichnisse
echo 📁 Erstelle Verzeichnisse...
if not exist data mkdir data
if not exist temp mkdir temp

REM Umgebungsvariablen setzen
if not exist .env (
    echo ⚙️ Erstelle .env Datei...
    copy .env.docker .env
)

REM Docker Container bauen und starten
echo 🔨 Baue und starte Container...
docker-compose up --build -d

REM Datenbank initialisieren
echo 🗄️ Initialisiere Datenbank...
docker-compose exec web npx prisma db push

echo.
echo ✅ Anwendung erfolgreich gestartet!
echo 🌐 Zugriff: http://localhost:3000
echo 🔍 Health Check: http://localhost:3000/api/health
echo.
echo 📋 Logs: docker-compose logs -f
echo 🛑 Stoppen: docker-compose down
echo.
pause