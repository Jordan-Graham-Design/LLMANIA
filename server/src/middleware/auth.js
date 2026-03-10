const db = require('../db/database');

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  const user = db.prepare('SELECT id, username, display_name, email, bio, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  req.user = user;
  next();
}

function optionalAuth(req, res, next) {
  req.user = null;
  if (!req.session.userId) return next();
  const user = db.prepare('SELECT id, username, display_name, email, bio, avatar_url, created_at FROM users WHERE id = ?').get(req.session.userId);
  if (user) req.user = user;
  next();
}

module.exports = { requireAuth, optionalAuth };
