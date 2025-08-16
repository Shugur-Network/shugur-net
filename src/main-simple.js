// Simple approach implementation

// 1. NORMAL DATA: Direct API calls to relays (like original)
async function fetchRelayDataDirect() {
    let activeCount = 0;
    let totalConnections = 0;
    let totalEvents = 0;
    let totalMessagesProcessed = 0;

    // Fetch data from each relay node directly
    const promises = ALL_RELAY_NODES.map(async (node) => {
        const relay = state.relays.get(node.id);
        if (!relay) return;
        
        try {
            // Direct API call to relay
            let response = await fetch(`${node.apiUrl}/api/metrics`, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000)
            });

            let data;
            if (!response.ok) {
                // Fall back to basic stats endpoint
                response = await fetch(`${node.apiUrl}/api/stats`, {
                    method: 'GET',
                    headers: { 'Accept': 'application/json' },
                    signal: AbortSignal.timeout(5000)
                });
                data = await response.json();
            } else {
                data = await response.json();
            }

            // Update relay with real data
            relay.status = data.status || 'offline';
            relay.connections = Math.max(0, data.active_connections || 0);
            relay.uptime = data.uptime_human || '--';
            relay.load = data.load_percentage || 0;
            relay.messagesProcessed = data.messages_processed || 0;
            relay.eventsPerSecond = data.events_per_second || 0;
            relay.memoryUsage = data.memory_usage ? 
                Math.round((data.memory_usage.alloc || 0) / 1024 / 1024) : 0; // MB
            
            // Accumulate totals
            if (relay.status === 'online' || relay.status === 'idle') {
                activeCount++;
                totalConnections += relay.connections;
                totalEvents += data.events_stored || 0;
                totalMessagesProcessed += relay.messagesProcessed;
            }

            // 3. SERVERLESS RESPONSE TIME: Fire and forget call to measure and store
            measureAndStoreResponseTime(node.id, node.url);

            // Update UI
            updateRelayDisplay(relay);

        } catch (error) {
            console.warn(`Failed to fetch data for ${node.id}:`, error);
            relay.status = 'offline';
            relay.connections = 0;
            updateRelayDisplay(relay);
        }
    });

    await Promise.all(promises);

    // Update network overview
    state.network.totalConnections = totalConnections;
    state.network.activeRelays = activeCount;
    state.network.totalRelays = ALL_RELAY_NODES.length;
    state.network.totalEvents = totalEvents;
    state.network.totalMessagesProcessed = totalMessagesProcessed;

    return { activeCount, totalConnections, totalEvents, totalMessagesProcessed };
}

// 2. GEOLOCATION: Serverless function (existing)
async function updateRelayLocation(relayId) {
    try {
        const response = await fetch('/.netlify/functions/geolocation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ relayId })
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.location) {
                const relay = state.relays.get(relayId);
                if (relay) {
                    relay.location = `${result.location.city}, ${result.location.country}`;
                    updateRelayDisplay(relay);
                }
            }
        }
    } catch (error) {
        console.warn(`Failed to update location for ${relayId}:`, error);
    }
}

// 3. RESPONSE TIME: Serverless function that measures AND stores in database
async function measureAndStoreResponseTime(relayId, relayUrl) {
    try {
        // Fire and forget - this will measure response time and store in database
        fetch('/.netlify/functions/measure-response-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                relayId,
                relayUrl,
                storeInDatabase: true // Flag to store result in database
            })
        }).catch(() => {}); // Silent fail for fire-and-forget
        
    } catch (error) {
        // Silent fail - this is a background operation
    }
}

// Get stored response times from database (for display)
async function getStoredResponseTimes() {
    try {
        const response = await fetch('/.netlify/functions/get-response-times', {
            method: 'GET',
            headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.responseTimes) {
                // Update relay displays with stored response times
                result.responseTimes.forEach(rt => {
                    const relay = state.relays.get(rt.relayId);
                    if (relay && rt.responseTime) {
                        relay.responseTime = rt.responseTime;
                        updateRelayDisplay(relay);
                    }
                });
            }
        }
    } catch (error) {
        console.warn('Failed to get stored response times:', error);
    }
}

export { 
    fetchRelayDataDirect, 
    updateRelayLocation, 
    measureAndStoreResponseTime, 
    getStoredResponseTimes 
};
