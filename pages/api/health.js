// Health check API route proxy
export default async function handler(req, res) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.BACKEND_URL || 'https://tars-oauth-api.railway.app';
  
  try {
    const response = await fetch(`${backendUrl}/health`, {
      method: req.method,
      headers: {
        'Accept': 'text/plain',
        ...(req.body && { 'Content-Type': 'application/json' })
      },
      body: req.body ? JSON.stringify(req.body) : undefined
    });
    
    const contentType = response.headers.get('content-type');
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.status(response.status).json(data);
    } else {
      const text = await response.text();
      res.status(response.status).send(text);
    }
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({ error: 'Backend unreachable', details: error.message });
  }
}
