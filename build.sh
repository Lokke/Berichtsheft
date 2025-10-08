#!/bin/bash
set -e

echo "🏗️  Building Berichtsheft Application..."

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
fi

# Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npx prisma generate

# Build the application
echo "🏗️  Building Next.js application..."
npm run build

echo "✅ Build completed successfully!"
echo "You can now run ./start.sh to start the server"
