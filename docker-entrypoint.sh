#!/bin/sh
set -e

echo "🔍 Checking directories and database..."

# Create data directory for database
mkdir -p /app/data

# Copy prisma schema to data directory if not exists
if [ ! -f /app/data/schema.prisma ]; then
  echo "📋 Copying Prisma schema..."
  cp /app/prisma-schema/schema.prisma /app/data/schema.prisma
fi

# Copy migrations if not exist
if [ ! -d /app/data/migrations ]; then
  echo "📋 Copying migrations..."
  cp -r /app/prisma-schema/migrations /app/data/
fi

# Check if database exists
if [ ! -f /app/data/dev.db ]; then
  echo "📦 Database not found, creating..."
  cd /app/data
  npx prisma migrate deploy --schema=/app/data/schema.prisma
  echo "✅ Database created and migrations applied"
  
  # Seed training professions
  echo "🌱 Seeding training professions..."
  cd /app
  npm run seed || echo "⚠️  Seeding failed"
else
  echo "✅ Database exists"
  # Run migrations in case there are new ones
  cd /app/data
  npx prisma migrate deploy --schema=/app/data/schema.prisma
  echo "✅ Migrations checked"
fi

echo "🚀 Starting application..."
cd /app
exec node server.js
