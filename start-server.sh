#!/bin/bash

# Simple development server for shugur.net
echo "Starting Shugur Relay Network Dashboard..."
echo "Dashboard will be available at: http://localhost:8000"
echo "Press Ctrl+C to stop the server"
echo ""

cd "$(dirname "$0")"
python3 -m http.server 8000
