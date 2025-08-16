// Simple script to trigger response time measurements every 30 seconds
// This can be run locally or set up as a cron job

const FUNCTION_URL = process.env.NETLIFY_FUNCTION_URL || 'https://your-site.netlify.app/.netlify/functions/measure-response-times';

async function triggerMeasurement() {
    try {
        console.log('🔄 Triggering response time measurement...');
        
        const response = await fetch(FUNCTION_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ trigger: 'cron' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Response times measured successfully');
            console.log('📊 Results:');
            Object.entries(result.results).forEach(([id, data]) => {
                console.log(`   ${id}: ${data.responseTime ? data.responseTime + 'ms' : 'timeout'}`);
            });
        } else {
            console.error('❌ Measurement failed:', result.error);
        }
        
    } catch (error) {
        console.error('❌ Failed to trigger measurement:', error.message);
    }
}

async function startScheduler() {
    console.log('🚀 Starting response time measurement scheduler (every 30 seconds)...');
    console.log(`📡 Function URL: ${FUNCTION_URL}`);
    
    // Initial measurement
    await triggerMeasurement();
    
    // Schedule every 30 seconds
    setInterval(triggerMeasurement, 30000);
}

// Check if script is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    startScheduler().catch(console.error);
}

export { triggerMeasurement, startScheduler };
