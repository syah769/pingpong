#!/bin/bash

# Start ngrok tunnels for PHP API and WebSocket
echo "Starting ngrok tunnels..."
echo "===================================="
echo "This will create 2 tunnels:"
echo "1. PHP API (port 8001)"
echo "2. WebSocket (port 4000)"
echo "===================================="
echo ""

ngrok start --all --config=ngrok.yml
