# 🐳 Docker Setup für Berichtsheft mit LaTeX

Dieses Docker-Setup stellt eine vollständige Berichtsheft-Anwendung mit integrierter LaTeX-Unterstützung bereit.

## 🚀 Schnellstart

### Windows
```bash
# Einfach das Startup-Script ausführen
.\start-docker.bat
```

### Linux/macOS
```bash
# Script ausführbar machen und starten
chmod +x start-docker.sh
./start-docker.sh
```

### Manuell
```bash
# 1. Umgebung vorbereiten
mkdir -p data logs backups
cp .env.docker .env

# 2. Container bauen
docker-compose build

# 3. Datenbank initialisieren
docker-compose run --rm web npx prisma db push

# 4. Anwendung starten
docker-compose up -d
```

## 📋 Verfügbare Services

- **web**: Next.js Anwendung mit LaTeX (Port 3000)
- **nginx**: Reverse Proxy (Port 80/443) - Optional für Produktion
- **backup**: Automatische Backups - Optional für Produktion

## 🌐 Zugriff

- **Anwendung**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## 🔧 Konfiguration

### Umgebungsvariablen (.env)
```env
NODE_ENV=production
DATABASE_URL=file:./dev.db
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000
```

### Docker-Compose Profile

**Entwicklung** (Standard):
```bash
docker-compose up -d
```

**Produktion** (mit Nginx & Backups):
```bash
docker-compose --profile production up -d
```

## 📊 Management

### Status prüfen
```bash
docker-compose ps
```

### Logs anzeigen
```bash
# Alle Services
docker-compose logs -f

# Nur Web-Service
docker-compose logs -f web
```

### Container neustarten
```bash
# Einzelner Service
docker-compose restart web

# Alle Services
docker-compose restart
```

### Anwendung stoppen
```bash
# Stoppen (Container behalten)
docker-compose stop

# Stoppen und entfernen
docker-compose down

# Stoppen, entfernen und Volumes löschen
docker-compose down -v
```

## 🗄️ Datenbank

### Backup erstellen
```bash
docker-compose exec web npx prisma db push
```

### Migration ausführen
```bash
docker-compose exec web npx prisma migrate deploy
```

### Datenbank zurücksetzen
```bash
docker-compose down -v
docker-compose up -d
docker-compose exec web npx prisma db push
```

## 🔍 Debugging

### Container-Shell öffnen
```bash
docker-compose exec web sh
```

### LaTeX-Status prüfen
```bash
# Im Container
pdflatex --version

# Über Health-Check API
curl http://localhost:3000/api/health
```

### Logs verfolgen
```bash
# Alle Logs
docker-compose logs -f

# Nur Fehler
docker-compose logs -f web | grep ERROR
```

## 📦 Features

✅ **LaTeX-Integration**: Vollständige LaTeX-Installation mit deutschen Paketen  
✅ **Multi-Stage Build**: Optimierte Image-Größe  
✅ **Health Checks**: Automatische Gesundheitsprüfung  
✅ **Persistent Storage**: Datenbank und Logs bleiben erhalten  
✅ **Nginx Proxy**: Production-ready Setup  
✅ **Backup System**: Automatische Datensicherung  
✅ **Security**: Non-root User, minimale Attack Surface  

## 🔒 Sicherheit

- Container läuft als non-root User
- Minimale Alpine Linux Base
- Nginx Rate Limiting
- Sicherheits-Header
- Separate Networks

## 🔧 Anpassungen

### Port ändern
```yaml
# docker-compose.yml
services:
  web:
    ports:
      - "3001:3000"  # Extern:Intern
```

### Memory Limit setzen
```yaml
# docker-compose.yml
services:
  web:
    deploy:
      resources:
        limits:
          memory: 512M
```

### SSL/HTTPS aktivieren
1. Zertifikate in `./ssl/` ablegen
2. Nginx-Profil aktivieren: `docker-compose --profile production up -d`

## 🐛 Troubleshooting

### PDF-Generierung schlägt fehl
```bash
# LaTeX-Status prüfen
docker-compose exec web pdflatex --version

# Logs prüfen
docker-compose logs -f web | grep latex
```

### Datenbank-Probleme
```bash
# Datenbank neu initialisieren
docker-compose down -v
docker-compose up -d
docker-compose exec web npx prisma db push
```

### Performance-Probleme
```bash
# Container-Ressourcen prüfen
docker stats

# Memory-Usage der Anwendung
curl http://localhost:3000/api/health
```

## 📈 Monitoring

### Resource-Überwachung
```bash
# Container-Statistiken
docker stats

# Disk-Usage
docker system df
```

### Health-Check API
```bash
curl http://localhost:3000/api/health
```

Antwort:
```json
{
  "status": "healthy",
  "latex": "installed",
  "node_version": "v20.x.x",
  "memory": {
    "used": "45 MB",
    "total": "128 MB"
  }
}
```