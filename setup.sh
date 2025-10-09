#!/bin/bash
# Complete setup script for Blog Editor

echo "=========================================="
echo "🚀 Blog Editor Setup"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed!"
    echo "Install it with: brew install node"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Kill any conflicting servers
echo ""
echo "🛑 Stopping conflicting servers..."
pkill -f "python.*http.server" 2>/dev/null || true
pkill -f "python.*8000" 2>/dev/null || true

# Check if Node.js server is running
if lsof -i :8000 > /dev/null 2>&1; then
    echo "⚠️  Port 8000 is in use. Stopping existing Node.js server..."
    pkill -f "node.*admin/server" 2>/dev/null || true
    sleep 1
fi

echo ""
echo "✅ Starting Node.js server..."
echo ""

# Start server in background
cd "$(dirname "$0")"
node admin/server.js &

# Wait for server to start
sleep 2

echo ""
echo "=========================================="
echo "🎉 SETUP COMPLETE!"
echo "=========================================="
echo ""
echo "🌐 Server running at: http://localhost:8000"
echo "📝 Editor: http://localhost:8000/admin/index.html"
echo "🔧 Diagnostic: http://localhost:8000/diagnostic.html"
echo ""
echo "💡 To test if it's working:"
echo "   1. Open: http://localhost:8000/diagnostic.html"
echo "   2. Click 'Test API' - should show SUCCESS"
echo "   3. Open: http://localhost:8000/admin/index.html"
echo "   4. Click 'Save to DB' - should work automatically!"
echo ""
echo "⚠️  Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

# Wait for Ctrl+C
trap 'echo ""; echo "🛑 Server stopped. Goodbye!"; exit 0' INT
wait
