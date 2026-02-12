export default async function handler(req, res) {
  res.json({
    message: "Debug endpoint working",
    method: req.method,
    path: req.url,
    query: req.query,
    headers: {
      host: req.headers.host,
      'user-agent': req.headers['user-agent']
    }
  });
}
