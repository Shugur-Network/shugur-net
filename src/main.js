import './style.css'
import { Chart, registerables } from 'chart.js'
import 'chartjs-adapter-date-fns'
import { format, subHours, addMinutes } from 'date-fns'

// Register Chart.js components
Chart.register(...registerables)

// Quick connectivity test
async function testRelayConnectivity(relays) {
    const results = await Promise.allSettled(
        relays.map(async (relay) => {
            try {
                const response = await fetch(`${relay.apiUrl}/api/stats`, {
                    signal: AbortSignal.timeout(3000),
                    method: 'GET',
                    headers: { 'Accept': 'application/json' }
                })
                return { relay, available: response.ok, status: response.status }
            } catch (error) {
                return { relay, available: false, error: error.message }
            }
        })
    )
    
    return results.filter(r => r.status === 'fulfilled' && r.value.available).map(r => r.value.relay)
}

// Dashboard configuration
const SEED_RELAYS = [
    { id: 'shu01', name: 'shu01.shugur.net', url: 'wss://shu01.shugur.net', apiUrl: 'https://shu01.shugur.net', isSeed: true },
    { id: 'shu02', name: 'shu02.shugur.net', url: 'wss://shu02.shugur.net', apiUrl: 'https://shu02.shugur.net', isSeed: true },
    { id: 'shu03', name: 'shu03.shugur.net', url: 'wss://shu03.shugur.net', apiUrl: 'https://shu03.shugur.net', isSeed: true }
    // Other relays (shu04, shu05, etc.) will be discovered dynamically from cluster info
]

// For development, also try local endpoint
const LOCAL_RELAY = { id: 'local', name: 'localhost:8080', url: 'ws://localhost:8080', apiUrl: 'http://localhost:8080', isSeed: true, isLocal: true }

// Dynamic relay nodes discovered from cluster
let DISCOVERED_RELAYS = []
let ALL_RELAY_NODES = []

// For development/testing, use production endpoints directly
const DEVELOPMENT_MODE = false // Always use production for real data

const REFRESH_INTERVAL = 5000 // 5 seconds
const MAX_CHART_POINTS = 20

// State management
let state = {
    relays: new Map(),
    charts: {},
    networkStats: {
        totalConnections: 0,
        networkUptime: 0
    },
    previousStats: {
        totalMessagesProcessed: 0,
        clusterEventsStored: 0
    },
    initialStats: {
        totalMessagesProcessed: null,  // Will store initial values
        clusterEventsStored: null
    },
    isFirstDataFetch: true  // Flag to skip first data point in charts
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // Set dynamic year
    document.getElementById('current-year').textContent = new Date().getFullYear()
    
    // Set a maximum loading time of 8 seconds
    const maxLoadingTime = setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden')
        document.getElementById('dashboard').classList.remove('hidden')
        document.getElementById('dashboard').classList.add('show')
    }, 8000)
    
    try {
        initializeEventListeners()
        initializeCharts()
        
        await initializeRelayNodes()
        
        startDataCollection()
        
        // Clear the timeout since we succeeded
        clearTimeout(maxLoadingTime)
        
        // Hide loading screen after successful initialization
        document.getElementById('loading-screen').classList.add('hidden')
        document.getElementById('dashboard').classList.remove('hidden')
        document.getElementById('dashboard').classList.add('show')
        
    } catch (error) {
        console.error('Dashboard initialization failed:', error)
        // Clear the timeout
        clearTimeout(maxLoadingTime)
        // Show dashboard anyway with fallback
        ALL_RELAY_NODES = [...SEED_RELAYS]
        
        // Initialize with fallback data
        for (const node of SEED_RELAYS) {
            const location = detectRelayLocation(node.name)
            state.relays.set(node.id, {
                ...node,
                location: location,
                status: 'connecting',
                connections: 0,
                uptime: 0,
                lastSeen: null,
                responseTime: 0,
                events: 0
            })
        }
        
        // Hide loading screen anyway
        document.getElementById('loading-screen').classList.add('hidden')
        document.getElementById('dashboard').classList.remove('hidden')
        document.getElementById('dashboard').classList.add('show')
    }
})

// Event listeners
function initializeEventListeners() {
    // Window resize handler for charts
    window.addEventListener('resize', () => {
        Object.values(state.charts).forEach(chart => {
            if (chart && typeof chart.resize === 'function') {
                chart.resize()
            }
        })
    })
}

// Chart initialization
function initializeCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            intersect: false,
            mode: 'index'
        },
        plugins: {
            legend: {
                display: true,
                labels: {
                    usePointStyle: true,
                    color: '#374151'
                }
            }
        },
        scales: {
            x: {
                type: 'time',
                time: {
                    displayFormats: {
                        minute: 'HH:mm'
                    }
                },
                grid: {
                    color: '#e5e7eb'
                },
                ticks: {
                    color: '#6b7280'
                }
            },
            y: {
                beginAtZero: true,
                grid: {
                    color: '#e5e7eb'
                },
                ticks: {
                    color: '#6b7280'
                }
            }
        }
    }

    // Messages Delta Chart
    const messagesCtx = document.getElementById('messages-chart').getContext('2d')
    state.charts.messages = new Chart(messagesCtx, {
        type: 'line',
        data: {
            datasets: [{
                label: 'Messages',
                data: [], // Start with empty data - will be populated after first refresh cycle
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            ...chartOptions,
            plugins: {
                ...chartOptions.plugins,
                legend: {
                    ...chartOptions.plugins.legend,
                    labels: {
                        ...chartOptions.plugins.legend.labels,
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            
                            if (chart.data.datasets[0].data.length === 0) {
                                labels[0].text = 'Messages (collecting data...)';
                            }
                            
                            return labels;
                        }
                    }
                }
            }
        }
    })

    // Events Delta Chart
    const eventsCtx = document.getElementById('events-chart').getContext('2d')
    state.charts.events = new Chart(eventsCtx, {
        type: 'bar',
        data: {
            datasets: [{
                label: 'Events',
                data: [], // Start with empty data - will be populated after first refresh cycle
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            ...chartOptions,
            scales: {
                ...chartOptions.scales,
                x: {
                    ...chartOptions.scales.x,
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                ...chartOptions.plugins,
                legend: {
                    ...chartOptions.plugins.legend,
                    labels: {
                        ...chartOptions.plugins.legend.labels,
                        generateLabels: function(chart) {
                            const original = Chart.defaults.plugins.legend.labels.generateLabels;
                            const labels = original.call(this, chart);
                            
                            if (chart.data.datasets[0].data.length === 0) {
                                labels[0].text = 'Events (collecting data...)';
                            }
                            
                            return labels;
                        }
                    }
                }
            }
        }
    })

}

// Relay node management
async function initializeRelayNodes() {
    const container = document.getElementById('relay-nodes')
    
    try {
        // Test which relays are available (only include localhost in development)
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        const testRelays = isLocalhost ? [LOCAL_RELAY, ...SEED_RELAYS] : [...SEED_RELAYS]
        const availableRelays = await testRelayConnectivity(testRelays)
        
        if (availableRelays.length > 0) {
            // Only use seed relays for initial setup - cluster discovery will add others
            ALL_RELAY_NODES = availableRelays.filter(relay => relay.isSeed && !relay.isLocal)
        } else {
            ALL_RELAY_NODES = [...SEED_RELAYS]
        }
        
        // Try to discover the full cluster from available relays
        await discoverClusterNodes()
        
        // Clean up any duplicate UI elements before initializing
        const container = document.getElementById('relay-nodes')
        if (container) {
            // Remove all existing relay elements to prevent duplicates
            const existingElements = container.querySelectorAll('[id^="relay-"]')
            existingElements.forEach(element => element.remove())
        }
        
        // Initialize UI for all discovered nodes
        const processedNodes = new Set() // Track which nodes we've already processed
        for (const node of ALL_RELAY_NODES) {
            try {
                // Skip if we've already processed this node
                if (processedNodes.has(node.id) || processedNodes.has(node.name)) {
                    continue
                }
                processedNodes.add(node.id)
                processedNodes.add(node.name)
                
                // Check if UI element already exists
                const existingElement = document.getElementById(`relay-${node.id}`)
                if (existingElement) {
                    continue
                }
                
                // Detect location based on hostname using IP geolocation
                let location = node.location // Use existing location if already set
                
                if (!location) {
                    // Skip IP location for localhost
                    if (node.isLocal) {
                        location = 'Local Development'
                    } else {
                        // Get real location via IP geolocation
                        const hostname = node.apiUrl.replace('https://', '').replace('http://', '')
                        try {
                            location = await getIPLocation(hostname)
                        } catch (error) {
                            location = detectRelayLocation(hostname)
                        }
                    }
                } else {
                    // Using existing location
                }
                
                // Ensure location is set on the node object
                node.location = location
                
                state.relays.set(node.id, {
                    ...node,
                    location: location,
                    status: node.isLive === false ? 'offline' : 'connecting',
                    connections: 0,
                    uptime: 0,
                    lastSeen: null,
                    responseTime: 0,
                    events: 0
                })
                
                const nodeElement = createRelayNodeElement({...node, location})
                container.appendChild(nodeElement)
            } catch (error) {
                console.warn(`Failed to initialize node ${node.id}:`, error)
            }
        }
        
    } catch (error) {
        console.error('Failed to initialize relay nodes:', error)
        
        // Fallback: use seed relays only
        ALL_RELAY_NODES = [...SEED_RELAYS]
        
        for (const node of SEED_RELAYS) {
            try {
                const hostname = node.apiUrl.replace('https://', '').replace('http://', '')
                const location = detectRelayLocation(hostname)
                
                state.relays.set(node.id, {
                    ...node,
                    location: location,
                    status: 'connecting',
                    connections: 0,
                    uptime: 0,
                    lastSeen: null,
                    responseTime: 0,
                    events: 0
                })
                
                const nodeElement = createRelayNodeElement({...node, location})
                container.appendChild(nodeElement)
            } catch (nodeError) {
                console.warn(`Failed to initialize seed node ${node.id}:`, nodeError)
            }
        }
    }
}

function createRelayNodeElement(node) {
    const div = document.createElement('div')
    div.className = 'bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow'
    div.id = `relay-${node.id}`
    
    // Show additional info for discovered nodes - remove nodeId display
    const nodeTitle = `${node.name}`
    
    const statusBadgeClass = node.isLive === false ? 'offline' : 'connecting'
    const statusText = node.isLive === false ? 'Offline' : 'Connecting'
    
    div.innerHTML = `
        <div class="flex items-start justify-between mb-4">
            <div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-1">${nodeTitle}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400" id="location-${node.id}">${node.location || 'Unknown Location'}</p>
            </div>
            <span class="status-badge ${statusBadgeClass}" id="status-${node.id}">${statusText}</span>
        </div>
        
        <div class="grid grid-cols-2 gap-4 mb-4">
            <div class="text-center">
                <p class="text-2xl font-bold text-gray-900 dark:text-white" id="connections-${node.id}">--</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Connections</p>
            </div>
            <div class="text-center">
                <p class="text-2xl font-bold text-gray-900 dark:text-white" id="messages-${node.id}">--</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Requests</p>
            </div>
        </div>
        
        <div class="space-y-3">
            <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">Load</span>
                <span class="font-medium text-gray-900 dark:text-white" id="load-${node.id}">--</span>
            </div>
            <div class="progress-bar">
                <div class="progress-fill" id="load-bar-${node.id}" style="width: 0%"></div>
            </div>
            
            <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">Response Time</span>
                <span class="font-medium text-gray-900 dark:text-white" id="response-${node.id}">--</span>
            </div>
            
            <div class="flex justify-between text-sm">
                <span class="text-gray-500 dark:text-gray-400">Uptime</span>
                <span class="font-medium text-gray-900 dark:text-white" id="uptime-${node.id}">--</span>
            </div>
        </div>
    `
    
    return div
}

// Data collection and simulation
function startDataCollection() {
    // Initial data load
    updateDashboardData()
    
    // Set up periodic updates
    setInterval(() => {
        updateDashboardData()
    }, REFRESH_INTERVAL)
    
    // Re-discover cluster topology every 5 minutes to catch new nodes
    setInterval(() => {
        discoverClusterNodes().then(() => {
            // Topology check complete
        }).catch(error => {
            console.warn('Failed to check cluster topology:', error)
        })
    }, 300000) // 5 minutes
}

function updateDashboardData() {
    // Properly handle async operation
    fetchRelayData().then(() => {
        updateNetworkOverview()
        updateLastUpdatedTime()
    }).catch(error => {
        console.error('❌ Dashboard data update failed:', error)
    })
}

async function fetchRelayData() {
    console.log('Starting fetchRelayData...')
    let activeCount = 0
    let totalConnections = 0
    let totalEvents = 0
    let totalMessagesProcessed = 0
    let clusterEventsStored = 0 // Single value from first available relay
    let totalMemoryUsage = 0
    let clusterEventsStoredSet = false

    // Fetch data from each relay node (both seed and discovered)
    const promises = ALL_RELAY_NODES.map(async (node) => {
        const relay = state.relays.get(node.id)
        if (!relay) return
        
        console.log(`Fetching data for ${node.id} from ${node.apiUrl}`)
        
        try {
            let response = await fetch(`${node.apiUrl}/api/metrics`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                signal: AbortSignal.timeout(5000)
            })

            console.log(`Metrics response for ${node.id}:`, response.status, response.statusText)

            let data
            if (!response.ok) {
                console.log(`Metrics failed for ${node.id}, falling back to stats endpoint`)
                // Fall back to basic stats endpoint
                response = await fetch(`${node.apiUrl}/api/stats`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    signal: AbortSignal.timeout(5000)
                })
                
                console.log(`Stats response for ${node.id}:`, response.status, response.statusText)
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
                }
                
                const statsData = await response.json()
                console.log(`Received stats data for ${node.id}:`, statsData)
                // Transform basic stats to our expected format
                data = {
                    status: 'online',
                    active_connections: statsData.stats?.active_connections || 0,
                    messages_processed: statsData.stats?.messages_processed || 0,
                    events_stored: statsData.stats?.events_stored || 0,
                    uptime_seconds: parseUptimeString(statsData.uptime || '0m'),
                    average_response_time: statsData.stats?.average_response_time_ms || 0,
                    events_per_second: statsData.stats?.events_per_second || 0,
                    load_percentage: statsData.stats?.load_percentage || 0,
                    error_rate: statsData.stats?.error_rate || 0,
                    memory_usage: statsData.stats?.memory_usage || {},
                    messages_sent: statsData.stats?.messages_sent || 0,
                    active_subscriptions: statsData.stats?.active_subscriptions || 0
                }
            } else {
                data = await response.json()
                console.log(`Received enhanced metrics data for ${node.id}:`, data)
            }
            
            // Update relay state with real data
            relay.status = data.status || 'online'
            relay.connections = data.active_connections || 0
            relay.uptime = data.uptime_seconds || 0
            relay.lastSeen = new Date()
            relay.events = data.events_per_second || 0
            relay.loadPercentage = data.load_percentage || 0
            
            // If load percentage is 0, calculate it based on CPU + Memory usage
            if (relay.loadPercentage === 0) {
                let calculatedLoad = 0
                
                // Factor 1: Memory usage (if available)
                if (data.memory_usage && data.memory_usage.alloc && data.memory_usage.sys) {
                    const memoryUsagePercent = (data.memory_usage.alloc / data.memory_usage.sys) * 100
                    calculatedLoad += memoryUsagePercent * 0.4 // 40% weight for memory
                }
                
                // Factor 2: Connection load (connections as a proxy for network/CPU load)
                if (relay.connections > 0) {
                    const connectionLoad = Math.min((relay.connections / 100) * 100, 50) // max 50% from connections
                    calculatedLoad += connectionLoad * 0.3 // 30% weight for connections
                }
                
                // Factor 3: Events per second (as CPU activity indicator)
                if (data.events_per_second > 0) {
                    const eventsLoad = Math.min((data.events_per_second / 10) * 100, 30) // max 30% from events
                    calculatedLoad += eventsLoad * 0.3 // 30% weight for events processing
                }
                
                relay.loadPercentage = Math.min(Math.round(calculatedLoad), 100)
            }
            
            console.log(`Load calculation for ${node.id}:`, {
                api_load: data.load_percentage,
                final_load: relay.loadPercentage,
                connections: relay.connections,
                events_per_sec: data.events_per_second,
                memory_alloc: data.memory_usage?.alloc,
                memory_sys: data.memory_usage?.sys
            })
            
            relay.memoryUsage = data.memory_usage || {}
            relay.messagesProcessed = data.messages_processed || 0
            relay.messagesSent = data.messages_sent || 0
            relay.eventsStored = data.events_stored || 0
            relay.activeSubscriptions = data.active_subscriptions || 0
            relay.errorRate = data.error_rate || 0
            relay.name = node.name // Always use the hostname instead of API name
            relay.relayId = data.relay_id || node.id
            
            // Measure real Nostr response time
            relay.responseTime = await measureNostrResponseTime(node.url)
            
            if (relay.status === 'online' || relay.status === 'idle') {
                activeCount++
            }
            totalConnections += relay.connections
            totalEvents += relay.events
            totalMessagesProcessed += relay.messagesProcessed
            
            // Only set cluster events stored from first available relay (since it's cluster-wide)
            if (!clusterEventsStoredSet && relay.status === 'online' && relay.eventsStored > 0) {
                clusterEventsStored = relay.eventsStored
                clusterEventsStoredSet = true
            }
            
            if (relay.memoryUsage && relay.memoryUsage.alloc) {
                totalMemoryUsage += relay.memoryUsage.alloc
            }

            // Update UI for this relay
            updateRelayNodeUI(relay)
            console.log(`Updated UI for ${node.id}, status: ${relay.status}, connections: ${relay.connections}`)

        } catch (error) {
            console.error(`Failed to fetch data for ${node.id}:`, error)
            
            // Mark as offline on error
            relay.status = 'offline'
            relay.connections = 0
            relay.responseTime = 0
            relay.lastSeen = new Date()
            relay.events = 0
            relay.loadPercentage = 0
            
            // Update UI to show offline status
            updateRelayNodeUI(relay)
        }
    })

    // Wait for all requests to complete
    await Promise.allSettled(promises)
    
    // Update network stats with new values
    state.networkStats.totalConnections = totalConnections
    state.networkStats.totalMessagesProcessed = totalMessagesProcessed
    state.networkStats.clusterEventsStored = clusterEventsStored
    state.networkStats.totalMemoryUsage = totalMemoryUsage
    
    // Initialize baseline values on first fetch
    if (state.initialStats.totalMessagesProcessed === null) {
        state.initialStats.totalMessagesProcessed = totalMessagesProcessed
        state.initialStats.clusterEventsStored = clusterEventsStored
        console.log('Initialized baseline values:', {
            messages: totalMessagesProcessed,
            events: clusterEventsStored
        })
    }
    
    // Calculate deltas from initial values for display
    const messagesDelta = Math.max(0, totalMessagesProcessed - (state.initialStats.totalMessagesProcessed || 0))
    const eventsDelta = Math.max(0, clusterEventsStored - (state.initialStats.clusterEventsStored || 0))
    
    console.log(`Network stats updated:`, {
        activeCount,
        totalConnections, 
        totalEvents, 
        totalMessagesProcessed,
        messagesDelta,
        clusterEventsStored,
        eventsDelta,
        totalMemoryUsage: Math.round(totalMemoryUsage / 1024 / 1024) + 'MB'
    })
    
    // Update UI elements with active relays count
    const activeRelaysElement = document.getElementById('active-relays')
    if (activeRelaysElement) {
        activeRelaysElement.textContent = activeCount
    }
    
    document.getElementById('total-connections').textContent = totalConnections.toLocaleString()
    
    // Update network stats with TOTAL values in tiles (not deltas)
    const messagesElement = document.getElementById('total-messages')
    if (messagesElement) {
        messagesElement.textContent = totalMessagesProcessed.toLocaleString()
    }
    
    const eventsElement = document.getElementById('total-events-stored')
    if (eventsElement) {
        eventsElement.textContent = clusterEventsStored.toLocaleString()
    }
    
    // Update charts after all data is processed
    updateCharts()
    
    // Update footer relay list
    updateFooterRelayList()
}

function updateRelayNodeUI(relay) {
    const statusElement = document.getElementById(`status-${relay.id}`)
    const connectionsElement = document.getElementById(`connections-${relay.id}`)
    const messagesElement = document.getElementById(`messages-${relay.id}`)
    const responseElement = document.getElementById(`response-${relay.id}`)
    const uptimeElement = document.getElementById(`uptime-${relay.id}`)
    const loadElement = document.getElementById(`load-${relay.id}`)
    const loadBarElement = document.getElementById(`load-bar-${relay.id}`)
    
    // Update status badge
    const statusText = relay.status === 'online' ? 'Online' : 
                      relay.status === 'idle' ? 'Idle' : 
                      relay.status === 'connecting' ? 'Connecting' : 'Offline'
    statusElement.textContent = statusText
    statusElement.className = `status-badge ${relay.status || 'offline'}`
    
    // Update metrics
    connectionsElement.textContent = relay.connections.toLocaleString()
    messagesElement.textContent = relay.messagesProcessed.toLocaleString()
    
    responseElement.textContent = relay.status === 'online' || relay.status === 'idle' ? 
        `${Math.round(relay.responseTime)}ms` : '--'
    
    // Format uptime
    if (relay.status === 'online' || relay.status === 'idle') {
        uptimeElement.textContent = formatUptimeSeconds(relay.uptime)
    } else {
        uptimeElement.textContent = '--'
    }
    
    // Update load
    const loadPercentage = relay.loadPercentage || 0
    
    // Show decimal places for low values, round for higher values
    const displayLoad = loadPercentage < 1 ? 
        loadPercentage.toFixed(1) : 
        Math.round(loadPercentage)
    
    loadElement.textContent = `${displayLoad}%`
    loadBarElement.style.width = `${loadPercentage}%`
    
    // Update load bar color based on percentage
    loadBarElement.className = 'progress-fill'
    if (loadPercentage >= 80) {
        loadBarElement.classList.add('critical-load')
    } else if (loadPercentage >= 50) {
        loadBarElement.classList.add('high-load')
    }
}

function updateNetworkOverview() {
    // Calculate network uptime (simplified)
    const activeRelays = Array.from(state.relays.values()).filter(r => r.status === 'online').length
    const uptimePercentage = (activeRelays / ALL_RELAY_NODES.length) * 100
    
    document.getElementById('network-uptime').textContent = `${uptimePercentage.toFixed(1)}%`
}

function updateCharts() {
    const now = new Date()
    
    // On first data fetch, add a starting point of 0 to charts
    if (state.isFirstDataFetch) {
        console.log('First chart update - adding initial 0 data points')
        state.isFirstDataFetch = false
        
        // Set baseline values for next calculation
        state.previousStats.totalMessagesProcessed = state.networkStats.totalMessagesProcessed || 0
        state.previousStats.clusterEventsStored = state.networkStats.clusterEventsStored || 0
        
        // Add initial 0 data points to charts
        updateDeltaCharts(0, 0)
        return
    }
    
    // Calculate deltas for chart updates (only after first fetch)
    const currentStats = state.networkStats
    const messagesDelta = Math.max(0, (currentStats.totalMessagesProcessed || 0) - state.previousStats.totalMessagesProcessed)
    const eventsDelta = Math.max(0, (currentStats.clusterEventsStored || 0) - state.previousStats.clusterEventsStored)
    
    console.log('Chart update deltas:', { messagesDelta, eventsDelta })
    
    // Update delta charts
    updateDeltaCharts(messagesDelta, eventsDelta)
    
    // Update previous stats for next calculation
    state.previousStats.totalMessagesProcessed = currentStats.totalMessagesProcessed || 0
    state.previousStats.clusterEventsStored = currentStats.clusterEventsStored || 0
}

function updateLastUpdatedTime() {
    const element = document.getElementById('last-updated')
    if (element) {
        element.textContent = format(new Date(), 'HH:mm:ss')
    }
}

// Cluster discovery and management
async function discoverClusterNodes() {
    console.log('Starting cluster discovery from seed relays...')
    
    let clusterInfo = null
    
    // Try each seed relay until we get cluster information
    for (const seedRelay of SEED_RELAYS) {
        try {
            console.log(`Trying to get cluster info from ${seedRelay.id}...`)
            
            const response = await fetch(`${seedRelay.apiUrl}/api/metrics`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(8000) // Increased timeout
            })
            
            if (response.ok) {
                const data = await response.json()
                if (data.cluster && data.cluster.all_nodes) {
                    clusterInfo = data.cluster
                    console.log(`Got cluster info from ${seedRelay.id}:`, clusterInfo)
                    break
                }
            }
        } catch (error) {
            console.warn(`Failed to get cluster info from ${seedRelay.id}:`, error.message)
            continue
        }
    }
    
    if (!clusterInfo) {
        console.warn('Could not discover cluster topology, falling back to seed relays only')
        ALL_RELAY_NODES = [...SEED_RELAYS]
        
        // Update UI to show fallback count
        const totalRelaysElement = document.getElementById('total-relays')
        if (totalRelaysElement) {
            totalRelaysElement.textContent = SEED_RELAYS.length
        }
        return
    }
    
    // Build complete relay list from cluster information
    const previousRelayIds = new Set(ALL_RELAY_NODES.map(node => node.id))
    const previousNodeIds = new Set(ALL_RELAY_NODES.map(node => node.nodeId || node.id))
    const previousHostnames = new Set(ALL_RELAY_NODES.map(node => node.name))
    
    DISCOVERED_RELAYS = []
    const tempAllNodes = [] // Temporary array to avoid duplicates
    const newlyDiscoveredNodes = []
    
    // First, add all existing seed relays to temp array
    for (const seedRelay of SEED_RELAYS) {
        const existingSeed = ALL_RELAY_NODES.find(n => n.id === seedRelay.id)
        if (existingSeed) {
            tempAllNodes.push(existingSeed)
        }
    }
    
    for (const node of clusterInfo.all_nodes) {
        // Extract hostname from address (remove port)
        const hostname = node.address.split(':')[0]
        
        // Use hostname-based ID for consistency (not node.node_id which can change)
        const nodeId = hostname.replace('.shugur.net', '').replace('.', '-')
        
        // Check if this is one of our known seed relays
        const seedRelay = SEED_RELAYS.find(seed => seed.apiUrl.includes(hostname))
        
        if (seedRelay) {
            // Update existing seed relay with cluster info (don't duplicate)
            const existingNode = tempAllNodes.find(n => n.id === seedRelay.id || n.name === hostname)
            if (existingNode) {
                // Update cluster info on existing node
                existingNode.nodeId = node.node_id
                existingNode.clusterAddress = node.address
                existingNode.sqlAddress = node.sql_address
                existingNode.isLive = node.is_live
                existingNode.ranges = node.ranges
                existingNode.leases = node.leases
                existingNode.startedAt = node.started_at
                existingNode.serverVersion = node.server_version
            } else {
                // Add seed relay if not already in temp array
                tempAllNodes.push({
                    ...seedRelay,
                    nodeId: node.node_id,
                    clusterAddress: node.address,
                    sqlAddress: node.sql_address,
                    isLive: node.is_live,
                    ranges: node.ranges,
                    leases: node.leases,
                    startedAt: node.started_at,
                    serverVersion: node.server_version
                })
            }
        } else {
            // This is a discovered node - check for duplicates by multiple criteria
            const existingNode = tempAllNodes.find(n => 
                n.id === nodeId || 
                n.name === hostname || 
                (n.nodeId && n.nodeId === node.node_id)
            )
            if (!existingNode) {
                const newNode = {
                    id: nodeId,
                    name: hostname,
                    url: `wss://${hostname}`,
                    apiUrl: `https://${hostname}`,
                    nodeId: node.node_id,
                    clusterAddress: node.address,
                    sqlAddress: node.sql_address,
                    isLive: node.is_live,
                    ranges: node.ranges,
                    leases: node.leases,
                    startedAt: node.started_at,
                    serverVersion: node.server_version,
                    isSeed: false
                }
                
                DISCOVERED_RELAYS.push(newNode)
                tempAllNodes.push(newNode)
                
                // Track if this is truly a new node we haven't seen before
                if (!previousRelayIds.has(nodeId) && !previousNodeIds.has(node.node_id) && !previousHostnames.has(hostname)) {
                    newlyDiscoveredNodes.push(newNode)
                }
            } else {
                // Skip duplicate - already exists
            }
        }
    }
    
    // Update ALL_RELAY_NODES with the deduplicated list
    ALL_RELAY_NODES = tempAllNodes
    
    console.log(`Cluster discovery complete:`)
    console.log(`- Total nodes in cluster: ${ALL_RELAY_NODES.length}`)
    console.log(`- Seed relays: ${SEED_RELAYS.length}`)
    console.log(`- Discovered relays: ${DISCOVERED_RELAYS.length}`)
    console.log(`- Newly discovered nodes: ${newlyDiscoveredNodes.length}`)
    console.log(`- Live nodes: ${ALL_RELAY_NODES.filter(n => n.isLive !== false).length}`)
    
    // Get locations for all newly discovered relays
    if (newlyDiscoveredNodes.length > 0) {
        console.log('Getting locations for newly discovered relays...')
        for (const node of newlyDiscoveredNodes) {
            try {
                console.log(`Getting location for newly discovered node: ${node.name}`)
                const location = await getIPLocation(node.name)
                node.location = location
                console.log(`Location for ${node.name}: ${location}`)
                
                // Add to UI if we're past initial load and node doesn't already exist in UI
                const container = document.getElementById('relay-nodes')
                const existingElement = document.getElementById(`relay-${node.id}`)
                if (container && !existingElement) {
                    state.relays.set(node.id, {
                        ...node,
                        location: location,
                        status: node.isLive === false ? 'offline' : 'connecting',
                        connections: 0,
                        uptime: 0,
                        lastSeen: null,
                        responseTime: 0,
                        events: 0
                    })
                    
                    const nodeElement = createRelayNodeElement({...node, location})
                    container.appendChild(nodeElement)
                    console.log(`Added newly discovered node ${node.id} to UI`)
                } else if (existingElement) {
                    console.log(`Node ${node.id} already exists in UI, updating location if needed`)
                    // Update location in existing state if it's different
                    const existingRelay = state.relays.get(node.id)
                    if (existingRelay && existingRelay.location !== location) {
                        existingRelay.location = location
                        const locationElement = document.getElementById(`location-${node.id}`)
                        if (locationElement) {
                            locationElement.textContent = location
                        }
                    }
                }
            } catch (error) {
                console.warn(`Failed to get location for ${node.name}:`, error)
                node.location = detectRelayLocation(node.name)
            }
        }
    }
    
    // Update UI to show total relay count
    const totalRelaysElement = document.getElementById('total-relays')
    if (totalRelaysElement) {
        totalRelaysElement.textContent = ALL_RELAY_NODES.length
    }
}

// Utility functions
async function measureNostrResponseTime(wsUrl) {
    return new Promise((resolve) => {
        const startTime = Date.now()
        let responseTime = 0
        
        try {
            const ws = new WebSocket(wsUrl)
            
            ws.onopen = () => {
                // Send a simple REQ message to test response time
                const reqMessage = JSON.stringify([
                    "REQ", 
                    "test-" + Date.now(),
                    { "kinds": [1], "limit": 1 }
                ])
                ws.send(reqMessage)
            }
            
            ws.onmessage = (event) => {
                responseTime = Date.now() - startTime
                ws.close()
                resolve(responseTime)
            }
            
            ws.onerror = () => {
                ws.close()
                resolve(0) // Return 0 on error
            }
            
            // Timeout after 5 seconds
            setTimeout(() => {
                if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
                    ws.close()
                    resolve(0)
                }
            }, 5000)
            
        } catch (error) {
            console.warn(`Failed to measure Nostr response time for ${wsUrl}:`, error)
            resolve(0)
        }
    })
}

function detectRelayLocation(hostname) {
    // Enhanced location detection based on hostname
    const hostLower = hostname.toLowerCase()
    
    // Check for shugur network nodes - city, country format only
    if (hostLower.includes('shu01')) return 'New York, United States'
    if (hostLower.includes('shu02')) return 'Los Angeles, United States' 
    if (hostLower.includes('shu03')) return 'Frankfurt, Germany'
    if (hostLower.includes('shu04')) return 'Singapore, Singapore'
    if (hostLower.includes('shu05')) return 'Sydney, Australia'
    if (hostLower.includes('shu06')) return 'São Paulo, Brazil'
    if (hostLower.includes('shu07')) return 'Cape Town, South Africa'
    if (hostLower.includes('shu08')) return 'Dubai, UAE'
    
    // For any other shuXX pattern
    const shuMatch = hostLower.match(/shu(\d+)/)
    if (shuMatch) {
        const nodeNum = shuMatch[1]
        return `Shugur Node ${nodeNum}`
    }
    
    // For discovered nodes with numeric patterns
    if (hostLower.includes('node-')) {
        const nodeNum = hostLower.match(/node-(\d+)/)?.[1]
        return nodeNum ? `Cluster Node ${nodeNum}` : 'Cluster Node'
    }
    
    // Extract domain info for better location display
    if (hostLower.includes('shugur.net')) {
        const subdomain = hostLower.split('.')[0]
        return `Shugur Network (${subdomain.toUpperCase()})`
    }
    
    // Generic fallback
    return `Relay Server (${hostname.split('.')[0].toUpperCase()})`
}

// IP location cache to avoid repeated API calls
const locationCache = new Map()

// Function to resolve FQDN to IP address
async function resolveHostnameToIP(hostname) {
    try {
        // Use a DNS resolution service that supports CORS
        const response = await fetch(`https://dns.google/resolve?name=${hostname}&type=A`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
        })
        
        if (!response.ok) {
            throw new Error(`DNS resolution failed: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.Answer && data.Answer.length > 0) {
            // Return the first A record
            const ipAddress = data.Answer.find(record => record.type === 1)?.data
            if (ipAddress) {
                console.log(`Resolved ${hostname} to ${ipAddress}`)
                return ipAddress
            }
        }
        
        throw new Error('No A record found')
        
    } catch (error) {
        console.warn(`Failed to resolve ${hostname} to IP:`, error.message)
        
        // Fallback: try using the hostname directly (some services accept it)
        return hostname
    }
}

// Improved function to get IP-based location
async function getIPLocation(hostname) {
    console.log(`Getting location for hostname: ${hostname}`)
    
    // Check cache first
    if (locationCache.has(hostname)) {
        console.log(`Using cached location for ${hostname}:`, locationCache.get(hostname))
        return locationCache.get(hostname)
    }
    
    try {
        // First resolve hostname to IP
        const ipAddress = await resolveHostnameToIP(hostname)
        
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
        
        console.log(`Getting location for IP: ${ipAddress}`)
        
        // Try ipapi.co first (free tier: 1000 requests/month)
        const response = await fetch(`https://ipapi.co/${ipAddress}/json/`, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
        })
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        console.log(`Location API response for ${ipAddress}:`, data)
        
        if (data.error) {
            throw new Error(data.reason || 'Location lookup failed')
        }
        
        // Format the location nicely - city and country only
        const parts = []
        if (data.city) parts.push(data.city)
        if (data.country_name) parts.push(data.country_name)
        
        const location = parts.length > 0 ? parts.join(', ') : 'Unknown Location'
        
        // Cache the result
        locationCache.set(hostname, location)
        
        return location
        
    } catch (error) {
        console.warn(`Failed to get location for ${hostname}:`, error.message)
        
        // Fallback to the original hostname-based detection
        const fallbackLocation = detectRelayLocation(hostname)
        console.log(`Using fallback location for ${hostname}: ${fallbackLocation}`)
        
        // Cache the fallback too
        locationCache.set(hostname, fallbackLocation)
        
        return fallbackLocation
    }
}

function formatUptime(minutes) {
    if (minutes < 60) {
        return `${minutes}m`
    } else if (minutes < 1440) {
        return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    } else {
        const days = Math.floor(minutes / 1440)
        const hours = Math.floor((minutes % 1440) / 60)
        return `${days}d ${hours}h`
    }
}

function formatUptimeSeconds(seconds) {
    if (seconds < 60) {
        return `${seconds}s`
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60)
        return `${minutes}m`
    } else if (seconds < 86400) {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        return `${hours}h ${minutes}m`
    } else {
        const days = Math.floor(seconds / 86400)
        const hours = Math.floor((seconds % 86400) / 3600)
        return `${days}d ${hours}h`
    }
}

function parseUptimeString(uptimeStr) {
    // Parse uptime strings like "1d 2h 44m" into seconds
    let totalSeconds = 0
    
    const dayMatch = uptimeStr.match(/(\d+)d/)
    const hourMatch = uptimeStr.match(/(\d+)h/)
    const minuteMatch = uptimeStr.match(/(\d+)m/)
    const secondMatch = uptimeStr.match(/(\d+)s/)
    
    if (dayMatch) totalSeconds += parseInt(dayMatch[1]) * 24 * 60 * 60
    if (hourMatch) totalSeconds += parseInt(hourMatch[1]) * 60 * 60
    if (minuteMatch) totalSeconds += parseInt(minuteMatch[1]) * 60
    if (secondMatch) totalSeconds += parseInt(secondMatch[1])
    
    return totalSeconds
}

function formatRelativeTime(date) {
    const now = new Date()
    const diffInSeconds = Math.floor((now - date) / 1000)
    
    if (diffInSeconds < 60) {
        return 'just now'
    } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}m ago`
    } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}h ago`
    } else {
        return format(date, 'MMM dd, HH:mm')
    }
}

function updateDeltaCharts(messagesDelta, eventsDelta) {
    const now = new Date()
    const MAX_CHART_POINTS = 20
    
    console.log(`Adding chart data - Messages delta: ${messagesDelta}, Events delta: ${eventsDelta}`)
    
    // Update messages chart
    const messagesChart = state.charts.messages
    if (messagesChart) {
        messagesChart.data.datasets[0].data.push({
            x: now,
            y: messagesDelta
        })
        
        // Keep only last 20 points
        if (messagesChart.data.datasets[0].data.length > MAX_CHART_POINTS) {
            messagesChart.data.datasets[0].data.shift()
        }
        
        messagesChart.update('quiet')
    }
    
    // Update events chart
    const eventsChart = state.charts.events
    if (eventsChart) {
        eventsChart.data.datasets[0].data.push({
            x: now,
            y: eventsDelta
        })
        
        // Keep only last 20 points
        if (eventsChart.data.datasets[0].data.length > MAX_CHART_POINTS) {
            eventsChart.data.datasets[0].data.shift()
        }
        
        eventsChart.update('quiet')
    }
    
    console.log(`Charts updated - Messages delta: ${messagesDelta}, Events delta: ${eventsDelta}`)
}

// Error handling
window.addEventListener('error', (event) => {
    console.error('Dashboard error:', event.error)
    // Could implement error reporting here
})

// Footer relay list management
function updateFooterRelayList() {
    const container = document.getElementById('footer-relay-list')
    const viewAllButton = document.getElementById('view-all-button')
    
    if (!container) return
    
    // Use the same order as the tiles by following ALL_RELAY_NODES order
    const relayArray = ALL_RELAY_NODES.map(node => {
        const relay = state.relays.get(node.id)
        return relay || node
    }).filter(relay => relay) // Remove any undefined entries
    
    const maxFooterRelays = 4
    const displayedRelays = relayArray.slice(0, maxFooterRelays)
    
    // Generate footer relay list
    container.innerHTML = displayedRelays.map(relay => {
        const nodeId = relay.name || relay.id
        // Check if nodeId already contains .shugur.net, if not add it
        const endpoint = nodeId.includes('.shugur.net') ? `wss://${nodeId}` : `wss://${nodeId}.shugur.net`
        const location = relay.location || getLocationFromId(relay.id)
        
        return `
            <div>
                <code class="bg-gray-100 dark:bg-gray-800 px-1 rounded text-blue-600 dark:text-blue-400">${endpoint}</code>
                <span class="text-gray-500 ml-2">(${location})</span>
            </div>
        `
    }).join('')
    
    // Show/hide "View All" button
    if (relayArray.length > maxFooterRelays) {
        viewAllButton.classList.remove('hidden')
    } else {
        viewAllButton.classList.add('hidden')
    }
}

function getLocationFromId(id) {
    const locationMap = {
        'shu01': 'US-East',
        'shu02': 'US-West', 
        'shu03': 'EU-Central',
        'shu04': 'AP-Southeast',
        'shu05': 'Australia',
        'shu06': 'S-America',
        'shu07': 'Africa',
        'shu08': 'M-East'
    }
    
    // Check direct mapping first
    if (locationMap[id]) {
        return locationMap[id]
    }
    
    // Handle dynamic shuXX pattern
    const shuMatch = id.match(/shu(\d+)/)
    if (shuMatch) {
        return `Node-${shuMatch[1]}`
    }
    
    return 'Unknown'
}

function getStatusColor(status) {
    switch(status) {
        case 'online': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        case 'idle': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
        case 'connecting': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        default: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
}

// Modal management
function openAllRelaysModal() {
    const modal = document.getElementById('all-relays-modal')
    const tableBody = document.getElementById('all-relays-table-body')
    
    if (!modal || !tableBody) return
    
    // Populate table with all relays
    const relayArray = Array.from(state.relays.values())
    tableBody.innerHTML = relayArray.map(relay => {
        const nodeId = relay.name || relay.id
        // Check if nodeId already contains .shugur.net, if not add it
        const endpoint = nodeId.includes('.shugur.net') ? `wss://${nodeId}` : `wss://${nodeId}.shugur.net`
        const location = relay.location || getLocationFromId(relay.id)
        const statusBadge = `<span class="px-2 py-1 text-xs rounded-full ${getStatusColor(relay.status)}">${relay.status || 'offline'}</span>`
        
        return `
            <tr>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                    ${relay.name || relay.id.toUpperCase()}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${statusBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    <code class="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-blue-600 dark:text-blue-400">${endpoint}</code>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${location}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${relay.connections?.toLocaleString() || '--'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${relay.messagesProcessed?.toLocaleString() || '--'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${relay.status === 'online' || relay.status === 'idle' ? `${Math.round(relay.responseTime || 0)}ms` : '--'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${relay.status === 'online' || relay.status === 'idle' ? formatUptimeSeconds(relay.uptime || 0) : '--'}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    ${relay.loadPercentage !== undefined ? `${Math.round(relay.loadPercentage)}%` : '--'}
                </td>
            </tr>
        `
    }).join('')
    
    modal.classList.remove('hidden')
    document.body.style.overflow = 'hidden'
}

function closeAllRelaysModal() {
    const modal = document.getElementById('all-relays-modal')
    if (modal) {
        modal.classList.add('hidden')
        document.body.style.overflow = 'auto'
    }
}

// Make functions global for onclick handlers
window.openAllRelaysModal = openAllRelaysModal
window.closeAllRelaysModal = closeAllRelaysModal

// Export for debugging
window.dashboardState = state
