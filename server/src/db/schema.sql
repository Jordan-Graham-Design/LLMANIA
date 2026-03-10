PRAGMA journal_mode=WAL;
PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT    NOT NULL UNIQUE,
  display_name TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE,
  password     TEXT    NOT NULL,
  bio          TEXT    DEFAULT '',
  avatar_url   TEXT    DEFAULT NULL,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

CREATE TABLE IF NOT EXISTS tweets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content       TEXT    NOT NULL CHECK(length(content) <= 280),
  retweet_of_id INTEGER DEFAULT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  reply_to_id   INTEGER DEFAULT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_tweets_user_id    ON tweets(user_id);
CREATE INDEX IF NOT EXISTS idx_tweets_created_at ON tweets(created_at DESC);

CREATE TABLE IF NOT EXISTS likes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tweet_id   INTEGER NOT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(user_id, tweet_id)
);
CREATE INDEX IF NOT EXISTS idx_likes_tweet_id ON likes(tweet_id);

CREATE TABLE IF NOT EXISTS follows (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  follower_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(follower_id, following_id),
  CHECK(follower_id != following_id)
);
CREATE INDEX IF NOT EXISTS idx_follows_follower  ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

CREATE TABLE IF NOT EXISTS notifications (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT    NOT NULL CHECK(type IN ('like','retweet','follow','reply')),
  tweet_id     INTEGER DEFAULT NULL REFERENCES tweets(id) ON DELETE CASCADE,
  is_read      INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS sessions (
  sid        TEXT    PRIMARY KEY,
  data       TEXT    NOT NULL,
  expires_at INTEGER NOT NULL
);
