import express from 'express';
import cors from 'cors';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from './db.js';
import { seedIfEmpty } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
seedIfEmpty();
const teams = JSON.parse(readFileSync(path.join(__dirname, '../data/teams.json'), 'utf-8'));
const teamByName = new Map(teams.map((t) => [t.name, t]));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

function serializeFixture(row) {
  return {
    id: row.id,
    matchday: row.matchday,
    day: row.day,
    date: row.date,
    kickoffTime: row.kickoff_time,
    home: teamByName.get(row.home_team) ?? { name: row.home_team },
    away: teamByName.get(row.away_team) ?? { name: row.away_team },
    homeScore: row.home_score,
    awayScore: row.away_score,
    daznAudience: row.dazn_audience,
    skyAudience: row.sky_audience,
    updatedAt: row.updated_at,
  };
}

app.get('/api/teams', (req, res) => {
  res.json(teams);
});

app.get('/api/fixtures', (req, res) => {
  const teamsParam = req.query.teams;
  let rows = db.prepare('SELECT * FROM fixtures ORDER BY matchday, id').all();

  if (teamsParam) {
    const wanted = new Set(String(teamsParam).split(',').filter(Boolean));
    rows = rows.filter((r) => wanted.has(slugFor(r.home_team)) || wanted.has(slugFor(r.away_team)));
  }

  res.json(rows.map(serializeFixture));
});

function slugFor(teamName) {
  return teamByName.get(teamName)?.slug;
}

app.patch('/api/fixtures/:id', (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM fixtures WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Fixture not found' });

  const allowed = ['kickoffTime', 'homeScore', 'awayScore', 'daznAudience', 'skyAudience'];
  const fields = {};
  for (const key of allowed) {
    if (key in req.body) fields[key] = req.body[key];
  }

  const columnMap = {
    kickoffTime: 'kickoff_time',
    homeScore: 'home_score',
    awayScore: 'away_score',
    daznAudience: 'dazn_audience',
    skyAudience: 'sky_audience',
  };

  const setClauses = Object.keys(fields).map((k) => `${columnMap[k]} = @${columnMap[k]}`);
  if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields provided' });

  const params = {};
  for (const [key, value] of Object.entries(fields)) {
    params[columnMap[key]] = value === '' || value === undefined ? null : value;
  }

  db.prepare(`UPDATE fixtures SET ${setClauses.join(', ')}, updated_at = datetime('now') WHERE id = @id`).run({
    ...params,
    id,
  });

  const updated = db.prepare('SELECT * FROM fixtures WHERE id = ?').get(id);
  res.json(serializeFixture(updated));
});

app.listen(PORT, () => {
  console.log(`Serie A API listening on http://localhost:${PORT}`);
});
