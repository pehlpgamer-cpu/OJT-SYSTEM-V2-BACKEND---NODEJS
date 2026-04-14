// Minimal CommonJS handler for Vercel
module.exports = (req, res) => {
  res.status(200).json({ 
    status: 'pong',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url
  });
};
