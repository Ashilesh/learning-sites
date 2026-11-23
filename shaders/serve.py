#!/usr/bin/env python3
"""Tiny static server for Shaderland with caching disabled (handy while editing).
Usage:  python3 serve.py [port]   → open http://localhost:8765
"""
import http.server
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    with http.server.ThreadingHTTPServer(("127.0.0.1", port), NoCacheHandler) as srv:
        print(f"Shaderland running at http://localhost:{port}")
        srv.serve_forever()
