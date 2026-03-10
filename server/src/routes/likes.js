const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// POST /api/likes/:tweetId
router.post('/:tweetId', requireAuth, (req, res) => {
  const tweetId = parseInt(req.params.tweetId, 10);
  const tweet = db.prepare('SELECT * FROM tweets WHERE id = ?').get(tweetId);
  if (!tweet) return res.status(404).json({ error: 'Tweet not found' });

  db.prepare('INSERT OR IGNORE INTO likes (user_id, tweet_id) VALUES (?, ?)').run(req.user.id, tweetId);

  // Notification (no self-notification)
  if (tweet.user_id !== req.user.id) {
    const already = db.prepare(
      'SELECT id FROM notifications WHERE recipient_id = ? AND actor_id = ? AND type = ? AND tweet_id = ?'
    ).get(tweet.user_id, req.user.id, 'like', tweetId);

    if (!already) {
      db.prepare(
        'INSERT INTO notifications (recipient_id, actor_id, type, tweet_id) VALUES (?, ?, ?, ?)'
      ).run(tweet.user_id, req.user.id, 'like', tweetId);
    }
  }

  const count = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE tweet_id = ?').get(tweetId).c;
  res.json({ ok: true, like_count: count });
});

// DELETE /api/likes/:tweetId
router.delete('/:tweetId', requireAuth, (req, res) => {
  const tweetId = parseInt(req.params.tweetId, 10);
  db.prepare('DELETE FROM likes WHERE user_id = ? AND tweet_id = ?').run(req.user.id, tweetId);
  const count = db.prepare('SELECT COUNT(*) AS c FROM likes WHERE tweet_id = ?').get(tweetId).c;
  res.json({ ok: true, like_count: count });
});

module.exports = router;
