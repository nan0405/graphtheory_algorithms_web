#!/bin/bash

echo "========================================"
echo "🎓 Algorithm Visualizer System Startup"
echo "========================================"
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+"
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"
echo ""

# Install dependencies
echo "📦 Installing Python dependencies..."
cd backend/
pip install -r requirements.txt --quiet
if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi
echo ""

# Start backend
echo "🚀 Starting Backend Server..."
echo "   URL: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo ""
python3 main.py &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"
echo ""

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 3
echo ""

# Start frontend
echo "🌐 Starting Frontend Server..."
cd ../frontend/
echo "   Admin Interface: http://localhost:8080/admin.html"
echo "   Visualizer: http://localhost:8080/visualizer.html"
echo ""
python3 -m http.server 8080 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"
echo ""

echo "========================================"
echo "✨ System Ready!"
echo "========================================"
echo ""
echo "🧑‍🏫 For Teachers:"
echo "   1. Open: http://localhost:8080/admin.html"
echo "   2. Write your pseudocode"
echo "   3. Click 'Tạo Visualization'"
echo "   4. Open: http://localhost:8080/visualizer.html"
echo "   5. Upload the generated JSON"
echo ""
echo "📚 Examples available in /examples folder"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "========================================"
echo ""

# Wait for Ctrl+C
trap "echo ''; echo '🛑 Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID; echo '✅ All servers stopped'; exit 0" INT

# Keep script running
wait