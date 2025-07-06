#!/bin/bash

# AINative Studio Development Start Script
set -e

echo "🚀 Starting AINative Studio Development Environment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the ainative-studio directory"
    exit 1
fi

# Function to cleanup processes on exit
cleanup() {
    echo "🛑 Stopping development processes..."
    # Kill watch processes
    pkill -f "npm run watch" 2>/dev/null || true
    pkill -f "gulp watch" 2>/dev/null || true
    # Kill electron processes
    pkill -f "electron" 2>/dev/null || true
    echo "✅ Cleanup complete"
}

# Set up cleanup on script exit
trap cleanup EXIT INT TERM

# Start watch build in background
echo "📦 Starting watch build..."
npm run watch &
WATCH_PID=$!

# Wait for initial compilation to complete
echo "⏳ Waiting for initial compilation..."
sleep 10

# Check if React components need building
if [ ! -d "src/vs/workbench/contrib/void/browser/react/out" ]; then
    echo "⚛️  Building React components..."
    npm run buildreact
fi

# Wait a bit more for main.js to be created
echo "⏳ Waiting for main.js compilation..."
while [ ! -f "out/main.js" ]; do
    sleep 5
    echo "   Still waiting for main.js..."
done

echo "🎉 Build complete! Starting application..."
sleep 2

# Start the application
./scripts/code.sh

# Keep the script running
wait $WATCH_PID