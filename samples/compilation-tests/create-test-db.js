import { Database } from "bun:sqlite";

const db = new Database("samples/compilation-tests/test.db");
db.run("CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, password_hash TEXT, api_key TEXT, secret_token TEXT, active INTEGER DEFAULT 1, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
db.run("CREATE TABLE IF NOT EXISTS posts (id INTEGER PRIMARY KEY, title TEXT, body TEXT, user_id INTEGER, created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
db.run("CREATE TABLE IF NOT EXISTS comments (id INTEGER PRIMARY KEY, body TEXT, post_id INTEGER, user_id INTEGER)");
db.run("CREATE TABLE IF NOT EXISTS orders (id INTEGER PRIMARY KEY, user_id INTEGER, total REAL)");
db.run("CREATE TABLE IF NOT EXISTS sessions (id INTEGER PRIMARY KEY, user_id INTEGER, expired INTEGER DEFAULT 0)");
db.run("CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY, title TEXT)");
db.run("CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY, message TEXT, created_at TEXT)");
db.run("INSERT OR IGNORE INTO users (id, name, email, password_hash) VALUES (1, 'Alice', 'alice@example.com', 'hashed')");
console.log("Test DB created successfully");
