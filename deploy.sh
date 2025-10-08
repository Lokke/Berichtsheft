#!/bin/bash
set -e

echo "🚀 Deploying Berichtsheft Application..."

# Pull latest changes
echo "📥 Pulling latest changes from git..."
git pull

# Install/update dependencies
echo "📦 Installing dependencies..."
npm install

# Build the application
echo "🏗️  Building application..."
./build.sh

# Run migrations and seed
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

echo "🌱 Seeding training professions..."
npm run seed || echo "⚠️  Seeding failed or already seeded"

# Restart the application (if using pm2)
if command -v pm2 &> /dev/null; then
  echo "🔄 Restarting application with pm2..."
  pm2 restart berichtsheft || pm2 start npm --name "berichtsheft" -- start
  pm2 save
else
  echo "✅ Deployment completed!"
  echo "Run ./start.sh to start the server"
fi
