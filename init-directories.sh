#!/bin/bash
set -e

echo "📁 Initializing directories..."

# Create data directory if it doesn't exist
if [ ! -d "./data" ]; then
    echo "Creating ./data directory..."
    mkdir -p ./data
fi

# Create temp directory if it doesn't exist
if [ ! -d "./temp" ]; then
    echo "Creating ./temp directory..."
    mkdir -p ./temp
fi

# Set permissions for nextjs user (UID 1001)
echo "Setting permissions..."
chmod -R 755 ./data
chmod -R 755 ./temp

# If running as root, change ownership
if [ "$(id -u)" = "0" ]; then
    echo "Setting ownership to UID 1001 (nextjs user)..."
    chown -R 1001:1001 ./data
    chown -R 1001:1001 ./temp
fi

echo "✅ Directories initialized successfully"
