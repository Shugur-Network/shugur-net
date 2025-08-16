// Test script to debug response time measurement
import WebSocket from 'ws';

const RELAYS = [
    'wss://shu01.shugur.net',
    'wss://shu02.shugur.net', 
    'wss://shu03.shugur.net',
    'wss://shu04.shugur.net'
];

async function testDirectConnection(relayUrl) {
    console.log(`\n🔍 Testing ${relayUrl}...`);
    
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.log(`❌ ${relayUrl}: Timeout (5s)`);
            resolve({ relayUrl, status: 'timeout', responseTime: null });
        }, 5000);
        
        try {
            const ws = new WebSocket(relayUrl);
            const startTime = Date.now();
            let connectionTime = null;
            let firstMessageTime = null;
            
            ws.on('open', () => {
                connectionTime = Date.now() - startTime;
                console.log(`✅ ${relayUrl}: Connected in ${connectionTime}ms`);
                
                // Send a simple REQ message
                const reqMessage = ['REQ', 'test-ping', { limit: 1 }];
                ws.send(JSON.stringify(reqMessage));
                console.log(`📤 ${relayUrl}: Sent REQ message`);
            });
            
            ws.on('message', (data) => {
                try {
                    if (!firstMessageTime) {
                        firstMessageTime = Date.now() - startTime;
                        console.log(`📥 ${relayUrl}: First message in ${firstMessageTime}ms`);
                    }
                    
                    const message = JSON.parse(data.toString());
                    console.log(`📜 ${relayUrl}: Received:`, message[0], message[1] || '');
                    
                    // Look for EOSE (End of Stored Events) or EVENT response
                    if (message[0] === 'EOSE' || message[0] === 'EVENT') {
                        const responseTime = Date.now() - startTime;
                        console.log(`🎯 ${relayUrl}: Response time: ${responseTime}ms (${message[0]})`);
                        clearTimeout(timeout);
                        ws.close();
                        resolve({ 
                            relayUrl, 
                            status: 'success', 
                            responseTime, 
                            connectionTime, 
                            firstMessageTime,
                            responseType: message[0]
                        });
                    }
                } catch (e) {
                    console.log(`❓ ${relayUrl}: Parse error:`, e.message);
                }
            });
            
            ws.on('error', (error) => {
                console.log(`❌ ${relayUrl}: WebSocket error:`, error.message);
                clearTimeout(timeout);
                resolve({ relayUrl, status: 'error', error: error.message });
            });
            
            ws.on('close', (code, reason) => {
                console.log(`🔌 ${relayUrl}: Connection closed (${code}): ${reason}`);
                clearTimeout(timeout);
                if (!firstMessageTime) {
                    resolve({ relayUrl, status: 'closed_early', responseTime: null });
                }
            });
            
        } catch (error) {
            console.log(`❌ ${relayUrl}: Connection failed:`, error.message);
            clearTimeout(timeout);
            resolve({ relayUrl, status: 'failed', error: error.message });
        }
    });
}

async function testAllRelays() {
    console.log('🚀 Testing Nostr response times for all relays...\n');
    
    for (const relayUrl of RELAYS) {
        const result = await testDirectConnection(relayUrl);
        
        if (result.status === 'success') {
            console.log(`✅ ${result.relayUrl}: ${result.responseTime}ms (${result.responseType})`);
        } else {
            console.log(`❌ ${result.relayUrl}: ${result.status}`);
        }
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n🏁 Test completed!');
}

testAllRelays().catch(console.error);
