/**
 * Shugur Network Dashboard - Centralized Multi-Relay Monitoring
 * Displays real-time statistics from all distributed relay nodes
 */
class ShugurNetworkDashboard {
    constructor() {
        this.config = {
            proxyUrl: 'http://localhost:8003',
            updateInterval: 30000, // 30 seconds
            relayNodes: [
                { id: 'shu01', host: 'shu01.shugur.net', region: 'US-East-1' },
                { id: 'shu02', host: 'shu02.shugur.net', region: 'US-West-1' },
                { id: 'shu03', host: 'shu03.shugur.net', region: 'EU-Central-1' },
                { id: 'shu04', host: 'shu04.shugur.net', region: 'Asia-Pacific-1' }
            ]
        };
        
        this.networkData = {
            totalConnections: 0,
            totalMessages: 0,
            totalEvents: 0,
            onlineNodes: 0,
            healthPercentage: 0,
            lastUpdated: null
        };
        
        this.nodeData = new Map();
        this.isLoading = false;
        
        this.init();
    }
    
    init() {
        console.log('Initializing Shugur Network Dashboard...');
        this.setupEventListeners();
        this.startDataUpdates();
        this.setupCopyToClipboard();
    }
    
    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Manual refresh triggered');
                this.updateAllData();
            });
        }
        
        // Auto-refresh every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.updateAllData();
            }
        }, this.config.updateInterval);
    }
    
    setupCopyToClipboard() {
        // Add click handlers for relay URLs
        document.querySelectorAll('.relay-url').forEach(element => {
            element.addEventListener('click', () => {
                const text = element.textContent.trim();
                navigator.clipboard.writeText(text).then(() => {
                    // Visual feedback
                    const original = element.textContent;
                    element.textContent = 'Copied!';
                    element.style.color = '#10B981'; // green
                    setTimeout(() => {
                        element.textContent = original;
                        element.style.color = '';
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy text: ', err);
                });
            });
        });
    }
    
    async startDataUpdates() {
        console.log('Starting data updates for network dashboard...');
        await this.updateAllData();
    }
    
    async updateAllData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        const startTime = Date.now();
        
        try {
            console.log('Fetching network statistics...');
            
            // Update UI to show loading state
            this.setLoadingState(true);
            
            // Fetch network stats from the enhanced proxy
            const networkStats = await this.fetchNetworkStats();
            
            if (networkStats) {
                this.updateNetworkOverview(networkStats.network);
                this.updateNodeStatus(networkStats.nodes);
                
                const duration = Date.now() - startTime;
                console.log('Network data updated successfully (' + duration + 'ms)');
            } else {
                console.warn('No network data received');
                this.handleError('Failed to fetch network data');
            }
            
        } catch (error) {
            console.error('Error updating dashboard:', error);
            this.handleError(error.message);
        } finally {
            this.isLoading = false;
            this.setLoadingState(false);
        }
    }
    
    async fetchNetworkStats() {
        try {
            const response = await fetch(this.config.proxyUrl + '/api/network-stats', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error('HTTP ' + response.status + ': ' + response.statusText);
            }
            
            const data = await response.json();
            console.log('Network stats received:', data);
            return data;
            
        } catch (error) {
            console.error('Error fetching network stats:', error);
            
            // Fallback: fetch individual node data
            return await this.fetchIndividualNodeData();
        }
    }
    
    async fetchIndividualNodeData() {
        console.log('Falling back to individual node data fetching...');
        
        const nodePromises = this.config.relayNodes.map(async (node) => {
            try {
                const response = await fetch(this.config.proxyUrl + '/proxy/' + node.host, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    return {
                        node: node.host,
                        status: 'online',
                        data: data,
                        connections: data.connections || 0,
                        messages: data.messages_received || 0,
                        events: data.events_stored || 0,
                        uptime: data.uptime_seconds || 0
                    };
                } else {
                    return {
                        node: node.host,
                        status: 'offline',
                        connections: 0,
                        messages: 0,
                        events: 0,
                        uptime: 0
                    };
                }
            } catch (error) {
                console.warn('Failed to fetch data for ' + node.host + ':', error);
                return {
                    node: node.host,
                    status: 'error',
                    connections: 0,
                    messages: 0,
                    events: 0,
                    uptime: 0
                };
            }
        });
        
        const nodeResults = await Promise.all(nodePromises);
        
        // Aggregate results
        const onlineNodes = nodeResults.filter(n => n.status === 'online').length;
        const totalConnections = nodeResults.reduce((sum, n) => sum + n.connections, 0);
        const totalMessages = nodeResults.reduce((sum, n) => sum + n.messages, 0);
        const totalEvents = nodeResults.reduce((sum, n) => sum + n.events, 0);
        
        return {
            network: {
                total_connections: totalConnections,
                total_messages: totalMessages,
                total_events: totalEvents,
                online_nodes: onlineNodes,
                total_nodes: this.config.relayNodes.length,
                health_percentage: Math.round((onlineNodes / this.config.relayNodes.length) * 100),
                last_updated: Math.floor(Date.now() / 1000)
            },
            nodes: nodeResults
        };
    }
    
    updateNetworkOverview(networkStats) {
        // Update global statistics
        this.safeUpdate('total-connections', this.formatNumber(networkStats.total_connections));
        this.safeUpdate('total-messages', this.formatNumber(networkStats.total_messages));
        this.safeUpdate('total-events', this.formatNumber(networkStats.total_events));
        this.safeUpdate('network-health', networkStats.health_percentage + '%');
        this.safeUpdate('online-nodes', networkStats.online_nodes + '/' + networkStats.total_nodes + ' Online');
        
        // Update health indicator
        const healthDot = document.getElementById('health-dot');
        if (healthDot) {
            if (networkStats.health_percentage >= 75) {
                healthDot.className = 'w-3 h-3 bg-green-500 rounded-full pulse-green';
            } else if (networkStats.health_percentage >= 50) {
                healthDot.className = 'w-3 h-3 bg-yellow-500 rounded-full pulse-green';
            } else {
                healthDot.className = 'w-3 h-3 bg-red-500 rounded-full pulse-green';
            }
        }
        
        // Store network data
        this.networkData = {
            totalConnections: networkStats.total_connections,
            totalMessages: networkStats.total_messages,
            totalEvents: networkStats.total_events,
            onlineNodes: networkStats.online_nodes,
            healthPercentage: networkStats.health_percentage,
            lastUpdated: new Date()
        };
    }
    
    updateNodeStatus(nodeStats) {
        nodeStats.forEach(nodeData => {
            const nodeElement = document.querySelector('[data-node="' + this.getNodeId(nodeData.node) + '"]');
            if (nodeElement) {
                // Update status dot
                const statusDot = nodeElement.querySelector('.status-dot');
                const statusText = nodeElement.querySelector('.node-status');
                const connectionsEl = nodeElement.querySelector('.node-connections');
                const eventsEl = nodeElement.querySelector('.node-events');
                const uptimeEl = nodeElement.querySelector('.node-uptime');
                
                if (nodeData.status === 'online') {
                    statusDot.className = 'w-3 h-3 bg-green-500 rounded-full';
                    statusText.textContent = 'Online';
                    statusText.className = 'text-green-400 node-status';
                } else {
                    statusDot.className = 'w-3 h-3 bg-red-500 rounded-full';
                    statusText.textContent = 'Offline';
                    statusText.className = 'text-red-400 node-status';
                }
                
                // Update metrics
                if (connectionsEl) connectionsEl.textContent = this.formatNumber(nodeData.connections || 0);
                if (eventsEl) eventsEl.textContent = this.formatNumber(nodeData.events || 0);
                if (uptimeEl) uptimeEl.textContent = this.formatUptime(nodeData.uptime || 0);
            }
        });
        
        console.log('Updated status for ' + nodeStats.length + ' nodes');
    }
    
    getNodeId(hostname) {
        // Extract node ID from hostname (e.g., shu01.shugur.net -> shu01)
        return hostname.split('.')[0];
    }
    
    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
    
    formatUptime(seconds) {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        
        if (days > 0) {
            return days + 'd ' + hours + 'h';
        } else if (hours > 0) {
            return hours + 'h ' + minutes + 'm';
        } else {
            return minutes + 'm';
        }
    }
    
    safeUpdate(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        } else {
            console.warn('Element with ID \'' + elementId + '\' not found');
        }
    }
    
    setLoadingState(isLoading) {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            if (isLoading) {
                refreshBtn.disabled = true;
                refreshBtn.innerHTML = '<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">' +
                    '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" stroke-opacity="0.25"></circle>' +
                    '<path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" stroke-opacity="0.75"></path>' +
                    '</svg> Updating...';
            } else {
                refreshBtn.disabled = false;
                refreshBtn.innerHTML = '<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">' +
                    '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>' +
                    '</svg> Refresh All';
            }
        }
    }
    
    handleError(errorMessage) {
        console.error('Dashboard Error:', errorMessage);
        
        // Update UI to show error state
        this.safeUpdate('total-connections', 'Error');
        this.safeUpdate('total-messages', 'Error');
        this.safeUpdate('total-events', 'Error');
        this.safeUpdate('network-health', 'Error');
        this.safeUpdate('online-nodes', 'Error');
        
        // Show error in console for debugging
        const errorDetails = {
            message: errorMessage,
            timestamp: new Date().toISOString(),
            proxyUrl: this.config.proxyUrl,
            relayNodes: this.config.relayNodes.map(n => n.host)
        };
        
        console.table(errorDetails);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Shugur Network Dashboard - Centralized Monitoring System');
    console.log('Monitoring distributed relay infrastructure...');
    
    // Create dashboard instance
    window.shugurDashboard = new ShugurNetworkDashboard();
    
    // Add global error handler
    window.addEventListener('error', (event) => {
        console.error('Global Error:', event.error);
    });
    
    // Add unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
    });
});
