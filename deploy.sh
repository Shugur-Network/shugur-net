#!/bin/bash

# Shugur Network Dashboard Deployment Script
# This script builds and deploys the dashboard to Netlify

set -e

echo "🚀 Starting Shugur Network Dashboard deployment..."

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run build
echo "🔨 Building dashboard..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not created"
    exit 1
fi

echo "✅ Build completed successfully!"

# Check if Netlify CLI is installed
if command -v netlify &> /dev/null; then
    echo "🌐 Deploying to Netlify..."
    netlify deploy --prod --dir dist
    echo "✅ Deployment completed!"
else
    echo "⚠️  Netlify CLI not found. Please install it to deploy automatically:"
    echo "   npm install -g netlify-cli"
    echo "   then run: netlify deploy --prod --dir dist"
fi

echo "🎉 Dashboard is ready!"
echo "📁 Built files are in the 'dist' directory"
