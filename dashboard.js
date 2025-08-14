// Real-time data fetching for Shugur Relay Network Dashboard
class ShugurDashboard {
    constructor() {
        this.refreshInterval = 30000; // 30 seconds
        this.debug = true; // Enable debug logging
        this.endpoints = {
            stats: 'http://localhost:8003/api/stats',          // Real stats via CORS proxy
            cluster: 'http://localhost:8003/api/cluster',      // Real cluster via CORS proxy
            health: 'http://localhost:8003/api/cluster?type=health',
            metrics: 'http://localhost:2112/metrics',          // Prometheus (if enabled)
            relayInfo: 'http://localhost:8003/relay-info'      // NIP-11 via CORS proxy
        };
        
        console.log('🚀 Shugur Dashboard initializing...');
        console.log('📡 Endpoints:', this.endpoints);
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.startAutoRefresh();
        this.fetchInitialData();
    }

    async fetchInitialData() {
        try {
            await Promise.all([
                this.updateRelayStats(),
                this.updateClusterInfo(),
                this.updateNodeHealth(),
                this.fetchNIP11Info()
            ]);
            console.log('✅ Initial data loaded successfully');
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
        }
    }

    async updateRelayStats() {
        try {
            console.log('📊 Fetching relay stats from:', this.endpoints.stats);
            const response = await fetch(this.endpoints.stats);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const data = await response.json();
            console.log('✅ Stats data received:', data);
            this.updateStatsUI(data);
        } catch (error) {
            console.error('❌ Failed to fetch relay stats:', error);
            this.showOfflineIndicator();
        }
    }

    async updateClusterInfo() {
        try {
            const response = await fetch(this.endpoints.cluster);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const clusterData = await response.json();
            this.updateClusterUI(clusterData);
        } catch (error) {
            console.warn('Failed to fetch cluster info:', error);
        }
    }

    async updateNodeHealth() {
        try {
            const response = await fetch(this.endpoints.health);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const healthData = await response.json();
            this.updateNodeHealthUI(healthData);
        } catch (error) {
            console.warn('Failed to fetch node health:', error);
        }
    }

    async fetchNIP11Info() {
        try {
            console.log('📡 Fetching NIP-11 info from:', this.endpoints.relayInfo);
            const response = await fetch(this.endpoints.relayInfo, {
                headers: { 'Accept': 'application/nostr+json' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const nip11Data = await response.json();
            console.log('✅ NIP-11 data received:', nip11Data);
            this.updateNIP11UI(nip11Data);
        } catch (error) {
            console.warn('❌ Failed to fetch NIP-11 info:', error);
        }
    }

    async fetchPrometheusMetrics() {
        try {
            // Note: This might need CORS configuration or proxy
            const response = await fetch(window.location.protocol + '//' + window.location.hostname + this.endpoints.metrics);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const metricsText = await response.text();
            this.parseAndUpdateMetrics(metricsText);
        } catch (error) {
            console.warn('Failed to fetch Prometheus metrics:', error);
        }
    }

    updateStatsUI(data) {
        const stats = data.stats;
        const uptime = data.uptime;

        console.log('🔄 Updating UI with stats:', stats);

        // Update connection count
        const activeConnectionsEl = document.getElementById('active-connections');
        if (activeConnectionsEl) {
            activeConnectionsEl.textContent = stats.active_connections.toLocaleString();
            console.log('✅ Updated active connections:', stats.active_connections);
        } else {
            console.warn('❌ Element #active-connections not found');
        }

        // Update messages processed
        const messagesProcessedEl = document.getElementById('messages-processed');
        if (messagesProcessedEl) {
            messagesProcessedEl.textContent = stats.messages_processed.toLocaleString();
            console.log('✅ Updated messages processed:', stats.messages_processed);
        } else {
            console.warn('❌ Element #messages-processed not found');
        }

        // Update events stored
        const eventsStoredEl = document.getElementById('events-stored');
        if (eventsStoredEl) {
            eventsStoredEl.textContent = stats.events_stored.toLocaleString();
            console.log('✅ Updated events stored:', stats.events_stored);
        } else {
            console.warn('❌ Element #events-stored not found');
        }

        // Update uptime
        const uptimeEl = document.getElementById('uptime');
        if (uptimeEl) {
            uptimeEl.textContent = uptime;
            console.log('✅ Updated uptime:', uptime);
        } else {
            console.warn('❌ Element #uptime not found');
        }

        // Update network performance section
        this.updateNetworkPerformance(stats);
    }

    updateNetworkPerformance(stats) {
        // Update WebSocket connections
        const wsConnectionsEl = document.querySelector('[data-metric="ws-connections"]');
        if (wsConnectionsEl) {
            wsConnectionsEl.textContent = stats.active_connections.toLocaleString();
        }

        // Update events per second (calculate from last update)
        if (this.lastStats) {
            const timeDiff = (Date.now() - this.lastStatsUpdate) / 1000;
            const eventsDiff = stats.messages_processed - this.lastStats.messages_processed;
            const eventsPerSecond = Math.round(eventsDiff / timeDiff);
            
            const epsEl = document.querySelector('[data-metric="events-per-second"]');
            if (epsEl) {
                epsEl.textContent = eventsPerSecond.toLocaleString();
            }
        }

        this.lastStats = stats;
        this.lastStatsUpdate = Date.now();
    }

    updateClusterUI(clusterData) {
        // Update cluster status indicator
        const clusterIndicator = document.querySelector('[data-cluster-info]');
        if (clusterIndicator && clusterData.is_cluster) {
            const statusEl = clusterIndicator.querySelector('.cluster-status');
            if (statusEl) {
                statusEl.textContent = 'Yes';
                statusEl.className = 'cluster-status text-green-400';
            }

            // Update cluster details
            clusterIndicator.setAttribute('data-cluster-info', JSON.stringify(clusterData));
            clusterIndicator.title = `Cluster: ${clusterData.nodes?.length || 0} nodes`;
        }

        // Update database sync status
        const syncStatusEl = document.querySelector('[data-metric="db-sync"]');
        if (syncStatusEl) {
            syncStatusEl.textContent = clusterData.is_cluster ? 'Synced' : 'Standalone';
            syncStatusEl.className = clusterData.is_cluster ? 'text-green-400 font-mono' : 'text-blue-400 font-mono';
        }
    }

    updateNodeHealthUI(healthData) {
        // Update individual node status if health data includes node information
        if (healthData.nodes) {
            healthData.nodes.forEach((node, index) => {
                const nodeCard = document.querySelector(`[data-node="shu${String(index + 1).padStart(2, '0')}"]`);
                if (nodeCard) {
                    const statusDot = nodeCard.querySelector('.w-3.h-3');
                    const statusText = nodeCard.querySelector('[data-node-status]');
                    
                    if (node.is_live) {
                        statusDot.className = 'w-3 h-3 bg-green-500 rounded-full pulse-green';
                        if (statusText) statusText.textContent = 'Online';
                    } else {
                        statusDot.className = 'w-3 h-3 bg-red-500 rounded-full';
                        if (statusText) statusText.textContent = 'Offline';
                    }
                }
            });
        }
    }

    updateNIP11UI(nip11Data) {
        console.log('🔄 Updating NIP-11 UI with:', nip11Data);

        // Update relay name
        const nameEl = document.getElementById('relay-name');
        if (nameEl && nip11Data.name) {
            nameEl.textContent = nip11Data.name;
            console.log('✅ Updated relay name:', nip11Data.name);
        }

        // Update software info
        const softwareEl = document.getElementById('relay-software');
        if (softwareEl && nip11Data.software) {
            softwareEl.textContent = nip11Data.software;
            console.log('✅ Updated software:', nip11Data.software);
        }

        // Update version
        const versionEl = document.getElementById('relay-version');
        if (versionEl && nip11Data.version) {
            versionEl.textContent = nip11Data.version;
            console.log('✅ Updated version:', nip11Data.version);
        }

        // Update supported NIPs count
        const nipsEl = document.getElementById('relay-nips');
        if (nipsEl && nip11Data.supported_nips) {
            nipsEl.textContent = nip11Data.supported_nips.length + ' NIPs';
            console.log('✅ Updated NIPs count:', nip11Data.supported_nips.length);
        }

        // Update contact
        const contactEl = document.getElementById('relay-contact');
        if (contactEl && nip11Data.contact) {
            contactEl.textContent = nip11Data.contact;
            console.log('✅ Updated contact:', nip11Data.contact);
        }
    }

    parseAndUpdateMetrics(metricsText) {
        // Parse Prometheus metrics format
        const lines = metricsText.split('\n');
        const metrics = {};

        lines.forEach(line => {
            if (line.startsWith('#') || !line.trim()) return;
            
            const parts = line.split(' ');
            if (parts.length >= 2) {
                const name = parts[0];
                const value = parseFloat(parts[1]);
                metrics[name] = value;
            }
        });

        // Update specific metrics in UI
        this.updateMetricsUI(metrics);
    }

    updateMetricsUI(metrics) {
        // Update event kind counters
        const eventKinds = ['1', '3', '4', '7', '30023'];
        eventKinds.forEach(kind => {
            const counter = metrics[`nostr_relay_events_processed_total{kind="${kind}"}`];
            if (counter !== undefined) {
                const el = document.querySelector(`[data-event-kind="${kind}"]`);
                if (el) {
                    el.textContent = Math.floor(counter).toLocaleString();
                }
            }
        });

        // Update response time from histogram
        const responseTime = metrics['nostr_relay_command_processing_duration_seconds_sum'] / 
                           metrics['nostr_relay_command_processing_duration_seconds_count'];
        if (!isNaN(responseTime)) {
            const responseTimeEl = document.querySelector('[data-metric="response-time"]');
            if (responseTimeEl) {
                responseTimeEl.textContent = `${Math.round(responseTime * 1000)}ms`;
            }
        }
    }

    showOfflineIndicator() {
        // Show offline status
        const statusDots = document.querySelectorAll('.pulse-green');
        statusDots.forEach(dot => {
            dot.className = 'w-3 h-3 bg-red-500 rounded-full';
        });

        // Update status text
        const statusTexts = document.querySelectorAll('[data-node-status]');
        statusTexts.forEach(text => {
            if (text.textContent === 'Online') {
                text.textContent = 'Offline';
                text.className = 'text-red-400';
            }
        });
    }

    setupEventListeners() {
        // Add click handlers for copy functionality
        document.addEventListener('click', (e) => {
            if (e.target.matches('.copy-btn, .copy-btn *')) {
                const targetId = e.target.closest('.copy-btn').dataset.target;
                const targetEl = document.getElementById(targetId);
                if (targetEl) {
                    this.copyToClipboard(targetEl.textContent);
                }
            }
        });

        // Add click handlers for relay URLs
        document.addEventListener('click', (e) => {
            if (e.target.matches('.font-mono') && e.target.textContent.startsWith('wss://')) {
                this.copyToClipboard(e.target.textContent);
                this.showCopyNotification();
            }
        });
    }

    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            console.log('Copied to clipboard:', text);
            this.showCopyNotification();
        } catch (error) {
            console.error('Failed to copy to clipboard:', error);
        }
    }

    showCopyNotification() {
        // Simple notification - you could enhance this with a toast library
        const notification = document.createElement('div');
        notification.textContent = 'Copied to clipboard!';
        notification.className = 'fixed top-4 right-4 bg-primary text-white px-4 py-2 rounded shadow-lg z-50';
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }

    startAutoRefresh() {
        setInterval(() => {
            this.updateRelayStats();
            this.updateClusterInfo();
            
            // Less frequent updates for some data
            if (Date.now() % (this.refreshInterval * 2) === 0) {
                this.updateNodeHealth();
                this.fetchPrometheusMetrics();
            }
        }, this.refreshInterval);
    }

    // Method to manually refresh all data
    async refreshAll() {
        console.log('🔄 Manually refreshing all data...');
        await this.fetchInitialData();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.shugurDashboard = new ShugurDashboard();
    
    // Add manual refresh button functionality
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => {
            window.shugurDashboard.refreshAll();
        });
    }
});

// Export for potential external use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShugurDashboard;
}
