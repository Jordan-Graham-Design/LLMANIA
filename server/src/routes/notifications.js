const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/notifications
router.get('/', requireAuth, (req, res) => {
  const notifications = db.prepare(`
    SELECT
      n.id, n.type, n.tweet_id, n.is_read, n.created_at,
      a.id AS actor_id, a.username AS actor_username,
      a.display_name AS actor_display_name, a.avatar_url AS actor_avatar_url,
      t.content AS tweet_preview
    FROM notifications n
    JOIN users a ON a.id = n.actor_id
    LEFT JOIN tweets t ON t.id = n.tweet_id
    WHERE n.recipient_id = ?
    ORDER BY n.created_at DESC
    LIMIT 50
  `).all(req.user.id);

  res.json(notifications);
});

// GET /api/notifications/unread-count
router.get('/unread-count', requireAuth, (req, res) => {
  const row = db.prepare(
    'SELECT COUNT(*) AS count FROM notifications WHERE recipient_id = ? AND is_read = 0'
  ).get(req.user.id);
  res.json({ count: row.count });
});

// PATCH /api/notifications/read-all
router.patch('/read-all', requireAuth, (req, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE recipient_id = ?').run(req.user.id);
  res.json({ ok: true });
});

module.exports = router;
