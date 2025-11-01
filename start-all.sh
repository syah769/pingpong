#!/bin/bash

# Start All Services for KRKL Tournament
# =======================================

echo "🚀 Starting KRKL Tournament Services..."
echo ""

# Check if required processes are running
check_service() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo "✅ Service running on port $1"
        return 0
    else
        echo "❌ No service on port $1"
        return 1
    fi
}

# 1. Check PHP API Server (port 8001)
echo "Checking PHP API Server (port 8001)..."
if ! check_service 8001; then
    echo "Starting PHP server..."
    cd krkl-tournament
    php -S localhost:8001 server.php > /dev/null 2>&1 &
    sleep 2
    cd ..
fi
echo ""

# 2. Check WebSocket Server (port 4000)
echo "Checking WebSocket Server (port 4000)..."
if ! check_service 4000; then
    echo "Starting WebSocket server..."
    node websocket-server.js > websocket.log 2>&1 &
    sleep 2
fi
echo ""

# 3. Start ngrok tunnel (foreground)
echo "Starting ngrok tunnel..."
echo "URL: https://pingpong-lfsa.ngrok.dev"
echo ""
echo "Press Ctrl+C to stop"
echo "=================================="
ngrok http --url=pingpong-lfsa.ngrok.dev 4000 --host-header=rewrite
