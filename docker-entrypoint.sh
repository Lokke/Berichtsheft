#!/bin/sh
set -e

echo "🔍 Checking database..."

# Ensure prisma directory exists and has correct permissions
mkdir -p /app/prisma
chmod 755 /app/prisma

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
