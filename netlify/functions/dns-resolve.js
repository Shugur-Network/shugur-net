// Netlify function to resolve DNS and solve CORS issues
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

  // Extract hostname from query parameters
  const hostname = event.queryStringParameters?.hostname
  if (!hostname) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Hostname required' }),
    }
  }

  try {
    // Use DNS resolution service
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
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ 
            hostname,
            ip: ipAddress,
            success: true
          }),
        }
      }
    }
    
    throw new Error('No A records found')

  } catch (error) {
    console.error('DNS resolution error:', error)
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        hostname,
        ip: hostname, // Fallback to hostname
        success: false,
        error: error.message
      }),
    }
  }
}
