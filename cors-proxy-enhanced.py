#!/usr/bin/env python3
"""
Enhanced CORS proxy server for Shugur distributed relay network.
Handles requests to multiple relay nodes and provides batch endpoints.
"""

import http.server
import socketserver
import urllib.request
import urllib.parse
from urllib.error import HTTPError, URLError
import json
import time
import concurrent.futures
from threading import Lock

PORT = 8003

# Allowed relay endpoints for security
ALLOWED_RELAYS = [
    'shu01.shugur.net',
    'shu02.shugur.net', 
    'shu03.shugur.net',
    'shu04.shugur.net',
    'relay.shugur.net',
    'backup.shugur.net',
    'localhost:8080'  # For development
]

# Cache for relay data to reduce requests
cache_lock = Lock()
relay_cache = {}
CACHE_DURATION = 30  # seconds

class CORSProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        # Extract the target URL from the path
        if self.path.startswith('/proxy/'):
            target_url = self.path[7:]  # Remove '/proxy/' prefix
            self.handle_single_proxy(target_url)
            
        elif self.path == '/batch-proxy':
            # Handle batch requests for multiple relays
            self.handle_batch_request()
            
        elif self.path == '/api/network-stats':
            # Aggregated network statistics
            self.handle_network_stats()
            
        else:
            self.send_error(400, "Invalid proxy path. Use /proxy/target-url, /batch-proxy, or /api/network-stats")
    
    def handle_single_proxy(self, target_url):
        """Handle single relay proxy request"""
        # Add protocol if missing
        if not target_url.startswith(('http://', 'https://')):
            target_url = 'https://' + target_url
        
        # Security check - only allow whitelisted relay endpoints
        parsed_url = urllib.parse.urlparse(target_url)
        host_port = parsed_url.netloc
        
        if not any(allowed in host_port for allowed in ALLOWED_RELAYS):
            print(f"[{time.strftime('%H:%M:%S')}] Blocked request to unauthorized host: {host_port}")
            self.send_error(403, f"Access to {host_port} is not allowed")
            return
        
        try:
            # Check cache first
            cache_key = target_url
            with cache_lock:
                if cache_key in relay_cache:
                    cached_data, cached_time = relay_cache[cache_key]
                    if time.time() - cached_time < CACHE_DURATION:
                        self.send_cached_response(cached_data)
                        return
            
            # Create request with proper headers
            req = urllib.request.Request(target_url)
            req.add_header('User-Agent', 'Shugur-Dashboard/1.0')
            req.add_header('Accept', 'application/json')
            
            print(f"[{time.strftime('%H:%M:%S')}] Proxying request to: {target_url}")
            
            # Make the request
            with urllib.request.urlopen(req, timeout=10) as response:
                data = response.read()
                content_type = response.getheader('Content-Type', 'application/json')
                
                # Cache the response
                with cache_lock:
                    relay_cache[cache_key] = (data, time.time())
                
                # Send response with CORS headers
                self.send_response(200)
                self.send_header('Access-Control-Allow-Origin', '*')
                self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
                self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
                self.send_header('Content-Type', content_type)
                self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
                self.end_headers()
                
                self.wfile.write(data)
                print(f"[{time.strftime('%H:%M:%S')}] Successfully proxied {len(data)} bytes from {parsed_url.netloc}")
                
        except HTTPError as e:
            print(f"[{time.strftime('%H:%M:%S')}] HTTP Error {e.code}: {e.reason} for {target_url}")
            self.send_error(e.code, f"Target server error: {e.reason}")
        except URLError as e:
            print(f"[{time.strftime('%H:%M:%S')}] URL Error: {e.reason} for {target_url}")
            self.send_error(502, f"Bad Gateway: {e.reason}")
        except Exception as e:
            print(f"[{time.strftime('%H:%M:%S')}] General Error: {str(e)} for {target_url}")
            self.send_error(500, f"Internal Server Error: {str(e)}")
    
    def send_cached_response(self, cached_data):
        """Send cached response"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Type', 'application/json')
        self.send_header('X-Cache', 'HIT')
        self.end_headers()
        self.wfile.write(cached_data)
    
    def handle_batch_request(self):
        """Handle requests to multiple relay endpoints simultaneously"""
        results = {}
        
        def fetch_relay_data(relay):
            if relay == 'localhost:8080':  # Skip localhost in production
                return relay, None
                
            target_url = f"https://{relay}"
            try:
                req = urllib.request.Request(target_url)
                req.add_header('User-Agent', 'Shugur-Dashboard/1.0')
                req.add_header('Accept', 'application/json')
                
                with urllib.request.urlopen(req, timeout=5) as response:
                    data = response.read()
                    return relay, {
                        'status': 'success',
                        'data': json.loads(data.decode('utf-8')),
                        'timestamp': int(time.time()),
                        'response_time': 0.1  # Placeholder
                    }
                    
            except Exception as e:
                return relay, {
                    'status': 'error',
                    'error': str(e),
                    'timestamp': int(time.time())
                }
        
        # Use ThreadPoolExecutor for concurrent requests
        with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
            main_relays = [r for r in ALLOWED_RELAYS[:4] if r != 'localhost:8080']
            future_to_relay = {executor.submit(fetch_relay_data, relay): relay for relay in main_relays}
            
            for future in concurrent.futures.as_completed(future_to_relay):
                relay, result = future.result()
                if result:
                    results[relay] = result
        
        # Send batch response
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.end_headers()
        
        response_data = json.dumps(results, indent=2)
        self.wfile.write(response_data.encode('utf-8'))
        print(f"[{time.strftime('%H:%M:%S')}] Batch request completed for {len(results)} relays")
    
    def handle_network_stats(self):
        """Provide aggregated network statistics"""
        try:
            # Fetch data from all relays
            total_connections = 0
            total_messages = 0
            total_events = 0
            online_nodes = 0
            node_details = []
            
            def fetch_node_stats(relay):
                try:
                    target_url = f"https://{relay}/api/stats"
                    req = urllib.request.Request(target_url)
                    req.add_header('Accept', 'application/json')
                    
                    with urllib.request.urlopen(req, timeout=3) as response:
                        data = json.loads(response.read().decode('utf-8'))
                        return relay, data
                except:
                    return relay, None
            
            # Fetch stats from main relays
            main_relays = [r for r in ALLOWED_RELAYS[:4] if r != 'localhost:8080']
            
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
                future_to_relay = {executor.submit(fetch_node_stats, relay): relay for relay in main_relays}
                
                for future in concurrent.futures.as_completed(future_to_relay):
                    relay, stats = future.result()
                    if stats:
                        online_nodes += 1
                        total_connections += stats.get('connections', 0)
                        total_messages += stats.get('messages_received', 0)
                        total_events += stats.get('events_stored', 0)
                        
                        node_details.append({
                            'node': relay,
                            'status': 'online',
                            'connections': stats.get('connections', 0),
                            'messages': stats.get('messages_received', 0),
                            'events': stats.get('events_stored', 0),
                            'uptime': stats.get('uptime_seconds', 0)
                        })
                    else:
                        node_details.append({
                            'node': relay,
                            'status': 'offline',
                            'connections': 0,
                            'messages': 0,
                            'events': 0,
                            'uptime': 0
                        })
            
            # Calculate network health percentage
            health_percentage = int((online_nodes / len(main_relays)) * 100) if main_relays else 0
            
            network_stats = {
                'network': {
                    'total_connections': total_connections,
                    'total_messages': total_messages,
                    'total_events': total_events,
                    'online_nodes': online_nodes,
                    'total_nodes': len(main_relays),
                    'health_percentage': health_percentage,
                    'last_updated': int(time.time())
                },
                'nodes': node_details
            }
            
            # Send response
            self.send_response(200)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            
            response_data = json.dumps(network_stats, indent=2)
            self.wfile.write(response_data.encode('utf-8'))
            
        except Exception as e:
            error_response = json.dumps({'error': str(e), 'timestamp': int(time.time())})
            self.send_response(500)
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(error_response.encode('utf-8'))
    
    def do_OPTIONS(self):
        # Handle preflight requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
    
    def log_message(self, format, *args):
        # Custom logging format
        timestamp = time.strftime('%H:%M:%S')
        print(f"[{timestamp}] {format % args}")

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    pass

if __name__ == "__main__":
    handler = CORSProxyHandler
    httpd = ThreadedHTTPServer(("", PORT), handler)
    
    print(f"🚀 Enhanced CORS Proxy server starting on port {PORT}")
    print("📡 Endpoints:")
    print(f"   Single relay: http://localhost:{PORT}/proxy/shu01.shugur.net")
    print(f"   Batch request: http://localhost:{PORT}/batch-proxy")
    print(f"   Network stats: http://localhost:{PORT}/api/network-stats")
    print(f"🔐 Allowed relays: {', '.join(ALLOWED_RELAYS[:4])}")
    print(f"⚡ Features: Caching, Concurrent requests, Error handling")
    print(f"⏹️  Press Ctrl+C to stop")
    print("")
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Shutting down proxy server...")
        httpd.shutdown()
