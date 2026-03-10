require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const db = require('./database');

console.log('Seeding database...');

// Clear existing data in dependency order
db.exec('PRAGMA foreign_keys=OFF');
db.exec('DELETE FROM sessions');
db.exec('DELETE FROM notifications');
db.exec('DELETE FROM likes');
db.exec('DELETE FROM follows');
db.exec('DELETE FROM tweets');
db.exec('DELETE FROM users');
db.exec('PRAGMA foreign_keys=ON');

const now = Math.floor(Date.now() / 1000);
const day = 86400;

// ── Users ─────────────────────────────────────────────────────────────────────
const passwordHash = bcrypt.hashSync('password123', 12);

const insertUser = db.prepare(
  'INSERT INTO users (username, display_name, email, password, bio, created_at) VALUES (?, ?, ?, ?, ?, ?)'
);

const usersData = [
  { username: 'matt',    display_name: 'Matt',    email: 'matt@llmania.dev',    bio: 'Just a dev building things' },
  { username: 'jordan',  display_name: 'Jordan',  email: 'jordan@llmania.dev',  bio: "Coffee + code. That's it." },
  { username: 'ryan',    display_name: 'Ryan',    email: 'ryan@llmania.dev',    bio: 'Designer turned engineer' },
  { username: 'blake',   display_name: 'Blake',   email: 'blake@llmania.dev',   bio: 'Infrastructure and vibes' },
  { username: 'maxime',  display_name: 'Maxime',  email: 'maxime@llmania.dev',  bio: 'cat photos and hot takes' },
];

const userIds = {};
for (const u of usersData) {
  const result = insertUser.run(u.username, u.display_name, u.email, passwordHash, u.bio, now - 7 * day);
  userIds[u.username] = result.lastInsertRowid;
}
console.log('  ✓ Users seeded');

// ── Tweets ────────────────────────────────────────────────────────────────────
const insertTweet = db.prepare(
  'INSERT INTO tweets (user_id, content, retweet_of_id, created_at) VALUES (?, ?, ?, ?)'
);

const tweetData = [
  // matt (indices 0-3)
  { user: 'matt', content: 'Just pushed my first open source project. Feels surreal. 🚀', offset: 6 * day + 3600 },
  { user: 'matt', content: "Hot take: the best documentation is code that doesn't need it. Fight me.", offset: 5 * day + 7200 },
  { user: 'matt', content: 'Three hours debugging only to find a missing semicolon. This is fine. Everything is fine. 🔥', offset: 3 * day + 1800 },
  { user: 'matt', content: 'shoutout to everyone who writes clear commit messages. you are the backbone of civilization.', offset: 1 * day + 900 },
  // jordan (indices 4-7)
  { user: 'jordan', content: 'Coffee count today: 4. Lines of code written: also 4. Correlation? Yes.', offset: 6 * day + 1200 },
  { user: 'jordan', content: "Reminder that \"works on my machine\" is a valid production environment if you're brave enough.", offset: 4 * day + 5400 },
  { user: 'jordan', content: 'Finally set up my homelab. Send help. And more RAM.', offset: 2 * day + 3600 },
  { user: 'jordan', content: 'The real 10x developer is the friends we made along the way.', offset: 12 * 3600 },
  // ryan (indices 8-11)
  { user: 'ryan', content: 'Design systems are love letters to your future self.', offset: 6 * day + 9000 },
  { user: 'ryan', content: 'Every pixel has a purpose. Change my mind.', offset: 5 * day + 2700 },
  { user: 'ryan', content: "Accessibility isn't a feature, it's a baseline. If your app doesn't work for everyone, it doesn't work.", offset: 3 * day + 600 },
  { user: 'ryan', content: 'Spent 2 hours picking the perfect font. Worth it. Always worth it.', offset: 18 * 3600 },
  // blake (indices 12-15)
  { user: 'blake', content: 'Kubernetes is just YAML all the way down.', offset: 6 * day + 4500 },
  { user: 'blake', content: 'My terraform plan said "no changes" and I have never trusted anything less in my life.', offset: 4 * day + 1800 },
  { user: 'blake', content: 'Nothing humbles you faster than a prod incident on a Friday at 4:55 PM.', offset: 2 * day + 7200 },
  { user: 'blake', content: 'Uptime is a mindset.', offset: 6 * 3600 },
  // maxime (indices 16-19)
  { user: 'maxime', content: 'my cat just sat on my keyboard and accidentally wrote better code than I did all morning', offset: 5 * day + 8100 },
  { user: 'maxime', content: "Unpopular opinion: dark mode is not optional. It's a human right.", offset: 3 * day + 4500 },
  { user: 'maxime', content: "AI is great but it still can't tell me WHY my CSS isn't centering that div.", offset: 1 * day + 5400 },
  { user: 'maxime', content: 'cat photo incoming 🐱', offset: 3 * 3600 },
];

const tweetIds = {};
for (let i = 0; i < tweetData.length; i++) {
  const t = tweetData[i];
  const result = insertTweet.run(userIds[t.user], t.content, null, now - t.offset);
  tweetIds[i] = result.lastInsertRowid;
}

// Retweets
insertTweet.run(userIds['jordan'], '', tweetIds[0],  now - 5 * day);
insertTweet.run(userIds['blake'],  '', tweetIds[10], now - 2 * day + 1800);
console.log('  ✓ Tweets seeded');

// ── Follows ───────────────────────────────────────────────────────────────────
const insertFollow = db.prepare('INSERT INTO follows (follower_id, following_id, created_at) VALUES (?, ?, ?)');
const insertNotif  = db.prepare('INSERT INTO notifications (recipient_id, actor_id, type, tweet_id, created_at) VALUES (?, ?, ?, ?, ?)');

const follows = [
  ['matt',   'jordan'], ['matt',   'ryan'],
  ['jordan', 'matt'],   ['jordan', 'blake'], ['jordan', 'maxime'],
  ['ryan',   'matt'],
  ['blake',  'jordan'], ['blake',  'ryan'],
  ['maxime', 'matt'],   ['maxime', 'blake'],
];

for (const [follower, following] of follows) {
  insertFollow.run(userIds[follower], userIds[following], now - 5 * day);
  insertNotif.run(userIds[following], userIds[follower], 'follow', null, now - 5 * day);
}
console.log('  ✓ Follows seeded');

// ── Likes ─────────────────────────────────────────────────────────────────────
const insertLike = db.prepare('INSERT OR IGNORE INTO likes (user_id, tweet_id, created_at) VALUES (?, ?, ?)');

const likes = [
  ['jordan', 0], ['ryan', 0], ['blake', 0],
  ['matt', 4], ['ryan', 4],
  ['matt', 8], ['jordan', 8], ['maxime', 8],
  ['matt', 12], ['jordan', 12],
  ['ryan', 16], ['blake', 16],
  ['jordan', 2], ['maxime', 2],
  ['matt', 18], ['ryan', 18], ['blake', 18],
];

for (const [liker, tweetIdx] of likes) {
  const tweetId = tweetIds[tweetIdx];
  const tweetOwnerId = userIds[tweetData[tweetIdx].user];
  if (userIds[liker] === tweetOwnerId) continue;
  const likeTime = now - Math.floor(Math.random() * 4 * day);
  insertLike.run(userIds[liker], tweetId, likeTime);
  insertNotif.run(tweetOwnerId, userIds[liker], 'like', tweetId, likeTime);
}

// Retweet notifications
insertNotif.run(userIds['matt'],  userIds['jordan'], 'retweet', tweetIds[0],  now - 5 * day);
insertNotif.run(userIds['ryan'],  userIds['blake'],  'retweet', tweetIds[10], now - 2 * day + 1800);

console.log('  ✓ Likes & notifications seeded');
console.log('\nDatabase seeded! All accounts: password123');
