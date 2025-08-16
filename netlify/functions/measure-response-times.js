// Scheduled serverless function to measure all relay response times
// Runs every 30 seconds and stores results for dashboard to fetch
const WebSocket = require('ws');

// In-memory cache (you could use a database like Upstash Redis for persistence)
let responseTimeCache = {
    lastUpdated: null,
    measurements: {}
};

const RELAYS = [
    { id: 'shu01', url: 'wss://shu01.shugur.net' },
    { id: 'shu02', url: 'wss://shu02.shugur.net' },
    { id: 'shu03', url: 'wss://shu03.shugur.net' },
    { id: 'shu04', url: 'wss://shu04.shugur.net' }
];

async function measureSingleRelayResponseTime(relayUrl) {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            resolve(null);
        }, 5000);
        
        try {
            const ws = new WebSocket(relayUrl);
            const startTime = Date.now();
            
            ws.on('open', () => {
                // Send a simple REQ message
                const reqMessage = ['REQ', 'ping-test', { limit: 1 }];
                ws.send(JSON.stringify(reqMessage));
            });
            
            ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    // Look for EOSE (End of Stored Events) or EVENT response
                    if (message[0] === 'EOSE' || message[0] === 'EVENT') {
                        const responseTime = Date.now() - startTime;
                        clearTimeout(timeout);
                        ws.close();
                        resolve(responseTime);
                    }
                } catch (e) {
                    // Ignore parsing errors
                }
            });
            
            ws.on('error', () => {
                clearTimeout(timeout);
                resolve(null);
            });
            
            ws.on('close', () => {
                clearTimeout(timeout);
                resolve(null);
            });
            
        } catch (error) {
            clearTimeout(timeout);
            resolve(null);
        }
    });
}

async function measureAllRelayResponseTimes() {
    console.log('🔄 Measuring response times for all relays...');
    const results = {};
    
    // Measure all relays in parallel for efficiency
    const promises = RELAYS.map(async (relay) => {
        const responseTime = await measureSingleRelayResponseTime(relay.url);
        return { id: relay.id, url: relay.url, responseTime };
    });
    
    const measurements = await Promise.all(promises);
    
    // Store results
    measurements.forEach(({ id, url, responseTime }) => {
        results[id] = {
            responseTime,
            measuredAt: new Date().toISOString(),
            url
        };
        console.log(`📊 ${id}: ${responseTime ? responseTime + 'ms' : 'timeout'}`);
    });
    
    // Update cache
    responseTimeCache = {
        lastUpdated: new Date().toISOString(),
        measurements: results
    };
    
    console.log('✅ All response times measured and cached');
    return results;
}

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }
    
    try {
        if (event.httpMethod === 'POST') {
            // Triggered by cron job or webhook - measure response times
            const results = await measureAllRelayResponseTimes();
            
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    success: true,
                    message: 'Response times measured',
                    results,
                    timestamp: new Date().toISOString()
                })
            };
        } else if (event.httpMethod === 'GET') {
            // Dashboard requesting cached response times
            return {
                statusCode: 200,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json',
                    'Cache-Control': 'max-age=30' // Cache for 30 seconds
                },
                body: JSON.stringify({
                    success: true,
                    data: responseTimeCache,
                    cacheAge: responseTimeCache.lastUpdated ? 
                        Math.round((Date.now() - new Date(responseTimeCache.lastUpdated).getTime()) / 1000) + 's' : 
                        'no data'
                })
            };
        } else {
            return {
                statusCode: 405,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Method not allowed' })
            };
        }
        
    } catch (error) {
        console.error('Response time measurement error:', error);
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                error: error.message,
                success: false 
            })
        };
    }
};
