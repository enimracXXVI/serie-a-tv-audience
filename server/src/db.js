import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/season.sqlite');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS fixtures (
    id INTEGER PRIMARY KEY,
    matchday INTEGER NOT NULL,
    day TEXT,
    date TEXT,
    kickoff_time TEXT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    dazn_audience REAL,
    sky_audience REAL,
    updated_at TEXT
  );
`);
