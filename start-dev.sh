#!/bin/bash
set -e

echo "🚀 Starting Berichtsheft Application (Development Mode)..."

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

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# Seed training professions
echo "🌱 Seeding training professions..."
npm run seed || echo "⚠️  Seeding failed or already seeded"

# Start the dev server
echo "✅ Starting development server on port ${PORT:-9455}..."
PORT=${PORT:-9455} npm run dev
