# 🐳 Docker Deployment für Berichtsheft

## 🚀 Schnellstart

### Voraussetzungen
- Docker und Docker Compose installiert
- Port 9455 verfügbar

### 1️⃣ Umgebungsvariablen einrichten

Erstelle eine `.env` Datei oder bearbeite `.env.production`:

```bash
JWT_SECRET=dein-super-sicheres-geheimnis-hier
```

**⚠️ WICHTIG:** Ändere das `JWT_SECRET` für Produktionsumgebungen!

### 2️⃣ Container starten

```bash
docker-compose up -d
```

Die Anwendung ist dann erreichbar unter: **http://localhost:9455**

### 3️⃣ Container stoppen

```bash
docker-compose down
```

### 4️⃣ Logs anzeigen

```bash
docker-compose logs -f berichtsheft
```

---

## 📋 Befehle

### Container neu bauen (nach Code-Änderungen)
```bash
docker-compose up -d --build
```

### Container-Status prüfen
```bash
docker-compose ps
```

### In Container einloggen (Debugging)
```bash
docker exec -it berichtsheft-app sh
```

### Datenbank zurücksetzen
```bash
# Container stoppen
docker-compose down

# Datenbank löschen
rm prisma/dev.db

# Container neu starten (Datenbank wird neu erstellt)
docker-compose up -d
```

---

## 🔧 Konfiguration

### Port ändern
Bearbeite `docker-compose.yml` und ändere den Port:
```yaml
ports:
  - "DEIN_PORT:3000"  # z.B. "8080:3000"
```

### Persistente Daten
Die folgenden Ordner werden außerhalb des Containers gespeichert:
- `./prisma` - SQLite Datenbank
- `./temp` - Temporäre Dateien (PDFs)

---

## 🛠️ Troubleshooting

### Container startet nicht
```bash
# Logs prüfen
docker-compose logs

# Container komplett neu bauen
docker-compose down
docker-compose up -d --build --force-recreate
```

### Datenbank-Fehler
```bash
# Prisma Client neu generieren
docker exec -it berichtsheft-app npx prisma generate

# Container neu starten
docker-compose restart
```

### Port bereits belegt
Ändere den Port in `docker-compose.yml` oder stoppe den Dienst auf Port 9455:
```bash
# Windows
netstat -ano | findstr :9455

# Linux/macOS
lsof -i :9455
```

---

## 🔒 Sicherheit

### Für Produktion:
1. ✅ Ändere `JWT_SECRET` in `.env`
2. ✅ Verwende HTTPS (z.B. mit nginx/Traefik als Reverse Proxy)
3. ✅ Sichere die Datenbank-Datei (`./prisma/dev.db`)
4. ✅ Halte Docker Images aktuell: `docker-compose pull`

---

## 📊 Health Check

Der Container hat einen integrierten Health Check:
```bash
docker inspect --format='{{json .State.Health}}' berichtsheft-app
```

Oder manuell testen:
```bash
curl http://localhost:9455/api/auth/check
```

---

## 🎯 Produktions-Deployment

### Mit nginx als Reverse Proxy

**nginx.conf Beispiel:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:9455;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Mit SSL/HTTPS (Let's Encrypt)
```bash
# Certbot installieren
sudo apt install certbot python3-certbot-nginx

# SSL-Zertifikat anfordern
sudo certbot --nginx -d your-domain.com
```

---

## 📦 Image-Größe

Das Docker-Image verwendet Multi-Stage Build für optimale Größe:
- **Base Image:** node:20-alpine (~50MB)
- **Final Image:** ~200-300MB (mit Dependencies)

---

## 🔄 Updates

### Code-Updates deployen:
```bash
git pull
docker-compose up -d --build
```

### Datenbank-Migration:
```bash
docker exec -it berichtsheft-app npx prisma migrate deploy
```

---

## 💡 Tipps

- Die Anwendung nutzt SQLite, ideal für kleine bis mittlere Workloads
- Für größere Deployments: PostgreSQL oder MySQL in Betracht ziehen
- Backups der `./prisma/dev.db` Datei regelmäßig erstellen
- Logs mit `docker-compose logs` überwachen

---

## 📞 Support

Bei Problemen:
1. Logs prüfen: `docker-compose logs -f`
2. Container-Status: `docker-compose ps`
3. Health-Check: `curl http://localhost:9455/api/auth/check`
