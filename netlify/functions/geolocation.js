// Netlify function to proxy geolocation requests and solve CORS issues
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    }
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  // Extract IP from query parameters
  const ip = event.queryStringParameters?.ip
  if (!ip) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'IP address required' }),
    }
  }

  try {
    // Try multiple geolocation APIs
    const geoAPIs = [
      {
        name: 'ipapi.co',
        url: `https://ipapi.co/${ip}/json/`,
        formatResponse: (data) => {
          if (data.error) throw new Error(data.reason || 'ipapi.co error')
          const parts = []
          if (data.city) parts.push(data.city)
          if (data.country_name) parts.push(data.country_name)
          return parts.length > 0 ? parts.join(', ') : null
        }
      },
      {
        name: 'ip-api.com',
        url: `http://ip-api.com/json/${ip}?fields=status,message,country,regionName,city`,
        formatResponse: (data) => {
          if (data.status === 'fail') throw new Error(data.message || 'ip-api.com error')
          const parts = []
          if (data.city) parts.push(data.city)
          if (data.country) parts.push(data.country)
          return parts.length > 0 ? parts.join(', ') : null
        }
      },
      {
        name: 'ipinfo.io',
        url: `https://ipinfo.io/${ip}/json`,
        formatResponse: (data) => {
          if (data.error) throw new Error(data.error.message || 'ipinfo.io error')
          const parts = []
          if (data.city) parts.push(data.city)
          if (data.country) parts.push(data.country)
          return parts.length > 0 ? parts.join(', ') : null
        }
      }
    ]

    // Try each API until one works
    for (const api of geoAPIs) {
      try {
        const response = await fetch(api.url, {
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(8000)
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        const location = api.formatResponse(data)
        
        if (location) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ 
              location,
              source: api.name,
              ip: ip
            }),
          }
        }
        
      } catch (error) {
        // Continue to next API
      }
    }

    // All APIs failed
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        error: 'All geolocation APIs failed',
        fallback: true 
      }),
    }

  } catch (error) {
    console.error('Geolocation function error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}
