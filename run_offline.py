#!/usr/bin/env python3
"""run_offline.py - Standalone 1-click offline launcher for ManipTrain.
Serves the production build locally and launches the default browser.
"""
import os, sys, webbrowser, functools
from http.server import HTTPServer, SimpleHTTPRequestHandler

PORT = 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(BASE_DIR, "dist")

if not os.path.exists(DIST_DIR):
    print(f"Error: Production build folder not found at {DIST_DIR}")
    print("Please run: npm run build")
    sys.exit(1)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Suppress request spam

def main():
    handler = functools.partial(QuietHandler, directory=DIST_DIR)
    url = f"http://localhost:{PORT}"
    print("=" * 65)
    print(" 🦾  MANIPTRAIN: OFFLINE TELEOPERATION SIMULATOR")
    print("=" * 65)
    print(f"Serving offline production build from: {DIST_DIR}")
    print(f"Opening browser at: {url}")
    print("Press Ctrl+C to stop the offline simulator server.")
    print("=" * 65)
    
    webbrowser.open(url)
    try:
        httpd = HTTPServer(("127.0.0.1", PORT), handler)
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nSimulator server stopped.")
    except Exception as e:
        print(f"\nServer error: {e}")

if __name__ == "__main__":
    main()
