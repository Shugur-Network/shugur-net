# Shugur Network Dashboard - Deployment Guide

## Quick Start

The dashboard is now integrated into the Shugur relay project temporarily. Here's how to work with it:

### Development

```bash
cd dashboard
npm run dev
```

The dashboard will be available at http://localhost:3000

### Build for Production

```bash
cd dashboard
npm run build
```

### Deploy to Netlify

1. **Manual Deployment:**
   ```bash
   cd dashboard
   ./deploy.sh
   ```

2. **Automatic Deployment:**
   - Create a new site on Netlify
   - Connect to your repository (when you move this to its own repo)
   - Set build command: `npm run build`
   - Set publish directory: `dist`
   - Set base directory: `dashboard` (if keeping in the relay repo)

### Environment Setup for Production

1. **Domain Configuration:**
   - Point `shugur.net` to your Netlify site
   - Configure SSL certificates (Netlify handles this automatically)

2. **API Integration:**
   - Replace simulated data in `src/main.js` with real API calls
   - Use the template in `src/api/relayApi.js` for WebSocket connections
   - Update relay endpoints in the configuration

### Current Features

✅ **Real-time Dashboard**
- Network overview with 4 relay nodes (shu01-shu04)
- Live connection counts and status monitoring
- Response time tracking
- Uptime percentage calculation

✅ **Interactive Charts**
- Network traffic visualization
- Events per second monitoring
- Real-time data updates every 30 seconds

✅ **Modern UI/UX**
- Dark/Light theme toggle
- Responsive design for all devices
- Loading states and animations
- Status badges and progress indicators

✅ **Enterprise Features**
- Auto-refresh toggle
- Event logging and notifications
- Performance metrics
- Scalable architecture for more nodes

### Next Steps

1. **Move to Separate Repository:**
   ```bash
   # When ready, move the dashboard to its own repo
   cd /home/ubuntu/shugur/relay
   cp -r dashboard/ /path/to/new/shugur-dashboard-repo/
   ```

2. **API Integration:**
   - Replace simulation with real relay APIs
   - Implement WebSocket connections for live data
   - Add authentication if needed

3. **Enhanced Monitoring:**
   - Add alerting system
   - Implement historical data storage
   - Add more detailed metrics

4. **Deployment:**
   - Deploy to shugur.net
   - Set up monitoring and analytics
   - Configure CDN and caching

### Directory Structure

```
dashboard/
├── src/
│   ├── main.js          # Main dashboard logic
│   ├── style.css        # Tailwind CSS styles
│   └── api/
│       └── relayApi.js  # Real API integration template
├── public/
│   ├── favicon.ico
│   └── logo.svg
├── dist/                # Build output
├── package.json
├── vite.config.js
├── tailwind.config.js
├── netlify.toml         # Netlify deployment config
└── README.md
```

### Configuration

The dashboard is pre-configured for your 4-node cluster:
- shu01.shugur.net (US-East)
- shu02.shugur.net (US-West)  
- shu03.shugur.net (EU-Central)
- shu04.shugur.net (Asia-Pacific)

To add more nodes, edit the `RELAY_NODES` array in `src/main.js`.

### Support

The dashboard is built with:
- **Frontend:** Vanilla JavaScript + Vite
- **Styling:** Tailwind CSS
- **Charts:** Chart.js
- **Hosting:** Optimized for Netlify

All dependencies are included and the build is optimized for production deployment.
