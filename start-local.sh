#!/bin/bash

# Start the Amsterdam Street Art Map development server
echo "🚀 Starting Amsterdam Street Art Map..."

# Kill any existing processes on port 3000
echo "🔪 Killing any existing processes on port 3000..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Start the Vite development server
echo "⚡ Starting Vite development server..."
npm run dev

echo "✅ Server should be running at http://localhost:5173"
