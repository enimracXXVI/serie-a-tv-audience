import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM fixtures').get().c;
  if (count > 0) return count;

  const fixtures = JSON.parse(readFileSync(path.join(__dirname, '../data/fixtures.json'), 'utf-8'));
  const insert = db.prepare(`
    INSERT INTO fixtures (id, matchday, day, date, kickoff_time, home_team, away_team)
    VALUES (@id, @matchday, @day, @date, NULL, @home, @away)
  `);
  const insertMany = db.transaction((rows) => {
    for (const row of rows) insert.run(row);
  });
  insertMany(fixtures);
  return fixtures.length;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const n = seedIfEmpty();
  console.log(`Seed complete. Fixtures in DB: ${n}`);
}
