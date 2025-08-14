# Shugur Network - Centralized Dashboard Implementation

## Overview
The centralized dashboard provides real-time monitoring of all distributed Shugur relay nodes from a single interface. Unlike individual relay dashboards, this system aggregates data from multiple nodes to provide network-wide visibility.

## Architecture

### Components
1. **Centralized Dashboard HTML** (`centralized-dashboard.html`)
   - Modern, responsive design with Tailwind CSS
   - Real-time network statistics display
   - Individual node status monitoring
   - Global health indicators

2. **Enhanced JavaScript Engine** (`network-dashboard-fixed.js`)
   - Multi-relay data fetching with concurrent requests
   - Real-time UI updates every 30 seconds
   - Error handling and fallback mechanisms
   - Interactive features (copy-to-clipboard URLs)

3. **Enhanced CORS Proxy** (`cors-proxy-enhanced.py`)
   - Multi-endpoint support for distributed relays
   - Batch request processing for efficiency
   - Caching layer to reduce API load
   - Security whitelist for allowed relay hosts

## Key Features

### Network Overview
- **Total Connections**: Aggregated across all relay nodes
- **Total Messages**: Combined message processing statistics  
- **Total Events**: Distributed event storage metrics
- **Network Health**: Real-time percentage based on online nodes

### Individual Node Monitoring
- **Status Indicators**: Real-time green/red status dots
- **Regional Distribution**: US-East, US-West, EU-Central, Asia-Pacific
- **Performance Metrics**: Connections, events, uptime per node
- **Quick Access**: Click-to-copy relay URLs

### Advanced Capabilities
- **Automatic Failover**: Falls back to individual node polling if batch fails
- **Visual Feedback**: Loading states, error handling, success indicators
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Real-time Updates**: 30-second refresh cycle with manual refresh option

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 Centralized Dashboard                        │
│                    (shugur.net)                             │
└─────────────────────┬───────────────────────────────────────┘
                      │
              ┌───────┴───────┐
              │  CORS Proxy   │
              │ (Port 8003)   │
              └─┬─┬─┬─┬───────┘
                │ │ │ │
     ┌──────────┘ │ │ └──────────┐
     │  ┌─────────┘ └─────────┐  │
     │  │                   │  │
     ▼  ▼                   ▼  ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│  shu01  │ │  shu02  │ │  shu03  │ │  shu04  │
│US-East-1│ │US-West-1│ │EU-Cent-1│ │Asia-Pac1│
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

## API Endpoints

### Enhanced CORS Proxy (Port 8003)
- `GET /proxy/{relay-host}` - Single relay data
- `GET /batch-proxy` - All relays in parallel
- `GET /api/network-stats` - Aggregated network statistics

### Dashboard Server (Port 8002)
- `GET /centralized-dashboard.html` - Main dashboard interface
- `GET /network-dashboard-fixed.js` - JavaScript engine
- Static assets (CSS, images, etc.)

## Configuration

### Relay Nodes Configuration
```javascript
relayNodes: [
    { id: 'shu01', host: 'shu01.shugur.net', region: 'US-East-1' },
    { id: 'shu02', host: 'shu02.shugur.net', region: 'US-West-1' },
    { id: 'shu03', host: 'shu03.shugur.net', region: 'EU-Central-1' },
    { id: 'shu04', host: 'shu04.shugur.net', region: 'Asia-Pacific-1' }
]
```

### Security Features
- Whitelisted relay hosts only
- CORS protection with allowed origins
- Request timeouts and error handling
- Secure header validation

## Usage Instructions

### Development Environment
1. Start the dashboard server: `python3 -m http.server 8002`
2. Start the CORS proxy: `python3 cors-proxy-enhanced.py`
3. Open dashboard: `http://localhost:8002/centralized-dashboard.html`

### Production Deployment
1. Deploy dashboard files to web server
2. Configure CORS proxy with production relay URLs
3. Update DNS to point shugur.net to dashboard server
4. Enable HTTPS with SSL certificates

## Network Statistics

The dashboard displays real-time metrics including:
- **Connections**: Active WebSocket connections across all nodes
- **Messages**: Total messages processed by the network
- **Events**: Events stored in distributed CockroachDB
- **Health**: Percentage of online nodes (100% = all nodes operational)

## Monitoring Capabilities

### Health Indicators
- 🟢 Green: 75%+ nodes online (healthy)
- 🟡 Yellow: 50-74% nodes online (degraded)
- 🔴 Red: <50% nodes online (critical)

### Real-time Features
- Auto-refresh every 30 seconds
- Manual refresh button with loading states
- Error handling with fallback data sources
- Copy-to-clipboard relay URLs

## Technical Specifications

### Frontend Stack
- HTML5 with semantic markup
- Tailwind CSS for responsive design
- Vanilla JavaScript (no dependencies)
- Modern browser APIs (Fetch, Clipboard)

### Backend Integration
- Python HTTP proxy server
- Concurrent request processing
- JSON API responses
- Error handling and logging

### Data Flow
1. Dashboard loads and initializes JavaScript
2. JavaScript requests network stats from proxy
3. Proxy fetches data from all relay nodes concurrently
4. Aggregated data returned to dashboard
5. UI updates with real-time statistics
6. Process repeats every 30 seconds

## Maintenance

### Monitoring
- Check proxy logs for connection issues
- Monitor dashboard loading times
- Verify all relay nodes are responding
- Review network health percentage trends

### Updates
- Add new relay nodes to configuration arrays
- Update region mappings as network expands
- Modify health thresholds based on requirements
- Enhance UI features based on user feedback

## Summary

This centralized dashboard implementation provides comprehensive monitoring of the Shugur distributed relay network. It combines real-time data aggregation, responsive design, and robust error handling to deliver a professional monitoring solution that scales with the network's growth.

The system is designed to be:
- **Centralized**: Single dashboard for all relay nodes
- **Real-time**: Live updates every 30 seconds
- **Resilient**: Fallback mechanisms for reliability
- **User-friendly**: Intuitive interface with visual indicators
- **Scalable**: Easy to add new relay nodes
- **Secure**: Whitelisted endpoints and CORS protection
