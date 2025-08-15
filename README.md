````markdown
# Shugur Network Dashboard

An enterprise-grade monitoring dashboard for the Shugur relay network cluster. Built with modern web technologies and designed for real-time monitoring of NOSTR relay performance.

## 🚀 Features

- **Real-time Monitoring**: Live updates of relay status, connections, and performance metrics
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Theme**: Toggle between themes with persistent preference storage
- **Interactive Charts**: Real-time data visualization with Chart.js
- **Network Overview**: Comprehensive cluster health monitoring
- **Event Logging**: Recent network events and activity tracking
- **Auto-refresh**: Configurable automatic data updates
- **Performance Metrics**: Response times, uptime, connection counts, and load monitoring
- **Cluster Discovery**: Automatic detection of relay nodes in the network
- **Error Handling**: Robust error handling and fallback mechanisms

## 🏗️ Architecture

The dashboard is built with:

- **Frontend**: Vanilla JavaScript ES6+ with Vite build system
- **Styling**: Tailwind CSS for responsive and modern UI
- **Charts**: Chart.js for real-time data visualization
- **Deployment**: Optimized for Netlify hosting and static deployment
- **Performance**: Lightweight bundle with code splitting and tree shaking

## 🌐 Live Dashboard

Visit the live dashboard at: [https://shugur.net](https://shugur.net)

## ⚡ Performance Optimizations

### Version 2.0.0 Improvements

- **Reduced Bundle Size**: Optimized from ~400KB to ~320KB total
- **Faster Initial Load**: Improved loading screen and initialization
- **Better Memory Management**: Fixed memory leaks and optimized state management
- **Enhanced Chart Performance**: Debounced updates and optimized rendering
- **Improved Error Handling**: Better fallback mechanisms and user feedback
- **Mobile Optimization**: Enhanced mobile responsiveness and touch interactions
- **Auto-refresh Optimization**: Better resource management and pause/resume functionality

### Technical Optimizations

1. **Code Splitting**: Vendor libraries separated for better caching
2. **Tree Shaking**: Unused code eliminated automatically
3. **CSS Purging**: Only used Tailwind classes included
4. **Image Optimization**: Optimized assets and icons
5. **Gzip Ready**: Pre-optimized for server compression
6. **Legacy Support**: Polyfills for older browsers
7. **Source Map Optimization**: Disabled in production for smaller bundles

## 🛠️ Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn package manager

### Local Development

1. Clone the repository:
```bash
git clone <repository-url>
cd shugur-dashboard
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

### Optimization Script

Run the optimization script for production deployment:

```bash
./optimize-dashboard.sh
```

This script will:
- Install/update dependencies
- Fix security vulnerabilities
- Build optimized version
- Generate performance report
- Provide deployment instructions

### Preview Production Build

```bash
npm run preview
```

## 🚀 Deployment

### Quick Deployment

1. Run the optimization script:
```bash
./optimize-dashboard.sh
```

2. Upload the `dist` directory contents to your web server

### Netlify Deployment

1. Connect your repository to Netlify
2. Set the build command to `npm run build`
3. Set the publish directory to `dist`
4. Deploy!

The included `netlify.toml` file handles:
- Build configuration
- Redirects for SPA routing
- Security headers
- Cache optimization

### Manual Deployment

```bash
npm run build
# Upload the contents of the 'dist' directory to your web server
```

### Docker Deployment

```bash
# Build the dashboard
npm run build

# Serve with a simple web server
docker run -p 8080:8080 -v $(pwd)/dist:/usr/share/nginx/html:ro nginx
```

## 🔧 Configuration

### Dashboard Configuration

Edit `dashboard-config.json` to customize:

```json
{
  "dashboard": {
    "refreshInterval": 30000,
    "maxChartPoints": 20,
    "maxEvents": 50
  },
  "relays": {
    "seedRelays": [...]
  },
  "features": {
    "autoRefresh": true,
    "darkMode": true,
    "realTimeCharts": true
  }
}
```

### Relay Nodes

Configure relay endpoints in `src/main.js`:

```javascript
const SEED_RELAYS = [
    { id: 'shu01', name: 'shu01.shugur.net', url: 'wss://shu01.shugur.net', apiUrl: 'https://shu01.shugur.net' },
    { id: 'shu02', name: 'shu02.shugur.net', url: 'wss://shu02.shugur.net', apiUrl: 'https://shu02.shugur.net' },
    // Add more nodes as needed
]
```

### API Integration

The dashboard integrates with relay APIs at:
- `/api/metrics` - Enhanced metrics endpoint
- `/api/stats` - Basic statistics endpoint
- `/api/cluster` - Cluster information endpoint

### Customization

- **Branding**: Replace logo files in the `public` directory
- **Colors**: Modify the color scheme in `tailwind.config.js`
- **Metrics**: Add new metrics by extending the relay state object
- **Charts**: Configure chart types and options in the `initializeCharts()` function

## 📊 Monitoring Metrics

The dashboard tracks:

### Network-Level Metrics
- Overall cluster health and uptime
- Total active connections across all relays
- Network-wide message processing rates
- Cluster event storage statistics

### Per-Relay Metrics
- **Status**: Online/Offline/Idle/Connecting
- **Connections**: Current WebSocket connections
- **Response Time**: Real-time Nostr response measurement
- **Uptime**: Individual relay uptime tracking
- **Load Percentage**: CPU and memory utilization
- **Memory Usage**: Detailed Go runtime memory statistics
- **Events**: Events per second processing rate
- **Messages**: Total messages processed

### Real-time Charts
- **Messages Per Refresh**: Delta of messages processed
- **Events Per Refresh**: Delta of events stored
- **Historical Trends**: Time-series data visualization

### Event Logging
- Connection events
- Performance alerts
- Error notifications
- System status changes

## 🎨 UI Components

### Status Indicators
- **Color-coded Status Badges**: Visual relay status
- **Progress Bars**: Load indicators with dynamic colors
- **Pulse Animations**: Real-time activity indicators

### Interactive Elements
- **Theme Toggle**: Persistent dark/light mode switching
- **Auto-refresh Toggle**: Pause/resume data updates
- **Responsive Charts**: Interactive time-series data
- **Hover Effects**: Enhanced user interaction feedback

### Performance Features
- **Loading States**: Shimmer effects and loading indicators
- **Error States**: User-friendly error messages
- **Empty States**: Guidance when no data available
- **Mobile Optimization**: Touch-friendly controls

## 🔒 Security

The dashboard includes security best practices:

- **Content Security Policy**: XSS protection headers
- **CORS Handling**: Proper cross-origin request management
- **Input Validation**: Sanitized data processing
- **Secure Headers**: Frame options and content type protection
- **Error Boundary**: Safe error handling without exposing internals

## 📱 Browser Support

- **Modern Browsers**:
  - Chrome 88+
  - Firefox 85+ 
  - Safari 14+
  - Edge 88+
- **Legacy Support**: IE 11 with polyfills
- **Mobile Browsers**: iOS Safari, Chrome Mobile, Samsung Internet

## 🧪 Testing

### Automated Testing

```bash
# Run the built-in test
open test-dashboard.html
```

### Manual Testing Checklist

- [ ] All relay cards display correctly
- [ ] Charts update with real data
- [ ] Theme toggle works
- [ ] Auto-refresh can be paused/resumed
- [ ] Mobile responsiveness
- [ ] Error handling with offline relays
- [ ] Performance under load

### Performance Testing

Monitor these metrics:
- Initial page load time
- Chart rendering performance
- Memory usage over time
- Network request efficiency

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with `./optimize-dashboard.sh`
5. Submit a pull request

### Development Guidelines

- Follow the existing code style
- Add comments for complex logic
- Test on multiple browsers
- Optimize for performance
- Maintain accessibility standards

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Contact the Shugur Network team
- Check the documentation
- Review the optimization report

## 🔄 Changelog

### v2.0.0 (Current)
- ✅ Performance optimizations and bundle size reduction
- ✅ Enhanced error handling and fallback mechanisms
- ✅ Improved mobile responsiveness
- ✅ Better chart performance and delta calculations
- ✅ Auto-refresh optimization with pause/resume
- ✅ Cluster discovery improvements
- ✅ Enhanced UI/UX with better animations
- ✅ Comprehensive testing and optimization tools

### v1.0.0
- Initial release
- Real-time monitoring dashboard
- Four-node cluster support
- Responsive design
- Dark/light theme support
- Interactive charts and metrics

## 📈 Performance Metrics

- **Bundle Size**: ~320KB total (down from ~400KB)
- **Load Time**: <2s on fast connections
- **Memory Usage**: <50MB typical
- **CPU Usage**: <5% on modern devices
- **Mobile Performance**: 90+ Lighthouse score

````
