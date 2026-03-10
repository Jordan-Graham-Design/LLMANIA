const express = require('express');
const db = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/follows/:username
router.post('/:username', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'Cannot follow yourself' });

  try {
    db.prepare('INSERT INTO follows (follower_id, following_id) VALUES (?, ?)').run(req.user.id, target.id);

    // Notification
    db.prepare(
      'INSERT INTO notifications (recipient_id, actor_id, type) VALUES (?, ?, ?)'
    ).run(target.id, req.user.id, 'follow');

    res.json({ ok: true, following: true });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.json({ ok: true, following: true });
    throw err;
  }
});

// DELETE /api/follows/:username
router.delete('/:username', requireAuth, (req, res) => {
  const target = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(req.params.username);
  if (!target) return res.status(404).json({ error: 'User not found' });

  db.prepare('DELETE FROM follows WHERE follower_id = ? AND following_id = ?').run(req.user.id, target.id);
  res.json({ ok: true, following: false });
});

// GET /api/follows/:username/followers
router.get('/:username/followers', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const followers = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url
    FROM follows f JOIN users u ON u.id = f.follower_id
    WHERE f.following_id = ?
    ORDER BY f.created_at DESC
  `).all(user.id);
  res.json(followers);
});

// GET /api/follows/:username/following
router.get('/:username/following', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const following = db.prepare(`
    SELECT u.id, u.username, u.display_name, u.bio, u.avatar_url
    FROM follows f JOIN users u ON u.id = f.following_id
    WHERE f.follower_id = ?
    ORDER BY f.created_at DESC
  `).all(user.id);
  res.json(following);
});

module.exports = router;
