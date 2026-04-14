// Absolute minimal handler - no imports
export default (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).end(JSON.stringify({ minimal: true, time: new Date().toISOString() }));
};
