#!/bin/bash

# AINative Studio Development Stop Script

echo "🛑 Stopping AINative Studio Development Environment..."

# Kill watch processes
echo "   Stopping watch processes..."
pkill -f "npm run watch" 2>/dev/null || true
pkill -f "gulp watch" 2>/dev/null || true
pkill -f "npm-run-all" 2>/dev/null || true

# Kill electron processes
echo "   Stopping application..."
pkill -f "electron.*code-oss-dev" 2>/dev/null || true
pkill -f "node.*electron" 2>/dev/null || true

# Wait a moment for processes to terminate
sleep 2

# Check if any processes are still running
REMAINING=$(ps aux | grep -E "(npm run watch|gulp watch|electron.*code-oss-dev)" | grep -v grep | wc -l)

if [ $REMAINING -gt 0 ]; then
    echo "⚠️  Some processes may still be running. Force killing..."
    pkill -9 -f "npm run watch" 2>/dev/null || true
    pkill -9 -f "gulp watch" 2>/dev/null || true
    pkill -9 -f "electron.*code-oss-dev" 2>/dev/null || true
fi

echo "✅ All development processes stopped"