export default async function handler(req, res) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://tars-oauth-api.railway.app';
  
  try {
    const url = new URL(`${backendUrl}/auth/google`);
    
    // Forward query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => url.searchParams.append(key, v));
      } else {
        url.searchParams.append(key, value);
      }
    });
    
    console.log(`[OAuth] Proxying ${req.method} ${url.toString()}`);
    
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers['user-agent'] || '',
        'Accept': req.headers['accept'] || 'application/json',
        ...(req.headers['cookie'] && { 'Cookie': req.headers['cookie'] })
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' && req.body ? JSON.stringify(req.body) : undefined,
      redirect: 'manual'
    });
    
    // Copy response headers (but exclude hop-by-hop headers)
    const headersToSkip = [
      'transfer-encoding', 
      'content-encoding',
      'connection',
      'keep-alive',
      'upgrade'
    ];
    
    response.headers.forEach((value, key) => {
      if (!headersToSkip.includes(key.toLowerCase())) {
        res.setHeader(key, value);
      }
    });
    
    // Handle redirects (3xx responses) - especially important for OAuth flows
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      console.log(`[OAuth] Redirect to: ${location}`);
      if (location) {
        res.status(response.status).setHeader('Location', location).end();
        return;
      }
    }
    
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Auth proxy error:', error);
    res.status(503).json({ error: 'Backend unreachable', details: error.message });
  }
}
