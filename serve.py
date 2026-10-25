"""Local server for the 3D home viewer.

Run: python3 serve.py   then open http://localhost:8787
Serves this folder and lets the viewer save furniture.json (PUT /furniture.json).
"""
import http.server
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))
FURNITURE = os.path.join(ROOT, "furniture.json")
PORT = 8787


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_PUT(self):
        if self.path.split("?")[0] != "/furniture.json":
            self.send_error(404)
            return
        body = self.rfile.read(int(self.headers.get("Content-Length", 0)))
        try:
            data = json.loads(body)
        except ValueError:
            self.send_error(400, "invalid JSON")
            return
        with open(FURNITURE, "w") as f:
            json.dump(data, f, indent=1)
        self.send_response(204)
        self.end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    print(f"Home viewer running at http://localhost:{PORT}")
    http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
