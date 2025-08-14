#!/bin/bash

# Shugur.net Dashboard Deployment Script
# This script helps deploy the dashboard to various hosting platforms

set -e

echo "🚀 Shugur Relay Network Dashboard Deployment"
echo "=============================================="
echo ""

# Function to deploy with Docker
deploy_docker() {
    echo "📦 Building and starting Docker container..."
    
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is not installed. Please install Docker first."
        exit 1
    fi
    
    # Build and run with docker-compose
    if [ -f "docker-compose.yml" ]; then
        docker-compose down 2>/dev/null || true
        docker-compose up -d --build
        echo "✅ Dashboard deployed with Docker at http://localhost:8000"
    else
        # Fallback to direct docker commands
        docker build -t shugur-dashboard .
        docker stop shugur-dashboard 2>/dev/null || true
        docker rm shugur-dashboard 2>/dev/null || true
        docker run -d -p 8000:80 --name shugur-dashboard shugur-dashboard
        echo "✅ Dashboard deployed with Docker at http://localhost:8000"
    fi
}

# Function to deploy to static hosting
deploy_static() {
    echo "📁 Preparing static files for deployment..."
    
    # Create deployment directory
    mkdir -p dist
    
    # Copy all necessary files
    cp index.html dist/
    cp favicon.ico dist/ 2>/dev/null || echo "⚠️  favicon.ico not found, skipping..."
    cp -r shugur-*.svg dist/ 2>/dev/null || echo "⚠️  SVG files not found, skipping..."
    
    echo "✅ Static files prepared in ./dist/"
    echo "📤 Upload the contents of ./dist/ to your hosting provider"
    echo ""
    echo "Popular hosting options:"
    echo "  • Netlify: drag & drop the dist folder to netlify.com"
    echo "  • Vercel: connect your GitHub repo to vercel.com"
    echo "  • GitHub Pages: push to gh-pages branch"
    echo "  • Cloudflare Pages: connect repo to pages.cloudflare.com"
}

# Function to start development server
start_dev() {
    echo "🔧 Starting development server..."
    
    # Find available port
    PORT=8001
    while netstat -an | grep ":$PORT " > /dev/null 2>&1; do
        PORT=$((PORT + 1))
    done
    
    echo "🌐 Starting server on port $PORT..."
    echo "🔗 Dashboard available at: http://localhost:$PORT"
    echo "⏹️  Press Ctrl+C to stop the server"
    echo ""
    
    python3 -m http.server $PORT
}

# Function to check domain configuration
check_domain() {
    echo "🔍 Checking domain configuration for shugur.net..."
    
    # Check if domain resolves
    if nslookup shugur.net > /dev/null 2>&1; then
        echo "✅ shugur.net resolves to:"
        nslookup shugur.net | grep "Address:" | tail -n +2
    else
        echo "❌ shugur.net does not resolve"
        echo "💡 You need to configure DNS records for shugur.net"
    fi
    
    # Check if domain is accessible
    echo ""
    echo "🌐 Testing HTTP connection..."
    if curl -s -o /dev/null -w "%{http_code}" http://shugur.net | grep -q "200\|301\|302"; then
        echo "✅ shugur.net is accessible"
    else
        echo "❌ shugur.net is not accessible or returns error"
    fi
}

# Main menu
echo "Please choose a deployment option:"
echo ""
echo "1) 🔧 Start development server (local testing)"
echo "2) 📦 Deploy with Docker (local production)"
echo "3) 📁 Prepare static files for hosting"
echo "4) 🔍 Check shugur.net domain status"
echo "5) ❌ Exit"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        start_dev
        ;;
    2)
        deploy_docker
        ;;
    3)
        deploy_static
        ;;
    4)
        check_domain
        ;;
    5)
        echo "👋 Goodbye!"
        exit 0
        ;;
    *)
        echo "❌ Invalid choice. Please run the script again."
        exit 1
        ;;
esac
