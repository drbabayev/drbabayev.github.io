#!/bin/bash
# Start the blog editor with automatic database updates

cd "$(dirname "$0")/.."

echo "=========================================="
echo "🚀 Starting Blog Editor Environment"
echo "=========================================="
echo ""

# Check if watchdog is installed
if ! python3 -c "import watchdog" 2>/dev/null; then
    echo "📦 Installing watchdog package..."
    echo ""
    
    # Try different installation methods
    if pip3 install --break-system-packages watchdog 2>/dev/null; then
        echo "✅ Installed successfully!"
    elif python3 -m pip install --break-system-packages watchdog 2>/dev/null; then
        echo "✅ Installed successfully!"
    else
        echo "⚠️  Could not auto-install. Please run manually:"
        echo "   pip3 install --break-system-packages watchdog"
        echo ""
        echo "   OR use without auto-update:"
        echo "   python3 -m http.server 8000"
        exit 1
    fi
    echo ""
fi

# Start the auto-update script in background
echo "🤖 Starting auto-update script..."
python3 admin/auto-update-db.py &
AUTO_UPDATE_PID=$!

# Wait a moment
sleep 1

# Start the web server
echo "🌐 Starting web server on http://localhost:8000"
echo ""
echo "✅ Ready! Open in browser:"
echo "   📝 Editor:  http://localhost:8000/admin/index.html"
echo "   🌍 Website: http://localhost:8000/"
echo ""
echo "💡 When you click 'Save to DB', the database will"
echo "   update automatically! No manual file moving needed."
echo ""
echo "⚠️  Press Ctrl+C to stop everything"
echo "=========================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $AUTO_UPDATE_PID 2>/dev/null
    echo "👋 Goodbye!"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start web server
python3 -m http.server 8000

