export default (req, res) => {
  console.log('PING: Handler called');
  res.json({ pong: true });
};
