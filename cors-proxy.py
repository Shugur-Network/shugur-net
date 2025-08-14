#!/usr/bin/env python3
"""
Simple proxy server to bypass CORS for development.
Proxies requests from dashboard to relay APIs.
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
import json
from http.server import HTTPServer, BaseHTTPRequestHandler

class CORSProxyHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        # Enable CORS
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        path = self.path
        
        try:
            if path == '/api/stats':
                # Proxy to relay stats API
                url = 'http://localhost:8080/api/stats'
                response = urllib.request.urlopen(url)
                data = response.read()
                self.wfile.write(data)
                
            elif path == '/api/cluster':
                # Proxy to relay cluster API
                url = 'http://localhost:8080/api/cluster'
                response = urllib.request.urlopen(url)
                data = response.read()
                self.wfile.write(data)
                
            elif path == '/relay-info':
                # Proxy to NIP-11 endpoint
                url = 'http://localhost:8080/'
                req = urllib.request.Request(url, headers={'Accept': 'application/nostr+json'})
                response = urllib.request.urlopen(req)
                data = response.read()
                self.wfile.write(data)
                
            else:
                # Default response
                self.wfile.write(b'{"error": "Endpoint not found"}')
                
        except Exception as e:
            error_response = json.dumps({"error": str(e)})
            self.wfile.write(error_response.encode())
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')
        self.end_headers()
    
    def log_message(self, format, *args):
        # Suppress default logging
        return

if __name__ == '__main__':
    PORT = 8003
    Handler = CORSProxyHandler
    
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"🔗 CORS Proxy Server running on port {PORT}")
        print(f"📊 Dashboard can now fetch real data through:")
        print(f"   Stats: http://localhost:{PORT}/api/stats")
        print(f"   Cluster: http://localhost:{PORT}/api/cluster") 
        print(f"   Relay Info: http://localhost:{PORT}/relay-info")
        print(f"⏹️  Press Ctrl+C to stop")
        print("")
        httpd.serve_forever()
