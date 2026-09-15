"""Local dev server with Cross-Origin-Isolation headers.
Required so ONNX Runtime Web can use multi-threaded WASM (all CPU cores).
Run:  python serve.py   then open http://localhost:8000/demucs-web.html
"""
import http.server
import os

os.chdir(os.path.dirname(os.path.abspath(__file__)))


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        super().end_headers()


if __name__ == "__main__":
    port = 8000
    print(f"Serving on http://localhost:{port}/demucs-web.html (with COI headers)")
    http.server.ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()
