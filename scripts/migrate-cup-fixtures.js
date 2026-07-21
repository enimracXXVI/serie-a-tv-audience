// One-time console migration: converts cupFixtures/cupTeams from the old
// ourClub/opponent/homeAway shape to the new symmetric home/away shape.
// See README's "Migrating from the old ourClub/opponent shape" for how to
// run this - paste the whole file into the browser console on a tab where
// you're signed in to the app, then press Enter.
//
// BACK UP cupFixtures AND cupTeams FIRST (Google Sheets -> File -> Version
// history -> Name current version, or just duplicate the tabs) - this
// overwrites both tabs in place.
(async () => {
  const SPREADSHEET_ID = '1h3ZN2H5_ISzLUCW_AtbP2nFSRoMf7htwL8PYYAtRq4o';
  const GOOGLE_API_KEY = 'AIzaSyDr9C0S7FaRckKh4ZeNmnxjOWnU0WyrhVg';

  const session = JSON.parse(sessionStorage.getItem('serieATvAudience.googleSession') || 'null');
  if (!session?.accessToken) {
    console.error('Not signed in - sign in on the app first, then re-run this script.');
    return;
  }
  const accessToken = session.accessToken;

  function colLetter(i) {
    let n = i + 1;
    let s = '';
    while (n > 0) {
      const rem = (n - 1) % 26;
      s = String.fromCharCode(65 + rem) + s;
      n = Math.floor((n - 1) / 26);
    }
    return s;
  }

  async function readTab(name) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      `${name}!A1:Z1000`
    )}?key=${GOOGLE_API_KEY}&valueRenderOption=UNFORMATTED_VALUE`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to read "${name}" (${res.status})`);
    const data = await res.json();
    const rows = data.values || [];
    const [header, ...dataRows] = rows;
    if (!header) return { header: [], rows: [] };
    const index = {};
    header.forEach((h, i) => {
      if (h) index[h] = i;
    });
    const items = dataRows
      .filter((r) => r.length > 0)
      .map((r) => {
        const obj = {};
        for (const [key, i] of Object.entries(index)) obj[key] = r[i] ?? '';
        return obj;
      });
    return { header, rows: items };
  }

  async function writeTab(name, header, rows) {
    const values = [header, ...rows.map((row) => header.map((h) => row[h] ?? ''))];
    const lastCol = colLetter(header.length - 1);
    const range = `${name}!A1:${lastCol}${values.length}`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(
      range
    )}?valueInputOption=RAW`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ range, majorDimension: 'ROWS', values }),
    });
    if (!res.ok) throw new Error(`Failed to write "${name}" (${res.status}): ${await res.text()}`);
  }

  console.log('Reading teams, cupTeams, cupFixtures…');
  const [teamsTab, cupTeamsTab, cupFixturesTab] = await Promise.all([
    readTab('teams'),
    readTab('cupTeams'),
    readTab('cupFixtures'),
  ]);

  if (!cupFixturesTab.header.includes('ourClub')) {
    console.log('cupFixtures already looks like the new shape (no "ourClub" column found) - nothing to do.');
    return;
  }

  const slugToName = new Map();
  for (const t of teamsTab.rows) if (t.slug && t.name) slugToName.set(t.slug, t.name);
  for (const t of cupTeamsTab.rows) if (t.slug && t.name) slugToName.set(t.slug, t.name);

  function nameFor(slug) {
    const name = slugToName.get(slug);
    if (!name) console.warn(`No name found for slug "${slug}" - leaving it as-is, fix manually.`);
    return name || slug;
  }

  console.log(`Converting ${cupFixturesTab.rows.length} cupFixtures row(s)…`);
  const newCupFixturesHeader = [
    'id',
    'competition',
    'round',
    'home',
    'away',
    'neutralVenue',
    'date',
    'kickoffTime',
    'homeScore',
    'awayScore',
    'audience',
    'broadcaster',
    'addedTime1H',
    'addedTime2H',
    'season',
    'etHomeScore',
    'etAwayScore',
    'penHomeScore',
    'penAwayScore',
  ];
  const newCupFixturesRows = cupFixturesTab.rows.map((r) => {
    const ourName = nameFor(r.ourClub);
    const oppName = nameFor(r.opponent);
    const isAway = r.homeAway === 'away';
    const home = isAway ? oppName : ourName;
    const away = isAway ? ourName : oppName;
    // Scores/ET are always "our" perspective in the old shape - flip along
    // with home/away so the new columns mean what their names say.
    const homeScore = isAway ? r.theirScore : r.ourScore;
    const awayScore = isAway ? r.ourScore : r.theirScore;
    const etHomeScore = isAway ? r.etTheirScore : r.etOurScore;
    const etAwayScore = isAway ? r.etOurScore : r.etTheirScore;
    const penHomeScore = isAway ? r.penTheirScore : r.penOurScore;
    const penAwayScore = isAway ? r.penOurScore : r.penTheirScore;
    return {
      id: r.id,
      competition: r.competition,
      round: r.round,
      home,
      away,
      neutralVenue: r.homeAway === 'neutral' ? 'TRUE' : '',
      date: r.date,
      kickoffTime: r.kickoffTime,
      homeScore,
      awayScore,
      audience: r.audience,
      broadcaster: r.broadcaster,
      addedTime1H: r.addedTime1H,
      addedTime2H: r.addedTime2H,
      season: r.season,
      etHomeScore,
      etAwayScore,
      penHomeScore,
      penAwayScore,
    };
  });

  console.log(`Converting ${cupTeamsTab.rows.length} cupTeams row(s)…`);
  const newCupTeamsHeader = ['name', 'short', 'crestUrl', 'primary', 'secondary', 'competition'];
  const newCupTeamsRows = cupTeamsTab.rows.map((r) => ({
    name: r.name,
    short: r.short,
    crestUrl: r.crestUrl,
    primary: r.primary,
    secondary: r.secondary,
    competition: r.competition,
  }));

  console.log('Writing cupTeams…');
  await writeTab('cupTeams', newCupTeamsHeader, newCupTeamsRows);
  console.log('Writing cupFixtures…');
  await writeTab('cupFixtures', newCupFixturesHeader, newCupFixturesRows);

  console.log(
    `Done - converted ${newCupFixturesRows.length} cupFixtures row(s) and ${newCupTeamsRows.length} cupTeams row(s). Reload the app and check the Cups page.`
  );
})();
