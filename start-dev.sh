#!/bin/bash

# Amsterdam Street Art Map - Development Startup Script
echo "🎨 Starting Amsterdam Street Art Map Development Environment"
echo "=========================================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd server && npm install && cd ..
fi

echo ""
echo "🚀 Starting both frontend and backend servers..."
echo ""
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo "Test Page: http://localhost:3000/token-test"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "=========================================================="

# Start both servers concurrently
npm run dev:all