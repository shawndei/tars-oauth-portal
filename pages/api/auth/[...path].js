export default async function handler(req, res) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://tars-oauth-api.railway.app';
  const { path = [] } = req.query;
  const pathString = Array.isArray(path) ? path.join('/') : path;
  
  try {
    const url = new URL(`${backendUrl}/auth/${pathString}`);
    
    // Forward query parameters
    Object.entries(req.query).forEach(([key, value]) => {
      if (key !== 'path') {
        url.searchParams.append(key, value);
      }
    });
    
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        // Forward important headers
        'User-Agent': req.headers['user-agent'] || '',
        'Accept': req.headers['accept'] || 'application/json',
        ...(req.headers['cookie'] && { 'Cookie': req.headers['cookie'] })
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
      redirect: 'manual'
    });
    
    // Copy response headers
    response.headers.forEach((value, key) => {
      if (!['transfer-encoding', 'content-encoding'].includes(key)) {
        res.setHeader(key, value);
      }
    });
    
    // Handle redirects (for OAuth redirects)
    if (response.status === 301 || response.status === 302 || response.status === 303 || response.status === 307 || response.status === 308) {
      const location = response.headers.get('location');
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
