// Badges : gagnés, perdus après 30 jours sans partie (le plus récent d'abord, un par mois), à regagner.
// Un badge perdu se regagne en remplissant de nouveau sa condition après la date de perte.
export const MONTH_MS = 30 * 24 * 3600 * 1000;

const after = (since) => (x) => !since || (x.at || '') > since;

function longestRun(days) {
  const sorted = [...new Set(days)].sort();
  let best = 0; let run = 0; let prev = null;
  for (const d of sorted) {
    const t = Date.parse(d + 'T12:00:00Z');
    run = prev !== null && t - prev === 864e5 ? run + 1 : 1;
    best = Math.max(best, run); prev = t;
  }
  return best;
}

export const BADGES = [
  { id: 'first_game', ok: (q, s) => q.sessions.some(after(s)) },
  { id: 'perfect', ok: (q, s) => q.sessions.filter(after(s)).some((x) => x.total >= 20 && x.score === x.total) },
  { id: 'streak7', ok: (q, s) => longestRun(q.sessions.filter(after(s)).map((x) => x.day)) >= 7 },
  { id: 'level5', ok: (q, s) => q.sessions.filter(after(s)).some((x) => x.mode === 'my_level' && x.level >= 5) },
  { id: 'level10', ok: (q, s) => q.sessions.filter(after(s)).some((x) => x.mode === 'my_level' && x.level >= 10) },
  { id: 'langs3', ok: (q, s) => new Set(q.sessions.filter(after(s)).map((x) => x.lang)).size >= 3 },
  { id: 'lesson1', ok: (q, s) => q.lessons.some((l) => !s || (l.created || '') > s) },
  { id: 'correct100', ok: (q, s) => q.sessions.filter(after(s)).reduce((a, x) => a + (x.score || 0), 0) >= 100 },
  { id: 'xp1000', ok: (q, s) => (s ? q.sessions.filter(after(s)).reduce((a, x) => a + (x.xp != null ? x.xp : (x.score || 0) * 10), 0) : q.xp) >= 1000 },
];

// Attribue les badges dont la condition est remplie ; renvoie les ids nouvellement gagnés.
export function awardBadges(q, now) {
  q.badges = q.badges || {};
  const won = [];
  for (const b of BADGES) {
    const cur = q.badges[b.id];
    if (cur && !cur.lost) continue;
    if (b.ok(q, cur ? cur.lost : null)) { q.badges[b.id] = { at: now }; won.push(b.id); }
  }
  return won;
}

// Retire un badge par période de 30 jours sans partie ; renvoie les ids perdus.
export function decayBadges(q, nowMs) {
  const last = q.sessions.length ? q.sessions[q.sessions.length - 1].at : null;
  if (!last || !q.badges) return [];
  const months = Math.floor((nowMs - Date.parse(last)) / MONTH_MS);
  const done = q.decay && q.decay.since === last ? q.decay.n : 0;
  const lost = [];
  for (let i = done; i < months; i++) {
    const held = Object.entries(q.badges).filter(([, v]) => !v.lost).sort((a, b) => b[1].at.localeCompare(a[1].at));
    if (!held.length) break;
    const [id] = held[0];
    const at = new Date(Date.parse(last) + (i + 1) * MONTH_MS).toISOString();
    q.badges[id] = { ...q.badges[id], lost: at };
    lost.push(id);
  }
  if (months > done) q.decay = { since: last, n: months };
  if (lost.length) q.badgeNews = [...(q.badgeNews || []), ...lost].slice(-9);
  return lost;
}
