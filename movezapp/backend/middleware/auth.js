const jwt = require('jsonwebtoken');

module.exports = function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Expect decoded to contain at least a user id.
    // Normalize to { id, ... } for downstream code.
    const id = decoded.id || decoded.userId || decoded.sub;
    if (!id) {
      return res.status(401).json({ error: 'Token missing user id' });
    }

    req.user = { ...decoded, id };
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};
