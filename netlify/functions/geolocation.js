// Simple geolocation function
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
        const { hostname } = JSON.parse(event.body || '{}');
        
        if (!hostname) {
            return {
                statusCode: 400,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Hostname is required' })
            };
        }
        
        // Simple DNS resolution to get IP
        const dns = require('dns').promises;
        let ipAddress;
        
        try {
            const addresses = await dns.resolve4(hostname);
            ipAddress = addresses[0];
        } catch (error) {
            return {
                statusCode: 500,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Failed to resolve hostname' })
            };
        }
        
        // Get geolocation using free IP API
        const response = await fetch(`http://ip-api.com/json/${ipAddress}`);
        const geoData = await response.json();
        
        if (geoData.status !== 'success') {
            return {
                statusCode: 500,
                headers: {
                    ...headers,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ error: 'Failed to get geolocation' })
            };
        }
        
        const result = {
            hostname,
            ipAddress,
            location: `${geoData.city}, ${geoData.country}`,
            city: geoData.city,
            country: geoData.country,
            countryCode: geoData.countryCode,
            region: geoData.regionName,
            latitude: geoData.lat,
            longitude: geoData.lon,
            timezone: geoData.timezone,
            isp: geoData.isp,
            org: geoData.org
        };
        
        return {
            statusCode: 200,
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ success: true, data: result })
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