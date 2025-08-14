/**
 * Simplified Dashboard Controller - Robust version with better error handling
 */
class SimpleDashboard {
    constructor() {
        this.apiUrl = 'http://localhost:8003/api/network-stats';
        this.updateInterval = 30000; // 30 seconds
        this.isLoading = false;
        
        console.log('🚀 SimpleDashboard initializing...');
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.startUpdates());
        } else {
            this.startUpdates();
        }
        
        // Setup refresh button
        this.setupRefreshButton();
    }
    
    setupRefreshButton() {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('Manual refresh triggered');
                this.fetchAndUpdate();
            });
        }
        
        // Setup copy-to-clipboard for relay URLs
        document.querySelectorAll('.relay-url').forEach(element => {
            element.addEventListener('click', () => {
                const text = element.textContent.trim();
                navigator.clipboard.writeText(text).then(() => {
                    console.log('Copied to clipboard:', text);
                    // Visual feedback
                    const original = element.textContent;
                    element.textContent = '📋 Copied!';
                    setTimeout(() => {
                        element.textContent = original;
                    }, 1500);
                }).catch(err => {
                    console.error('Failed to copy:', err);
                });
            });
        });
    }
    
    startUpdates() {
        console.log('📊 Starting dashboard updates...');
        
        // Initial fetch
        this.fetchAndUpdate();
        
        // Set up periodic updates
        setInterval(() => {
            if (!this.isLoading) {
                this.fetchAndUpdate();
            }
        }, this.updateInterval);
    }
    
    async fetchAndUpdate() {
        if (this.isLoading) {
            console.log('⏳ Update already in progress, skipping...');
            return;
        }
        
        this.isLoading = true;
        this.setLoadingState(true);
        
        try {
            console.log('🔄 Fetching network data from:', this.apiUrl);
            
            const response = await fetch(this.apiUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('✅ Network data received:', data);
            
            this.updateUI(data);
            
        } catch (error) {
            console.error('❌ Error fetching data:', error);
            this.handleError(error.message);
        } finally {
            this.isLoading = false;
            this.setLoadingState(false);
        }
    }
    
    updateUI(data) {
        if (!data || !data.network) {
            console.warn('⚠️ Invalid data structure received');
            return;
        }
        
        const network = data.network;
        const nodes = data.nodes || [];
        
        // Update network overview
        this.updateElement('total-connections', this.formatNumber(network.total_connections));
        this.updateElement('total-messages', this.formatNumber(network.total_messages));
        this.updateElement('total-events', this.formatNumber(network.total_events));
        this.updateElement('network-health', `${network.health_percentage}%`);
        this.updateElement('online-nodes', `${network.online_nodes}/${network.total_nodes} Online`);
        
        // Update health indicator
        this.updateHealthIndicator(network.health_percentage);
        
        // Update individual nodes
        this.updateNodes(nodes);
        
        console.log(`📊 UI updated - ${network.online_nodes}/${network.total_nodes} nodes online`);
    }
    
    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            console.log(`📝 Updated ${id}:`, value);
        } else {
            console.warn(`⚠️ Element ${id} not found`);
        }
    }
    
    updateHealthIndicator(percentage) {
        const healthDot = document.getElementById('health-dot');
        if (healthDot) {
            healthDot.className = 'w-3 h-3 rounded-full pulse-green';
            
            if (percentage >= 75) {
                healthDot.classList.add('bg-green-500');
            } else if (percentage >= 50) {
                healthDot.classList.add('bg-yellow-500');
            } else {
                healthDot.classList.add('bg-red-500');
            }
        }
    }
    
    updateNodes(nodes) {
        nodes.forEach(nodeData => {
            const nodeId = nodeData.node.split('.')[0]; // Extract shu01, shu02, etc.
            const nodeElement = document.querySelector(`[data-node="${nodeId}"]`);
            
            if (nodeElement) {
                // Update status dot
                const statusDot = nodeElement.querySelector('.status-dot');
                const statusText = nodeElement.querySelector('.node-status');
                const connectionsEl = nodeElement.querySelector('.node-connections');
                const eventsEl = nodeElement.querySelector('.node-events');
                const uptimeEl = nodeElement.querySelector('.node-uptime');
                
                if (statusDot) {
                    statusDot.className = 'w-3 h-3 rounded-full';
                    statusDot.classList.add(nodeData.status === 'online' ? 'bg-green-500' : 'bg-red-500');
                }
                
                if (statusText) {
                    statusText.textContent = nodeData.status === 'online' ? 'Online' : 'Offline';
                    statusText.className = `node-status ${nodeData.status === 'online' ? 'text-green-400' : 'text-red-400'}`;
                }
                
                if (connectionsEl) connectionsEl.textContent = this.formatNumber(nodeData.connections || 0);
                if (eventsEl) eventsEl.textContent = this.formatNumber(nodeData.events || 0);
                if (uptimeEl) uptimeEl.textContent = this.formatUptime(nodeData.uptime || 0);
                
                console.log(`📡 Updated node ${nodeId}: ${nodeData.status}`);
            } else {
                console.warn(`⚠️ Node element ${nodeId} not found`);
            }
        });
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
            return `${days}d ${hours}h`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }
    
    setLoadingState(loading) {
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.disabled = loading;
            if (loading) {
                refreshBtn.innerHTML = '🔄 Updating...';
            } else {
                refreshBtn.innerHTML = `
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
                    </svg>
                    Refresh All
                `;
            }
        }
    }
    
    handleError(errorMessage) {
        console.error('💥 Dashboard Error:', errorMessage);
        
        // Update UI to show error state
        this.updateElement('total-connections', 'Error');
        this.updateElement('total-messages', 'Error');
        this.updateElement('total-events', 'Error');
        this.updateElement('network-health', 'Error');
        this.updateElement('online-nodes', 'Error');
        
        // Set health indicator to red
        const healthDot = document.getElementById('health-dot');
        if (healthDot) {
            healthDot.className = 'w-3 h-3 bg-red-500 rounded-full pulse-green';
        }
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🌐 Initializing Shugur Network Dashboard...');
        window.dashboard = new SimpleDashboard();
    });
} else {
    console.log('🌐 Initializing Shugur Network Dashboard...');
    window.dashboard = new SimpleDashboard();
}
