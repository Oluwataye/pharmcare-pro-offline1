#!/bin/bash
PORT=3100
echo "Stopping PharmCare Pro on port $PORT..."

PID=$(lsof -Pi :$PORT -sTCP:LISTEN -t)

if [ -n "$PID" ]; then
    kill -9 $PID
    echo "[✓] PharmCare Pro (PID $PID) stopped successfully."
else
    echo "[!] WARNING: PharmCare Pro was not found running on port $PORT."
fi
