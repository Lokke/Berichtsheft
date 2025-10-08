#!/bin/bash
set -e

PORT=${PORT:-9455}

echo "🚀 Starting Berichtsheft Application..."

# Stop any existing process on the port
if command -v fuser &> /dev/null; then
  echo "🛑 Checking for existing process on port $PORT..."
  fuser -k $PORT/tcp 2>/dev/null || true
  sleep 1
fi

# Check if .env exists
if [ ! -f .env ]; then
  echo "⚠️  Warning: .env file not found!"
  echo "Creating .env from .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
  else
    echo "DATABASE_URL=\"file:./prisma/dev.db\"" > .env
    echo "JWT_SECRET=\"$(openssl rand -base64 32)\"" >> .env
  fi
fi

# Generate Prisma Client (if not exists or outdated)
if [ ! -d "node_modules/.prisma/client" ]; then
  echo "🔧 Generating Prisma Client..."
  npx prisma generate
fi

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Seed training professions (only if table is empty)
echo "🌱 Checking training professions..."
npm run seed || echo "⚠️  Seeding failed or already seeded"

# Check if build exists
if [ ! -d ".next" ]; then
  echo "⚠️  No build found! Please run 'npm run build' first or use start-dev.sh for development."
  exit 1
fi

# Start the server
echo "✅ Starting server on port $PORT..."
PORT=$PORT npm start
