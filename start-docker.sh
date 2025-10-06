#!/bin/bash

echo "🚀 Starte Berichtsheft-Anwendung mit Docker..."

# Prüfe ob Docker läuft
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker läuft nicht. Bitte starten Sie Docker Desktop."
    exit 1
fi

# Erstelle notwendige Verzeichnisse
echo "📁 Erstelle Verzeichnisse..."
mkdir -p data
mkdir -p temp

# Umgebungsvariablen setzen
if [ ! -f .env ]; then
    echo "⚙️ Erstelle .env Datei..."
    cp .env.docker .env
fi

# Docker Images bauen und starten
echo "🔨 Baue und starte Container..."
docker-compose up --build -d

# Datenbank initialisieren
echo "🗄️ Initialisiere Datenbank..."
docker-compose exec web npx prisma db push

echo ""
echo "✅ Anwendung erfolgreich gestartet!"
echo "🌐 Zugriff: http://localhost:3000"
echo "🔍 Health Check: http://localhost:3000/api/health"
echo ""
echo "📋 Logs: docker-compose logs -f"
echo "🛑 Stoppen: docker-compose down"
echo ""