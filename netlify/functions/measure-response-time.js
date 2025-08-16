// Simple Nostr response time measurement function
const WebSocket = require('ws');

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
        const { relayUrl } = JSON.parse(event.body || '{}');
        
        if (!relayUrl) {
            return {
                statusCode: 400,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Relay URL is required' })
            };
        }
        
        // Measure Nostr response time
        const responseTime = await measureNostrResponseTime(relayUrl);
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                success: true, 
                responseTime,
                relayUrl,
                measuredAt: new Date().toISOString()
            })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ error: error.message })
        };
    }
};

async function measureNostrResponseTime(relayUrl) {
    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            resolve(null); // Return null instead of rejecting
        }, 5000);
        
        try {
            const ws = new WebSocket(relayUrl);
            const startTime = Date.now();
            
            ws.on('open', () => {
                // Send a simple REQ message
                const reqMessage = ['REQ', 'test-ping', { limit: 1 }];
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
