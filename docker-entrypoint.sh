#!/bin/sh
set -e

echo "🔍 Checking directories and database..."

# Create directories if they don't exist
mkdir -p /app/prisma
mkdir -p /app/temp

# Check if database exists
if [ ! -f /app/prisma/dev.db ]; then
  echo "📦 Database not found, creating..."
  cd /app
  npx prisma migrate deploy
  echo "✅ Database created and migrations applied"
else
  echo "✅ Database exists"
  # Run migrations in case there are new ones
  cd /app
  npx prisma migrate deploy
  echo "✅ Migrations checked"
fi

echo "🚀 Starting application..."
exec node server.js
