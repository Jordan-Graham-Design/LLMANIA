const express = require('express');
const db = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/users/:username
router.get('/:username', optionalAuth, (req, res) => {
  const user = db.prepare(
    'SELECT id, username, display_name, bio, avatar_url, created_at FROM users WHERE lower(username) = lower(?)'
  ).get(req.params.username);

  if (!user) return res.status(404).json({ error: 'User not found' });

  const followerCount  = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE following_id = ?').get(user.id).c;
  const followingCount = db.prepare('SELECT COUNT(*) AS c FROM follows WHERE follower_id = ?').get(user.id).c;
  const tweetCount     = db.prepare('SELECT COUNT(*) AS c FROM tweets WHERE user_id = ? AND retweet_of_id IS NULL').get(user.id).c;

  let isFollowing = false;
  if (req.user && req.user.id !== user.id) {
    isFollowing = !!db.prepare('SELECT 1 FROM follows WHERE follower_id = ? AND following_id = ?').get(req.user.id, user.id);
  }

  res.json({ ...user, follower_count: followerCount, following_count: followingCount, tweet_count: tweetCount, is_following: isFollowing });
});

// GET /api/users/:username/tweets
router.get('/:username/tweets', optionalAuth, (req, res) => {
  const user = db.prepare('SELECT id FROM users WHERE lower(username) = lower(?)').get(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const meId = req.user?.id || 0;
  const { before } = req.query;
  const params = { userId: user.id };
  let extra = '';
  if (before) { extra = ' AND t.id < @before'; params.before = parseInt(before, 10); }

  const tweets = db.prepare(`
    SELECT
      t.id, t.user_id, t.content, t.retweet_of_id, t.reply_to_id, t.created_at,
      u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes WHERE tweet_id = t.id)                                   AS like_count,
      (SELECT COUNT(*) FROM tweets r WHERE r.retweet_of_id = t.id)                         AS retweet_count,
      (SELECT COUNT(*) FROM tweets r WHERE r.reply_to_id   = t.id)                         AS reply_count,
      (SELECT COUNT(*) FROM likes WHERE tweet_id = t.id AND user_id = ${meId})             AS viewer_liked,
      (SELECT COUNT(*) FROM tweets r WHERE r.retweet_of_id = t.id AND r.user_id = ${meId}) AS viewer_retweeted,
      orig_t.content        AS orig_content,
      orig_u.username       AS orig_username,
      orig_u.display_name   AS orig_display_name,
      orig_u.avatar_url     AS orig_avatar_url,
      parent_t.content      AS parent_content,
      parent_u.username     AS parent_username,
      parent_u.display_name AS parent_display_name
    FROM tweets t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN tweets orig_t   ON orig_t.id = t.retweet_of_id
    LEFT JOIN users  orig_u   ON orig_u.id = orig_t.user_id
    LEFT JOIN tweets parent_t ON parent_t.id = t.reply_to_id
    LEFT JOIN users  parent_u ON parent_u.id = parent_t.user_id
    WHERE t.user_id = @userId ${extra}
    ORDER BY t.created_at DESC
    LIMIT 30
  `).all(params);

  res.json(tweets);
});

// PATCH /api/users/me
router.patch('/me', requireAuth, (req, res) => {
  const { display_name, bio, avatar_url } = req.body;
  const updates = {};
  if (display_name !== undefined) updates.display_name = display_name;
  if (bio !== undefined) updates.bio = bio;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  const setClauses = Object.keys(updates).map(k => `${k} = @${k}`).join(', ');
  db.prepare(`UPDATE users SET ${setClauses} WHERE id = @id`).run({ ...updates, id: req.user.id });

  const updated = db.prepare(
    'SELECT id, username, display_name, email, bio, avatar_url, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json(updated);
});

// GET /api/users — search/suggest users (not self, not already following)
router.get('/', optionalAuth, (req, res) => {
  const meId = req.user?.id || 0;
  const { suggest, q } = req.query;

  if (suggest) {
    const users = db.prepare(`
      SELECT id, username, display_name, bio, avatar_url
      FROM users
      WHERE id != ${meId}
        AND id NOT IN (SELECT following_id FROM follows WHERE follower_id = ${meId})
      ORDER BY RANDOM()
      LIMIT 3
    `).all();
    return res.json(users);
  }

  if (q) {
    const users = db.prepare(`
      SELECT id, username, display_name, bio, avatar_url
      FROM users
      WHERE username LIKE @q OR display_name LIKE @q
      LIMIT 10
    `).all({ q: `%${q}%` });
    return res.json(users);
  }

  res.json([]);
});

module.exports = router;
