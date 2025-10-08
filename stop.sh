#!/bin/bash

PORT=${1:-9455}

echo "🛑 Stopping processes on port $PORT..."

# Try different methods to find and kill the process
# Method 1: lsof
if command -v lsof &> /dev/null; then
  PID=$(lsof -ti:$PORT)
  if [ ! -z "$PID" ]; then
    echo "Found process $PID using lsof"
    kill -9 $PID
    echo "✅ Process killed"
    exit 0
  fi
fi

# Method 2: netstat
if command -v netstat &> /dev/null; then
  PID=$(netstat -tlnp 2>/dev/null | grep ":$PORT " | awk '{print $7}' | cut -d'/' -f1)
  if [ ! -z "$PID" ]; then
    echo "Found process $PID using netstat"
    kill -9 $PID
    echo "✅ Process killed"
    exit 0
  fi
fi

# Method 3: ss
if command -v ss &> /dev/null; then
  PID=$(ss -tlnp 2>/dev/null | grep ":$PORT " | sed -n 's/.*pid=\([0-9]*\).*/\1/p')
  if [ ! -z "$PID" ]; then
    echo "Found process $PID using ss"
    kill -9 $PID
    echo "✅ Process killed"
    exit 0
  fi
fi

# Method 4: fuser (most reliable)
if command -v fuser &> /dev/null; then
  fuser -k $PORT/tcp 2>/dev/null
  if [ $? -eq 0 ]; then
    echo "✅ Process killed using fuser"
    exit 0
  fi
fi

# Check if pm2 is running
if command -v pm2 &> /dev/null; then
  pm2 delete berichtsheft 2>/dev/null && echo "✅ Stopped pm2 process" || true
fi

# Check if docker is running
if command -v docker &> /dev/null; then
  if docker ps | grep -q "9455"; then
    echo "Found Docker container on port $PORT"
    docker-compose down 2>/dev/null || docker stop $(docker ps -q --filter "publish=$PORT") 2>/dev/null
    echo "✅ Stopped Docker container"
    exit 0
  fi
fi

echo "⚠️  No process found on port $PORT"
echo "Trying to start anyway..."
