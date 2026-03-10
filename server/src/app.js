require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const cors = require('cors');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

// ── Custom SQLite session store ───────────────────────────────────────────────
const Store = session.Store;

class SqliteStore extends Store {
  constructor() {
    super();
    // Prune expired sessions every 15 minutes
    setInterval(() => {
      db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Math.floor(Date.now() / 1000));
    }, 15 * 60 * 1000).unref();
  }

  get(sid, cb) {
    try {
      const row = db.prepare('SELECT data, expires_at FROM sessions WHERE sid = ?').get(sid);
      if (!row || row.expires_at < Math.floor(Date.now() / 1000)) return cb(null, null);
      cb(null, JSON.parse(row.data));
    } catch (e) { cb(e); }
  }

  set(sid, sessionData, cb) {
    try {
      const maxAge = sessionData.cookie?.maxAge || 7 * 24 * 60 * 60 * 1000;
      const expiresAt = Math.floor(Date.now() / 1000) + Math.floor(maxAge / 1000);
      db.prepare('INSERT OR REPLACE INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)')
        .run(sid, JSON.stringify(sessionData), expiresAt);
      cb(null);
    } catch (e) { cb(e); }
  }

  destroy(sid, cb) {
    try {
      db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
      cb(null);
    } catch (e) { cb(e); }
  }

  touch(sid, sessionData, cb) {
    this.set(sid, sessionData, cb);
  }
}

// ── Security ──────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

if (!isProd) {
  app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }));
}

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json());

// ── Sessions ──────────────────────────────────────────────────────────────────
if (!process.env.SESSION_SECRET) {
  console.warn('WARNING: SESSION_SECRET not set. Using insecure default. Set it in .env for production.');
}

app.use(session({
  store: new SqliteStore(),
  secret: process.env.SESSION_SECRET || 'llmania-dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  },
}));

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/tweets',        require('./routes/tweets'));
app.use('/api/likes',         require('./routes/likes'));
app.use('/api/follows',       require('./routes/follows'));
app.use('/api/users',         require('./routes/users'));
app.use('/api/notifications', require('./routes/notifications'));

// ── Production: serve React build ────────────────────────────────────────────
if (isProd) {
  const staticPath = path.join(__dirname, '../public');
  app.use(express.static(staticPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`LLMANIA server running on http://localhost:${PORT}`);
  if (!isProd) console.log('Run "npm run seed" to populate the database with sample data.');
});
