const express = require('express');
const db = require('../db/database');
const { requireAuth, optionalAuth } = require('../middleware/auth');

const router = express.Router();

// Build the main tweet SELECT with counts and viewer state
function buildTweetQuery({ whereClause = '1=1', params = {}, meId = 0 }) {
  return db.prepare(`
    SELECT
      t.id, t.user_id, t.content, t.retweet_of_id, t.reply_to_id, t.created_at,
      u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes  WHERE tweet_id = t.id)                                   AS like_count,
      (SELECT COUNT(*) FROM tweets r WHERE r.retweet_of_id = t.id)                          AS retweet_count,
      (SELECT COUNT(*) FROM tweets r WHERE r.reply_to_id   = t.id)                          AS reply_count,
      (SELECT COUNT(*) FROM likes  WHERE tweet_id = t.id AND user_id = ${meId})             AS viewer_liked,
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
    WHERE ${whereClause}
    ORDER BY t.created_at DESC
    LIMIT 30
  `);
}

// GET /api/tweets — global feed
router.get('/', optionalAuth, (req, res) => {
  const meId = req.user?.id || 0;
  const { before, after, search } = req.query;

  let whereClause = '1=1';
  const params = {};

  if (before) {
    whereClause += ' AND t.id < @before';
    params.before = parseInt(before, 10);
  }
  if (after) {
    whereClause += ' AND t.id > @after';
    params.after = parseInt(after, 10);
  }
  if (search) {
    whereClause += ' AND (t.content LIKE @search OR u.username LIKE @search OR u.display_name LIKE @search)';
    params.search = `%${search}%`;
  }

  const stmt = buildTweetQuery({ whereClause, params, meId });
  const tweets = stmt.all(params);
  res.json(tweets);
});

// GET /api/tweets/following — following feed
router.get('/following', requireAuth, (req, res) => {
  const meId = req.user.id;
  const { before } = req.query;

  let whereClause = `t.user_id IN (SELECT following_id FROM follows WHERE follower_id = ${meId}) OR t.user_id = ${meId}`;
  const params = {};

  if (before) {
    whereClause = `(${whereClause}) AND t.id < @before`;
    params.before = parseInt(before, 10);
  }

  const stmt = buildTweetQuery({ whereClause, params, meId });
  const tweets = stmt.all(params);
  res.json(tweets);
});

// GET /api/tweets/:id — single tweet for detail view
router.get('/:id', optionalAuth, (req, res) => {
  const meId = req.user?.id || 0;
  const tweetId = parseInt(req.params.id, 10);

  const tweet = buildTweetQuery({ whereClause: 't.id = @id', params: { id: tweetId }, meId })
    .get({ id: tweetId });

  if (!tweet) return res.status(404).json({ error: 'Tweet not found' });
  res.json(tweet);
});

// GET /api/tweets/:id/replies — replies in chronological order
router.get('/:id/replies', optionalAuth, (req, res) => {
  const meId = req.user?.id || 0;
  const tweetId = parseInt(req.params.id, 10);
  const { before } = req.query;

  let whereClause = 't.reply_to_id = @tweetId';
  const params = { tweetId };

  if (before) {
    whereClause += ' AND t.id < @before';
    params.before = parseInt(before, 10);
  }

  const replies = db.prepare(`
    SELECT
      t.id, t.user_id, t.content, t.retweet_of_id, t.reply_to_id, t.created_at,
      u.username, u.display_name, u.avatar_url,
      (SELECT COUNT(*) FROM likes  WHERE tweet_id = t.id)                                   AS like_count,
      (SELECT COUNT(*) FROM tweets r WHERE r.retweet_of_id = t.id)                          AS retweet_count,
      (SELECT COUNT(*) FROM tweets r WHERE r.reply_to_id   = t.id)                          AS reply_count,
      (SELECT COUNT(*) FROM likes  WHERE tweet_id = t.id AND user_id = ${meId})             AS viewer_liked,
      (SELECT COUNT(*) FROM tweets r WHERE r.retweet_of_id = t.id AND r.user_id = ${meId}) AS viewer_retweeted,
      NULL AS orig_content, NULL AS orig_username, NULL AS orig_display_name, NULL AS orig_avatar_url,
      parent_t.content      AS parent_content,
      parent_u.username     AS parent_username,
      parent_u.display_name AS parent_display_name
    FROM tweets t
    JOIN users u ON u.id = t.user_id
    LEFT JOIN tweets parent_t ON parent_t.id = t.reply_to_id
    LEFT JOIN users  parent_u ON parent_u.id = parent_t.user_id
    WHERE ${whereClause}
    ORDER BY t.created_at ASC
    LIMIT 50
  `).all(params);

  res.json(replies);
});

// POST /api/tweets — create tweet
router.post('/', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Tweet content is required' });
  }
  if (content.length > 280) {
    return res.status(400).json({ error: 'Tweet must be 280 characters or fewer' });
  }

  const result = db.prepare(
    'INSERT INTO tweets (user_id, content) VALUES (?, ?)'
  ).run(req.user.id, content.trim());

  const meId = req.user.id;
  const tweet = buildTweetQuery({ whereClause: 't.id = @id', params: { id: result.lastInsertRowid }, meId })
    .get({ id: result.lastInsertRowid });

  res.status(201).json(tweet);
});

// POST /api/tweets/:id/reply
router.post('/:id/reply', requireAuth, (req, res) => {
  const parentId = parseInt(req.params.id, 10);
  const { content } = req.body;

  if (!content || content.trim().length === 0) {
    return res.status(400).json({ error: 'Reply content is required' });
  }
  if (content.length > 280) {
    return res.status(400).json({ error: 'Reply must be 280 characters or fewer' });
  }

  const parent = db.prepare('SELECT * FROM tweets WHERE id = ?').get(parentId);
  if (!parent) return res.status(404).json({ error: 'Tweet not found' });

  const result = db.prepare(
    'INSERT INTO tweets (user_id, content, reply_to_id) VALUES (?, ?, ?)'
  ).run(req.user.id, content.trim(), parentId);

  // Notification — no self-notification
  if (parent.user_id !== req.user.id) {
    db.prepare(
      'INSERT INTO notifications (recipient_id, actor_id, type, tweet_id) VALUES (?, ?, ?, ?)'
    ).run(parent.user_id, req.user.id, 'reply', parentId);
  }

  const meId = req.user.id;
  const reply = buildTweetQuery({ whereClause: 't.id = @id', params: { id: result.lastInsertRowid }, meId })
    .get({ id: result.lastInsertRowid });

  res.status(201).json(reply);
});

// POST /api/tweets/:id/retweet
router.post('/:id/retweet', requireAuth, (req, res) => {
  const tweetId = parseInt(req.params.id, 10);
  const original = db.prepare('SELECT * FROM tweets WHERE id = ?').get(tweetId);
  if (!original) return res.status(404).json({ error: 'Tweet not found' });

  const existing = db.prepare(
    'SELECT id FROM tweets WHERE user_id = ? AND retweet_of_id = ?'
  ).get(req.user.id, tweetId);

  if (existing) return res.status(409).json({ error: 'Already retweeted' });

  const result = db.prepare(
    'INSERT INTO tweets (user_id, content, retweet_of_id) VALUES (?, ?, ?)'
  ).run(req.user.id, '', tweetId);

  if (original.user_id !== req.user.id) {
    db.prepare(
      'INSERT INTO notifications (recipient_id, actor_id, type, tweet_id) VALUES (?, ?, ?, ?)'
    ).run(original.user_id, req.user.id, 'retweet', tweetId);
  }

  res.status(201).json({ ok: true, id: result.lastInsertRowid });
});

// DELETE /api/tweets/:id/retweet
router.delete('/:id/retweet', requireAuth, (req, res) => {
  const tweetId = parseInt(req.params.id, 10);
  db.prepare(
    'DELETE FROM tweets WHERE user_id = ? AND retweet_of_id = ?'
  ).run(req.user.id, tweetId);
  res.json({ ok: true });
});

// DELETE /api/tweets/:id
router.delete('/:id', requireAuth, (req, res) => {
  const tweet = db.prepare('SELECT * FROM tweets WHERE id = ?').get(req.params.id);
  if (!tweet) return res.status(404).json({ error: 'Tweet not found' });
  if (tweet.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  db.prepare('DELETE FROM tweets WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
