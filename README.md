# Shugur Infrastructure Network

Infrastructure control center and load balancer hub for shugur.net

## Overview

This is the landing page for shugur.net - the infrastructure hub of the Shugur Network. It provides real-time monitoring and access to our distributed relay infrastructure.

## Infrastructure Nodes

- **shu01.shugur.net** - US-East-1 (Primary)
- **shu02.shugur.net** - US-West-1 (Primary) 
- **shu03.shugur.net** - EU-Central-1 (Primary)
- **shu04.shugur.net** - Asia-Pacific-1 (Standby)

## Load Balanced Endpoint

Primary relay endpoint with automatic failover:
```
wss://relay.shugur.net
```

This endpoint automatically routes connections to healthy nodes with geographic optimization.

## Features

- 🔍 Real-time node status monitoring
- 📊 Load balancing visualization
- 🌍 Geographic distribution tracking
- ⚡ Performance metrics dashboard
- 🔗 Quick access to ecosystem services

## Tech Stack

- Static HTML with Tailwind CSS
- Designed for minimal latency
- Mobile responsive
- Dark theme optimized

## Development

```bash
# Serve locally
python -m http.server 8000
# or
npx serve .
```

## Deployment

Deploy to: **shugur.net**

## Related Sites

- [shugur.com](https://shugur.com) - Company website
- [developers.shugur.net](https://developers.shugur.net) - Developer hub
- [docs.relay.shugur.net](https://docs.relay.shugur.net) - Documentation
- [status.shugur.net](https://status.shugur.net) - Status monitoring
