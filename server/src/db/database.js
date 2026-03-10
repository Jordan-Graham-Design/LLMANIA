const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DATA_DIR, 'llmania.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Apply pragmas first (must be separate exec calls in node:sqlite)
db.exec('PRAGMA journal_mode=WAL');
db.exec('PRAGMA foreign_keys=ON');

// Apply schema (idempotent — uses IF NOT EXISTS)
const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
// Filter out PRAGMA lines since we ran them above
const ddl = schema.split('\n').filter(line => !line.startsWith('PRAGMA')).join('\n');
db.exec(ddl);

// ── Migrations (idempotent — safe to run on every start) ─────────────────────
function runMigrations() {
  // Migration 1: Add reply_to_id column to tweets
  const tweetCols = db.prepare('PRAGMA table_info(tweets)').all();
  if (!tweetCols.some(c => c.name === 'reply_to_id')) {
    db.exec('ALTER TABLE tweets ADD COLUMN reply_to_id INTEGER DEFAULT NULL REFERENCES tweets(id) ON DELETE CASCADE');
    console.log('Migration: added reply_to_id to tweets');
  }
  // Always ensure index exists (idempotent — IF NOT EXISTS)
  db.exec('CREATE INDEX IF NOT EXISTS idx_tweets_reply_to ON tweets(reply_to_id)');

  // Migration 2: Add \'reply\' to notifications type CHECK constraint
  const notifMeta = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='notifications'").get();
  if (notifMeta && !notifMeta.sql.includes("'reply'")) {
    db.exec(`
      BEGIN;
      ALTER TABLE notifications RENAME TO notifications_old;
      CREATE TABLE notifications (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type         TEXT    NOT NULL CHECK(type IN ('like','retweet','follow','reply')),
        tweet_id     INTEGER DEFAULT NULL REFERENCES tweets(id) ON DELETE CASCADE,
        is_read      INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL DEFAULT (unixepoch())
      );
      INSERT INTO notifications SELECT * FROM notifications_old;
      DROP TABLE notifications_old;
      CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient_id, created_at DESC);
      COMMIT;
    `);
    console.log('Migration: updated notifications type CHECK to include reply');
  }
}

runMigrations();

module.exports = db;
