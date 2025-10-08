#!/bin/bash
set -e

echo "🚀 Starting Berichtsheft Application..."

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
echo "✅ Starting server on port ${PORT:-9455}..."
PORT=${PORT:-9455} npm start
