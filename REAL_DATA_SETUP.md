# Real Data Integration Guide

This guide explains how to connect your Shugur.net dashboard to real relay data.

## 🎯 **What You Need to Do**

### 1. **Enable CORS on Your Relay**

The dashboard needs to fetch data from your relay APIs. You'll need to update your relay's web handler to allow CORS requests.

**Add to `internal/web/handler.go`:**

```go
// Add CORS middleware
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("Access-Control-Allow-Origin", "*") // Or specify your domain
        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
        
        if r.Method == "OPTIONS" {
            w.WriteHeader(http.StatusOK)
            return
        }
        
        next.ServeHTTP(w, r)
    })
}
```

### 2. **Available Real Data Endpoints**

Your relay already provides these endpoints:

#### **Stats API**: `/api/stats`
Returns real-time statistics:
```json
{
  "stats": {
    "active_connections": 142,
    "messages_processed": 1247,
    "events_stored": 2100000
  },
  "uptime": "2d 14h 32m"
}
```

#### **Cluster API**: `/api/cluster`
Returns cluster information:
```json
{
  "is_cluster": true,
  "nodes": [
    {
      "node_id": 1,
      "address": "shu01.shugur.net:26257",
      "is_live": true,
      "is_available": true
    }
  ]
}
```

#### **NIP-11 Endpoint**: `/`
Standard Nostr relay information:
```json
{
  "name": "shugur-relay",
  "description": "High-performance Nostr relay",
  "software": "shugur",
  "version": "2.0.0",
  "supported_nips": [1, 2, 3, 4, 9, 11, ...],
  "limitation": {
    "max_message_length": 2048,
    "max_subscriptions": 100
  }
}
```

#### **Prometheus Metrics**: `:2112/metrics`
Detailed performance metrics:
```
nostr_relay_active_connections 142
nostr_relay_events_processed_total{kind="1"} 1247
nostr_relay_messages_received_total 5678
```

### 3. **Connect Dashboard to Your Relay**

#### **Option A: Same Domain (Recommended)**

Deploy the dashboard on the same domain as your relay:
- **Relay**: `relay.shugur.net:8080` (WebSocket + API)
- **Dashboard**: `shugur.net` (Static files)

The dashboard will automatically connect to the APIs.

#### **Option B: Different Domains**

If deploying on different domains, update the API endpoints in `dashboard.js`:

```javascript
constructor() {
    this.endpoints = {
        stats: 'https://relay.shugur.net/api/stats',
        cluster: 'https://relay.shugur.net/api/cluster',
        health: 'https://relay.shugur.net/api/cluster?type=health',
        metrics: 'https://relay.shugur.net:2112/metrics',
        relayInfo: 'https://relay.shugur.net/'
    };
}
```

### 4. **Deploy Configuration**

#### **For Production**:

1. **Build your relay** with the web dashboard enabled
2. **Configure reverse proxy** (nginx/caddy) to serve:
   - WebSocket: `wss://relay.shugur.net` → `:8080`
   - API endpoints: `https://relay.shugur.net/api/*` → `:8080`
   - Static dashboard: `https://shugur.net` → static files

3. **Sample nginx config**:
```nginx
# Dashboard (shugur.net)
server {
    server_name shugur.net;
    location / {
        root /path/to/shugur-net;
        index index.html;
    }
}

# Relay APIs (relay.shugur.net)
server {
    server_name relay.shugur.net;
    
    # WebSocket upgrade
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:8080;
        add_header Access-Control-Allow-Origin *;
    }
}
```

## 🔧 **Development Testing**

### 1. **Start Your Relay**
```bash
cd /home/ubuntu/shugur/relay
./bin/relay start --config config.yaml
```

### 2. **Test APIs**
```bash
# Test stats API
curl http://localhost:8080/api/stats

# Test NIP-11
curl -H "Accept: application/nostr+json" http://localhost:8080/

# Test metrics
curl http://localhost:2112/metrics
```

### 3. **Test Dashboard**
```bash
cd shugur-net
python3 -m http.server 8001
```

Visit: http://localhost:8001

## 📊 **Real Data Features**

Once connected, your dashboard will show:

### **Live Metrics**
- ✅ **Active WebSocket Connections**: Real count from relay
- ✅ **Events Processed**: Actual message throughput
- ✅ **Events Stored**: Total events in CockroachDB
- ✅ **Response Times**: Real latency measurements
- ✅ **Uptime**: Actual relay uptime

### **Event Breakdown**
- ✅ **Kind 1 (Notes)**: Real note counts
- ✅ **Kind 3 (Contacts)**: Contact list updates
- ✅ **Kind 4 (DMs)**: Direct message counts
- ✅ **Kind 7 (Reactions)**: Reaction events
- ✅ **Other Kinds**: Custom event types

### **Cluster Status**
- ✅ **Node Health**: CockroachDB cluster status
- ✅ **Database Sync**: Replication status
- ✅ **Geographic Distribution**: Real node locations

### **NIPs Support**
- ✅ **Dynamic List**: Updates from relay configuration
- ✅ **Version Info**: Real software version
- ✅ **Capabilities**: Actual relay limitations

## 🚨 **Troubleshooting**

### **Common Issues**

1. **CORS Errors**
   - Add CORS headers to relay
   - Deploy on same domain

2. **API Not Found (404)**
   - Verify relay has web handlers enabled
   - Check API endpoint paths

3. **Connection Refused**
   - Ensure relay is running
   - Check firewall/port access

4. **Stale Data**
   - Verify auto-refresh is working
   - Check browser console for errors

### **Debug Mode**

Enable debug logging in `dashboard.js`:
```javascript
// Add to constructor
this.debug = true;

// Logs will show API calls and responses
```

## 🎉 **Result**

Once configured, your dashboard will display:
- **Real-time data** from your actual relay infrastructure
- **Live updates** every 30 seconds
- **Accurate metrics** from Prometheus
- **Cluster health** from CockroachDB
- **True performance** statistics

Your visitors will see the actual state of your Nostr relay network, building trust and transparency in your infrastructure.
