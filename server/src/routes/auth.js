const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, display_name, email, password } = req.body;

  if (!username || !display_name || !email || !password) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    return res.status(400).json({ error: 'Username must be 3–20 characters (letters, numbers, underscores)' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const hash = bcrypt.hashSync(password, 12);
    const result = db.prepare(
      'INSERT INTO users (username, display_name, email, password) VALUES (lower(?), ?, ?, ?)'
    ).run(username, display_name, email.toLowerCase(), hash);

    const user = db.prepare(
      'SELECT id, username, display_name, email, bio, avatar_url, created_at FROM users WHERE id = ?'
    ).get(result.lastInsertRowid);

    req.session.userId = user.id;
    req.session.save(() => res.status(201).json(user));
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      const field = err.message.includes('username') ? 'Username' : 'Email';
      return res.status(409).json({ error: `${field} is already taken` });
    }
    throw err;
  }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE lower(username) = lower(?)').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  req.session.userId = user.id;
  req.session.save(() => {
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.json(null);
  const user = db.prepare(
    'SELECT id, username, display_name, email, bio, avatar_url, created_at FROM users WHERE id = ?'
  ).get(req.session.userId);
  res.json(user || null);
});

module.exports = router;
