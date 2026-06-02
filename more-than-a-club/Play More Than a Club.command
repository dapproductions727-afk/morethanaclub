#!/bin/bash
# Double-click this to play. It starts a tiny local web server and opens the game.
cd "$(dirname "$0")/play" || exit 1
PORT=8731
# Open the browser after a short delay, then start the server in the foreground.
( sleep 1; open "http://localhost:${PORT}/" ) &
echo ""
echo "  MORE THAN A CLUB is running."
echo "  Your browser should open automatically."
echo "  If not, go to:  http://localhost:${PORT}/"
echo ""
echo "  Keep this window open while you play."
echo "  Close it (or press Control-C) to stop the game."
echo ""
# Python 3 ships with macOS; fall back to python if needed.
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server ${PORT}
else
  python -m SimpleHTTPServer ${PORT}
fi
