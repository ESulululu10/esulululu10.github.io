"""Static preview server that never lets the browser cache.

Python's http.server sends Last-Modified with no cache directives, so
browsers apply heuristic caching and keep serving stale HTML and CSS
while you are editing. That made edits look like they had not landed.
"""
import http.server
import socketserver
import sys


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", port), NoCacheHandler) as httpd:
        print(f"serving on http://localhost:{port} with caching disabled")
        httpd.serve_forever()
