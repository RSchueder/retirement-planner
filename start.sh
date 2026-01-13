#!/bin/bash

# Quick start script for Retirement Planner

echo "🚀 Starting Retirement Planner..."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

# Build the Docker image
echo "📦 Building Docker image..."
docker build -t retirement-planner .

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
    echo ""
    echo "🌐 Starting the application on http://localhost:3000"
    echo "   Press Ctrl+C to stop"
    echo ""
    
    # Run the container
    docker run -p 3000:3000 \
        -v "$(pwd)":/app \
        -v /app/node_modules \
        retirement-planner
else
    echo "❌ Build failed. Please check the error messages above."
    exit 1
fi
