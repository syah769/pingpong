#!/bin/bash

# KRKL Tournament Public Display Launcher
# This script starts a local server for the public display

echo "🏆 KRKL Tournament 2025 - Public Display Launcher"
echo "=================================================="

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Error: Python 3 is not installed"
    echo "Please install Python 3 to run the public display"
    exit 1
fi

# Check if the public display file exists
if [ ! -f "public-display.html" ]; then
    echo "❌ Error: public-display.html not found"
    echo "Please ensure the file exists in the current directory"
    exit 1
fi

# Determine available port
PORT=8080
while lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null ; do
    echo "⚠️  Port $PORT is in use, trying next port..."
    PORT=$((PORT + 1))
done

echo "🚀 Starting public display server on port $PORT..."
echo "📺 Display will be available at: http://localhost:$PORT/public-display.html"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=================================================="

# Start the server
python3 -m http.server $PORT --bind 127.0.0.1