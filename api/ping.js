module.exports = (req, res) => {
  console.log('PING HANDLER CALLED');
  res.json({ pong: true });
};
