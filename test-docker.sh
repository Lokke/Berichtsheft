#!/bin/bash

echo "🧪 Teste Docker-Setup..."

# Baue und starte Container
echo "🚀 Starte Container..."
docker-compose up --build -d

# Warte auf Startup
echo "⏳ Warte auf Start..."
sleep 30

# Teste Health-Check
echo "🔍 Teste Health-Check..."
HEALTH_STATUS=$(curl -s http://localhost:3000/api/health | grep -o '"status":"[^"]*"' | cut -d'"' -f4)

if [ "$HEALTH_STATUS" = "healthy" ]; then
    echo "✅ Health-Check erfolgreich"
else
    echo "❌ Health-Check fehlgeschlagen"
    docker-compose logs web
    exit 1
fi

# Teste LaTeX
echo "🔍 Teste LaTeX..."
LATEX_STATUS=$(curl -s http://localhost:3000/api/health | grep -o '"latex":"[^"]*"' | cut -d'"' -f4)

if [ "$LATEX_STATUS" = "installed" ]; then
    echo "✅ LaTeX funktioniert"
else
    echo "⚠️ LaTeX Fallback aktiv"
fi

echo ""
echo "🎉 Test erfolgreich!"
echo "🌐 Anwendung: http://localhost:3000"
echo " Stoppen: docker-compose down"