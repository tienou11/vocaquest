/* VocaQuest – interface (JavaScript sans dépendance) */
'use strict';

// ---------- Constantes ----------
const LANGS = {
  en: { code: 'EN', name: 'Anglais', adj: 'anglais', art: 'the, a, an' },
  de: { code: 'DE', name: 'Allemand', adj: 'allemand', art: 'der, die, das' },
  es: { code: 'ES', name: 'Espagnol', adj: 'espagnol', art: 'el, la, los, las' },
};
const THEMES = ['Animaux, couleurs, famille', 'École, maison, nourriture', 'Ville, voyage, météo', 'Travail, santé, sentiments', 'Sciences, environnement, entreprise', 'Vie quotidienne (B1-B2)', 'Verbes à particule (B2)', 'Technique et abstrait (B2)', 'Soutenu et technique (B2-C1)', 'Mots rares et expressions (C1)'];
const AVATARS = [['#D9452A', 'Renard'], ['#2B4CC9', 'Baleine'], ['#1E7A54', 'Tortue'], ['#8A3FB5', 'Hibou'], ['#B7791F', 'Lion'], ['#33405F', 'Panda']];
const TYPES = ['', 'nom', 'verbe', 'adjectif', 'adverbe', 'expression'];
const QUESTIONS = 20;

// ---------- Utilitaires ----------
const $app = document.getElementById('app');
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => ymd(new Date());
const frDate = (d) => { try { return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }); } catch { return d; } };
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch { /* indisponible */ } },
};
const ARTICLES = /^(l'|le |la |les |un |une |des |the |a |an |der |die |das |den |dem |ein |eine |einen |el |los |las |una |uno |unos |unas |to )/;
function nbase(s) { return (s || '').toLowerCase().replace(/[’`´‘]/g, "'").replace(/\([^)]*\)/g, ' ').replace(/[.!?¡¿;:,"«»]/g, ' ').replace(/\s+/g, ' ').trim(); }
function nstrip(x) { return x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss'); }
function ndrop(x) { const y = x.replace(ARTICLES, '').trim(); return y || x; }
function norm(s) { return ndrop(nstrip(nbase(s)).trim()); }
function normDe(s) { return ndrop(nstrip(nbase(s).replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')).trim()); }
function matches(answer, expected) { const a = norm(answer); if (!a) return false; const ad = normDe(answer); return expected.some((e) => norm(e) === a || normDe(e) === ad); }
const splitTerms = (s) => String(s || '').split('/').map((x) => x.trim()).filter(Boolean).slice(0, 3);
const icon = {
  play: '<svg width="28" height="28" viewBox="0 0 24 24" fill="#D9452A" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  book: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h11a3 3 0 0 1 3 3v12H7a3 3 0 0 1-3-3z"/><path d="M10 10l4 2.5-4 2.5z"/></svg>',
  plus: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  list: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.2"/><circle cx="4.5" cy="12" r="1.2"/><circle cx="4.5" cy="18" r="1.2"/></svg>',
  filter: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
  chart: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  globe: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/></svg>',
  user: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  gear: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1B2340" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  shield: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8A5A00" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>',
  trash: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A5578" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg>',
  check: '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1E7A54" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12l5 5 9-10"/></svg>',
  cross: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#A3271B" stroke-width="3" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  medal: '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>',
};
const starSvg = (on, size = 26) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${on ? '#F5B82E' : 'none'}" stroke="${on ? '#B9842A' : '#8A93AD'}" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>`;

// ---------- État ----------
const S = {
  token: null, p: null, words: {}, wmap: new Map(), screen: 'boot', stack: [],
  q: null, r: null, lastSel: null, timer: null, pending: [],
  ch: null, al: null, tmp: {}, admin: null, adm: { tab: 'flagged', list: null, q: '' }, edit: null,
  transfer: null, newRc: null, loading: false, confirm: null, noStorage: false,
};

// ---------- Réseau ----------
async function api(path, opts = {}) {
  const headers = { 'content-type': 'application/json' };
  if (S.token) headers.authorization = 'Bearer ' + S.token;
  let r;
  try {
    r = await fetch('/api' + path, { method: opts.method || (opts.body ? 'POST' : 'GET'), headers, body: opts.body ? JSON.stringify(opts.body) : undefined });
  } catch {
    throw new Error('Pas de connexion Internet. Réessaie dans un instant.');
  }
  if (r.status === 401 && S.token && !opts.noLogout) { loggedOut(); throw new Error('Ce profil a été déplacé sur un autre appareil.'); }
  const ct = r.headers.get('content-type') || '';
  const data = ct.includes('json') ? await r.json() : await r.text();
  if (!r.ok) throw new Error((data && data.error) || 'Erreur inattendue');
  return data;
}
async function withLoading(fn) {
  S.loading = true; drawLoading();
  try { return await fn(); } finally { S.loading = false; drawLoading(); }
}
function drawLoading() {
  let el = document.getElementById('loading');
  if (S.loading && !el) { el = document.createElement('div'); el.id = 'loading'; el.className = 'loading'; el.innerHTML = '<div class="spin" role="status" aria-label="Chargement"></div>'; document.body.appendChild(el); }
  if (!S.loading && el) el.remove();
}
let toastTimer = null;
function toast(msg, ms = 3800) {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.className = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), ms);
}
function fail(e) { toast(e && e.message ? e.message : 'Erreur inattendue'); }

// ---------- Sons ----------
let audio = null;
function beep(ok) {
  if (!S.p || !S.p.sound) return;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    const notes = ok ? [660, 880] : [220, 180];
    notes.forEach((f, i) => {
      const o = audio.createOscillator(); const g = audio.createGain();
      o.frequency.value = f; o.type = ok ? 'sine' : 'triangle';
      g.gain.setValueAtTime(0.0001, audio.currentTime + i * 0.12);
      g.gain.exponentialRampToValueAtTime(0.18, audio.currentTime + i * 0.12 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + i * 0.12 + 0.18);
      o.connect(g); g.connect(audio.destination); o.start(audio.currentTime + i * 0.12); o.stop(audio.currentTime + i * 0.12 + 0.2);
    });
  } catch { /* audio indisponible */ }
}
function confetti() {
  const colors = ['#D9452A', '#2B4CC9', '#1E7A54', '#F5B82E', '#8A3FB5'];
  for (let i = 0; i < 60; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    c.style.left = Math.random() * 100 + 'vw';
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
    c.style.animationDelay = Math.random() * 0.4 + 's';
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4000);
  }
}

// ---------- Données ----------
const W = (id) => S.wmap.get(id);
const prog = (lang) => (S.p.prog && S.p.prog[lang]) || { level: 1, perf: 0, low: 0 };
const st = (id) => S.p.w[id];
async function loadWords(lang, force) {
  if (S.words[lang] && !force) return S.words[lang];
  const { words } = await api('/words?lang=' + lang);
  S.words[lang] = words;
  for (const w of words) S.wmap.set(w.id, w);
  return words;
}
const levelWords = (lang, lv) => (S.words[lang] || []).filter((w) => w.level === lv && w.status !== 'to_check');
const discovered = (ws) => ws.filter((w) => st(w.id) && st(w.id).c >= 1).length;
function lessonsOf(lang) { return S.p.lessons.filter((l) => !lang || l.lang === lang).sort((a, b) => (b.created || '').localeCompare(a.created || '')); }

// ---------- Navigation ----------
function go(screen, opts = {}) {
  if (!opts.replace && S.screen !== screen && S.screen !== 'boot') S.stack.push(S.screen);
  S.screen = screen; S.confirm = null; S.quizDrawn = false;
  render(); window.scrollTo(0, 0);
}
function home() { S.stack = []; S.screen = 'home'; S.confirm = null; render(); window.scrollTo(0, 0); }
function loggedOut() { store.del('vq_token'); S.token = null; S.p = null; S.screen = 'gate'; render(); }

// ---------- Rendu ----------
function render() {
  if (S.screen === 'quiz' && S.quizDrawn && patchQuiz()) return;
  const fn = SCREENS[S.screen] || SCREENS.home;
  $app.innerHTML = fn();
  S.quizDrawn = S.screen === 'quiz';
  if (S.quizDrawn && S.q && !S.q.fb) {
    const a = document.getElementById('answer');
    if (a) { try { a.focus({ preventScroll: true }); } catch { a.focus(); } }
  }
}
const back = (label = 'Accueil') => `<button class="back" data-a="back">← ${esc(label)}</button>`;

const SCREENS = {};

SCREENS.boot = () => '<div class="screen" style="align-items:center;justify-content:center;min-height:80vh"><div class="spin"></div></div>';

SCREENS.gate = () => `<div class="screen" style="min-height:90vh;justify-content:center">
  <div class="mascot" style="text-align:center">VocaQuest</div>
  <h1 class="title" style="text-align:center">Bienvenue !</h1>
  <p class="sub" style="text-align:center">Crée ton profil pour commencer à jouer.</p>
  <button class="btn red" data-a="joinInvite">Commencer</button>
  <button class="btn2" data-a="nav" data-to="recover">J'ai déjà un profil sur un autre appareil</button>
  <details class="card" ${S.tmp.icode ? 'open' : ''}><summary class="small">J'ai un code d'invitation</summary>
    <input id="icode" class="inp" style="margin-top:8px" data-bind="tmp.icode" value="${esc(S.tmp.icode || '')}" placeholder="Code ou lien d'invitation" autocapitalize="off" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="go">
  </details>
</div>`;

SCREENS.home = () => {
  const p = S.p; const lang = p.lang; const L = LANGS[lang]; const pr = prog(lang);
  const lw = levelWords(lang, pr.level); const disc = discovered(lw);
  const av = AVATARS[p.avatar] || AVATARS[0];
  const last = lessonsOf(lang)[0];
  const adminBadge = p.role === 'admin' && S.admin ? Object.values(S.admin.langs).reduce((a, x) => a + x.flagged, 0) : 0;
  return `<div class="screen">
  <div class="row between">
    <div class="row">
      <div class="avatar" style="background:${av[0]}">${esc((p.name || '?').charAt(0).toUpperCase())}</div>
      <div><div class="fd" style="font-size:23px">Bonjour${p.name ? ' ' + esc(p.name) : ''} !</div><div class="sub">${p.sessions.length ? 'Continue comme ça !' : 'Prêt pour ta première partie ?'}</div></div>
    </div>
    <div class="row" style="gap:6px"><span class="chip">${L.code}</span><span class="chip">Niv. ${pr.level}</span></div>
  </div>
  ${S.newRc ? `<div class="banner">${icon.shield}<div class="grow"><b>Nouveau code de secours</b><br><span style="font-family:Fredoka,sans-serif;font-size:18px;letter-spacing:.06em">${esc(S.newRc)}</span><br>Note-le, l'ancien ne marche plus.</div><button data-a="ackNewRc">Noté</button></div>` : ''}
  ${p.sessions.length && !p.rcAck && !S.newRc ? `<div class="banner">${icon.shield}<div class="grow"><b>Protège ta progression</b><br>Note ton code de secours.</div><button data-a="nav" data-to="profile">Voir</button></div>` : ''}
  ${(p.badgeNews || []).length ? `<div class="banner">${icon.medal}<div class="grow"><b>Tu n'as pas joué depuis un moment</b><br>Badge perdu : ${p.badgeNews.map((id) => '« ' + esc(badgeName(id)) + ' »').join(', ')}. Rejoue pour le regagner !</div><button data-a="ackBadges">OK</button></div>` : (() => { const r = badgeRisk(); return r ? `<div class="banner">${icon.medal}<div class="grow"><b>Garde ton badge « ${esc(badgeName(r.id))} »</b><br>Joue avant le ${r.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}${r.daysLeft <= 1 ? ' (demain au plus tard)' : ''}.</div></div>` : ''; })()}
  ${S.noStorage ? '<div class="banner"><div class="grow">Ton navigateur bloque l\'enregistrement (navigation privée ?). Ton profil sera perdu à la fermeture.</div></div>' : ''}
  <div class="grid3">
    <div class="stat"><span>Mots découverts</span><b>${disc}/${lw.length}</b><span>niveau ${pr.level}</span></div>
    <div class="stat"><span>Vers niveau ${Math.min(10, pr.level + 1)}</span><b>${pr.perf}/5</b><span>20/20 d'affilée</span></div>
    <div class="stat"><span>Expérience</span><b>${p.xp}</b><span>série : ${p.streak} j</span></div>
  </div>
  <button class="play" data-a="playLevel"><span class="ic">${icon.play}</span><span><b>Jouer à mon niveau</b><span>${QUESTIONS} questions · ${L.name} · niveau ${pr.level}</span></span></button>
  <div class="grid2">
    <button class="tile" style="background:var(--t1)" data-a="playLastLesson" ${last ? '' : 'disabled'}>${icon.book}<span><b>Ma dernière leçon</b><br><span>${last ? esc(last.name) : 'aucune leçon en ' + L.adj}</span></span></button>
    <button class="tile" style="background:var(--t2)" data-a="addLesson">${icon.plus}<b>Ajouter une leçon</b></button>
    <button class="tile" style="background:var(--t3)" data-a="nav" data-to="lessons">${icon.list}<span><b>Mes leçons</b><br><span>${p.lessons.length} leçon${p.lessons.length > 1 ? 's' : ''}</span></span></button>
    <button class="tile" style="background:var(--t4)" data-a="choose">${icon.filter}<b>Choisir mes mots</b></button>
    <button class="tile" style="background:var(--t5)" data-a="nav" data-to="progress">${icon.chart}<b>Ma progression</b></button>
    <button class="tile" style="background:var(--t6)" data-a="langLevel">${icon.globe}<b>Langue et niveau</b></button>
  </div>
  <button class="btn2 row" style="justify-content:flex-start;gap:12px;min-height:58px" data-a="nav" data-to="profile">${icon.user}<span class="fd grow" style="text-align:left;font-size:18px">Mon profil</span><span class="small">prénom, avatar, appareil</span></button>
  ${p.role === 'admin' ? `<button class="btn2 row" style="justify-content:flex-start;gap:12px;min-height:58px;position:relative" data-a="openAdmin">${icon.gear}<span class="fd grow" style="text-align:left;font-size:18px">Administration</span>${adminBadge ? `<span class="badge-n" style="position:static">${adminBadge} à arbitrer</span>` : ''}</button>` : ''}
  <button class="link" data-a="nav" data-to="recover">J'ai déjà un profil sur un autre appareil</button>
</div>`;
};

function langButtons(sel, action) {
  return Object.entries(LANGS).map(([k, L]) => `<button class="opt ${sel === k ? 'on' : ''}" data-a="${action}" data-v="${k}"><span class="code">${L.code}</span><b style="font-size:18px">${L.name}</b></button>`).join('');
}
function levelGrid(sel, action) {
  return `<div class="grid5">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<button class="lv ${n === sel ? 'on' : ''}" data-a="${action}" data-v="${n}" aria-label="Niveau ${n}">${n}</button>`).join('')}</div>`;
}
function levelInfo(lang, lv) {
  const ex = (S.words[lang] || []).find((w) => w.level === lv && w.src === 'base');
  return `<div class="card"><b>Niveau ${lv}</b> · ${esc(THEMES[lv - 1])}${ex ? `<br><span class="sub">Exemple : ${esc(ex.t[0])} = ${esc(ex.f[0])}</span>` : ''}</div>`;
}

SCREENS.setup = () => `<div class="screen">${back()}
  <label class="lab" for="sname">Ton prénom</label>
  <input id="sname" class="inp" data-bind="tmp.name" value="${esc(S.tmp.name || '')}" maxlength="30" placeholder="Ton prénom" autocomplete="given-name">
  <h1 class="title">Quelle langue veux-tu apprendre ?</h1>
  <div style="display:flex;flex-direction:column;gap:10px">${langButtons(S.tmp.lang, 'tmpLang')}</div>
  <h2 class="fd" style="font-size:22px">Ton niveau de départ</h2>
  ${levelGrid(S.tmp.level, 'tmpLevel')}
  ${levelInfo(S.tmp.lang, S.tmp.level)}
  <button class="btn red" data-a="setupGo">C'est parti !</button>
  <p class="small" style="text-align:center">Tu pourras changer de langue ou de niveau à tout moment.</p>
</div>`;

SCREENS.lang = () => `<div class="screen">${back()}
  <h1 class="title">Langue et niveau</h1>
  <div style="display:flex;flex-direction:column;gap:10px">${langButtons(S.tmp.lang, 'tmpLang')}</div>
  ${levelGrid(S.tmp.level, 'tmpLevel')}
  ${levelInfo(S.tmp.lang, S.tmp.level)}
  <button class="btn blue" data-a="langSave">Valider</button>
</div>`;

function quizParts() {
  const q = S.q; const it = q.items[q.i]; const w = W(it.id) || { t: ['?'], f: ['?'], note: '' };
  const L = LANGS[q.lang];
  const toFr = it.dir === 'to_fr';
  const prompt = (toFr ? w.t : w.f).join(' / ');
  const expected = (toFr ? w.f : w.t).join(' / ');
  const dirLabel = toFr ? `${L.name.toUpperCase()} → FRANÇAIS` : `FRANÇAIS → ${L.name.toUpperCase()}`;
  const rev = !!(st(it.id) && st(it.id).r);
  const pct = Math.round(((q.i + (q.fb ? 1 : 0)) / q.items.length) * 100);
  const head = `<div class="row between"><button class="back" data-a="quitQuiz">✕ Arrêter</button><b>Question ${q.i + 1} / ${q.items.length}</b></div>
  <div class="prog"><div style="width:${pct}%"></div></div>
  ${q.title ? `<div class="small" style="text-align:center">${esc(q.title)}</div>` : ''}
  <div class="qcard">
    <button class="star" data-a="toggleRev" data-keep="1" data-id="${esc(it.id)}" aria-pressed="${rev}" aria-label="${rev ? 'Retirer de À revoir' : 'Marquer À revoir'}">${starSvg(rev)}</button>
    <span class="qdir">${dirLabel}</span>
    <span class="qword">${esc(prompt)}</span>
    ${w.note ? `<span class="qhint">${esc(w.note)}</span>` : ''}
  </div>`;
  let fb = '';
  let btns;
  if (!q.fb) {
    btns = `<button class="btn blue" data-a="submit" data-keep="1">Valider</button>
      <button class="btn2" data-a="dontKnow" data-keep="1">Je ne sais pas</button>`;
  } else if (q.fb === 'ok') {
    fb = `<div class="fb ok" role="status"><div class="row">${icon.check}<h3>Juste ! +10 XP</h3></div><span>${esc(prompt)} = <b>${esc(expected)}</b></span><div class="timer"><div style="animation-duration:1.5s"></div></div></div>`;
    btns = '';
  } else {
    fb = `<div class="fb ko" role="status"><div class="row">${icon.cross}<h3>${q.given ? 'Faux' : 'Voici la réponse'}</h3></div>
      <span style="font-size:19px">Bonne réponse : <b>${esc(expected)}</b></span>
      <span class="small" style="color:#5E1710">Ce mot reviendra plus souvent.</span>
      <div class="timer"><div style="animation-duration:5s"></div></div></div>`;
    btns = '<button class="btn2" style="border-color:#A3271B;color:#A3271B" data-a="next" data-keep="1">Question suivante (automatique dans 5 s)</button>';
  }
  return { head, fb, btns };
}
SCREENS.quiz = () => {
  const q = S.q; const parts = quizParts();
  return `<div class="screen">
  <div id="qhead" style="display:flex;flex-direction:column;gap:14px">${parts.head}</div>
  <div id="qfb">${parts.fb}</div>
  <label class="lab sr" for="answer">Ta réponse</label>
  <input id="answer" class="ans${q.fb ? ' ' + q.fb : ''}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" placeholder="${q.fb ? '' : 'Écris la traduction'}" value="${esc(q.fb ? q.given : q.answer)}">
  <div id="qbtns" style="display:flex;flex-direction:column;gap:12px">${parts.btns}</div>
  <p class="small" style="text-align:center">Accents, majuscules et articles ne comptent pas. Un seul synonyme suffit.</p>
</div>`;
};
// Mise à jour partielle : le champ de réponse n'est jamais recréé, le clavier reste ouvert (iPhone, iPad).
function patchQuiz() {
  const inp = document.getElementById('answer'); const head = document.getElementById('qhead');
  if (!inp || !head || !S.q) return false;
  const q = S.q; const parts = quizParts();
  head.innerHTML = parts.head;
  document.getElementById('qfb').innerHTML = parts.fb;
  document.getElementById('qbtns').innerHTML = parts.btns;
  inp.value = q.fb ? q.given : q.answer;
  inp.className = 'ans' + (q.fb ? ' ' + q.fb : '');
  inp.placeholder = q.fb ? '' : 'Écris la traduction';
  inp.setAttribute('aria-invalid', q.fb === 'ko' ? 'true' : 'false');
  return true;
}

SCREENS.result = () => {
  const r = S.r; const q = r.q;
  const total = q.items.length; const ratio = total ? q.score / total : 0;
  const starsN = ratio === 1 ? 3 : ratio >= 0.75 ? 2 : ratio >= 0.5 ? 1 : 0;
  const title = ratio === 1 ? 'Parfait !' : ratio >= 0.5 ? 'Bien joué !' : 'Continue, tu progresses !';
  const pr = prog(q.lang);
  let levelMsg = '';
  if (r.levelChange === 1) levelMsg = `<div class="levelup"><div class="mascot">Niveau ${pr.level} débloqué !</div><div class="sub">+100 XP. Bravo, tu as réussi tous les mots du niveau ${pr.level - 1}.</div></div>`;
  else if (r.levelChange === -1) levelMsg = `<div class="card">On consolide le niveau ${pr.level}. Tu vas y arriver !</div>`;
  else if (q.mode === 'my_level') {
    levelMsg = r.remaining > 0 && pr.perf >= 5
      ? `<div class="card"><b>Encore ${r.remaining} mot${r.remaining > 1 ? 's' : ''} à découvrir</b> pour passer au niveau ${pr.level + 1}.</div>`
      : `<div class="card"><b>Vers le niveau ${Math.min(10, pr.level + 1)} :</b> ${pr.perf} partie${pr.perf > 1 ? 's' : ''} parfaite${pr.perf > 1 ? 's' : ''} sur 5 d'affilée.</div>`;
  }
  const missed = [...new Set(q.missed)];
  return `<div class="screen">
  <h1 class="title" style="text-align:center">${title}</h1>
  <div class="stars">${[0, 1, 2].map((i) => starSvg(i < starsN, 46)).join('')}</div>
  <div class="card" style="text-align:center"><div class="big">${q.score} / ${total}</div><b class="sub">+${q.xp + (r.bonus || 0)} XP</b></div>
  ${r.offline ? '<div class="banner"><div class="grow">Résultat non enregistré (pas de connexion).</div></div>' : ''}
  ${levelMsg}
  ${(r.newBadges || []).map((id) => `<div class="banner" style="background:#FFF1D6">${icon.medal}<div class="grow"><b>Badge gagné : ${esc(badgeName(id))} !</b></div></div>`).join('')}
  ${missed.length ? `<b>À revoir</b>${missed.map((id) => { const w = W(id); if (!w) return ''; const rv = !!(st(id) && st(id).r); return `<div class="list-item"><span class="grow">${esc(w.t.join(' / '))}</span><b class="grow" style="text-align:right">${esc(w.f.join(' / '))}</b><button class="iconbtn" data-a="toggleRev" data-id="${esc(id)}" aria-pressed="${rv}" aria-label="À revoir">${starSvg(rv, 22)}</button></div>`; }).join('')}` : ''}
  ${missed.length ? '<button class="btn red" data-a="replayMissed">Rejouer mes erreurs</button>' : ''}
  <button class="btn ${missed.length ? 'blue' : 'red'}" data-a="replay">Rejouer</button>
  <button class="btn2" data-a="home">Accueil</button>
</div>`;
};

// ----- Choisir mes mots -----
function chooseIds() {
  const c = S.ch; const lang = S.p.lang; const words = (S.words[lang] || []);
  let set = words;
  if (c.lessons.size) { const ids = new Set(); for (const l of S.p.lessons) if (c.lessons.has(l.id)) l.words.forEach((x) => ids.add(x)); set = set.filter((w) => ids.has(w.id)); }
  if (c.origin === 'mine' || c.period !== 'all') set = set.filter((w) => st(w.id) && st(w.id).d);
  if (c.period !== 'all') {
    const now = new Date(); let from = null; let to = null;
    if (c.period === '7') { from = ymd(new Date(now - 7 * 864e5)); }
    if (c.period === '30') { from = ymd(new Date(now - 30 * 864e5)); }
    if (c.period === 'custom') { from = c.from || null; to = c.to || null; }
    set = set.filter((w) => { const d = st(w.id).d; return (!from || d >= from) && (!to || d <= to); });
  }
  if (c.levels.size) set = set.filter((w) => c.levels.has(w.level));
  if (c.err || c.never || c.rev) {
    set = set.filter((w) => { const s = st(w.id); return (c.err && s && s.s < 0) || (c.never && (!s || !s.a)) || (c.rev && s && s.r); });
  }
  return set.map((w) => w.id);
}
SCREENS.choose = () => {
  const c = S.ch; const lang = S.p.lang; const ls = lessonsOf(lang);
  const n = chooseIds().length;
  const pill = (on, a, v, label) => `<button class="pill ${on ? 'on' : ''}" data-a="${a}" data-v="${esc(v)}" aria-pressed="${on}">${esc(label)}</button>`;
  return `<div class="screen">${back()}
  <h1 class="title">Choisir mes mots</h1>
  <p class="sub">Langue : ${LANGS[lang].name}. Combine les critères librement.</p>
  <b>Leçons</b>
  <div class="row wrap">${ls.length ? ls.map((l) => pill(c.lessons.has(l.id), 'chLesson', l.id, l.name)).join('') : '<span class="small">Aucune leçon dans cette langue.</span>'}</div>
  <b>Mots ajoutés</b>
  <div class="row wrap">${pill(c.origin === 'all', 'chOrigin', 'all', 'Toute la base')}${pill(c.origin === 'mine', 'chOrigin', 'mine', 'Seulement mes mots')}</div>
  <div class="row wrap">${pill(c.period === 'all', 'chPeriod', 'all', 'Toutes dates')}${pill(c.period === '7', 'chPeriod', '7', '7 derniers jours')}${pill(c.period === '30', 'chPeriod', '30', '30 derniers jours')}${pill(c.period === 'custom', 'chPeriod', 'custom', 'Entre deux dates')}</div>
  ${c.period === 'custom' ? `<div class="row"><label class="grow small">Du<input type="date" class="inp" data-bind="ch.from" data-rerender="1" value="${esc(c.from || '')}"></label><label class="grow small">au<input type="date" class="inp" data-bind="ch.to" data-rerender="1" value="${esc(c.to || '')}"></label></div>` : ''}
  <b>Niveaux</b>
  <div class="grid5">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => `<button class="lv ${c.levels.has(v) ? 'on' : ''}" data-a="chLevel" data-v="${v}" aria-pressed="${c.levels.has(v)}">${v}</button>`).join('')}</div>
  <b>Seulement</b>
  <div class="row wrap">${pill(c.err, 'chState', 'err', 'Mes erreurs')}${pill(c.never, 'chState', 'never', 'Jamais vus')}${pill(c.rev, 'chState', 'rev', 'À revoir ★')}</div>
  <div class="card"><b>${n} mot${n > 1 ? 's' : ''}</b> sélectionné${n > 1 ? 's' : ''} · partie de ${Math.min(QUESTIONS, n)} questions</div>
  <button class="btn red" data-a="chPlay" ${n ? '' : 'disabled'}>Jouer avec ces mots</button>
</div>`;
};

// ----- Ajouter une leçon -----
function aiPrompt() {
  const al = S.al; const L = LANGS[al.lang];
  return `Je t'envoie la photo d'une leçon de vocabulaire ${L.adj}.
Relève tous les mots et expressions en ${L.adj} avec leur traduction française.
- Si une traduction manque sur la photo, propose-la et ajoute * à sa fin.
- Si tu n'es pas sûr de lire un mot, ajoute ? à sa fin.
- Mets l'article devant les noms (${L.art} ; le, la, les, un, une en français).
- Pour chaque mot ET pour sa traduction, ajoute 1 à 2 synonymes qui précisent le sens voulu dans la leçon. S'il n'existe aucun synonyme, donne un indice de sens court en dernière colonne.
- Pour chaque mot, donne : le type (nom, verbe, adjectif, adverbe, expression), un thème en un mot, un niveau de 1 (très facile) à 10 (expert).
Réponds UNIQUEMENT avec le bloc suivant, sans aucun autre texte :
VOCAB;${al.lang};${al.name}
terme/synonyme1/synonyme2;traduction/synonyme1/synonyme2;type;thème;niveau;indice`;
}
function parseAnswer(txt) {
  const rows = []; let header = null;
  for (const raw of String(txt || '').split(/\r?\n/)) {
    let l = raw.trim();
    if (!l || /^```/.test(l)) continue;
    l = l.replace(/^[-*•]\s+/, '').replace(/^\d+[.)]\s+/, '');
    if (/^VOCAB\s*;/i.test(l)) { const h = l.split(';').map((x) => x.trim()); header = { lang: (h[1] || '').toLowerCase(), name: h[2] || '' }; continue; }
    let parts = l.split(';');
    if (parts.length < 2) parts = l.split('\t');
    if (parts.length < 2) parts = l.split('|');
    if (parts.length < 2) continue;
    parts = parts.map((x) => x.trim());
    let t = parts[0]; let f = parts[1]; let flag = '';
    if (/terme\/synonyme1/i.test(t)) continue;
    if (/\?\s*$/.test(t)) { t = t.replace(/\?\s*$/, '').trim(); flag = 'doubt'; }
    if (/\?\s*$/.test(f)) { f = f.replace(/\?\s*$/, '').trim(); flag = 'doubt'; }
    if (/\*/.test(f)) { f = f.replace(/\*/g, '').trim(); if (!flag) flag = 'sug'; }
    t = t.replace(/\*/g, '').trim();
    if (!t || !f) continue;
    const type = (parts[2] || '').toLowerCase();
    const lvl = parseInt(parts[4], 10);
    rows.push({ t: splitTerms(t).join(' / '), f: splitTerms(f).join(' / '), type: TYPES.includes(type) ? type : '', theme: (parts[3] || '').slice(0, 30), level: lvl >= 1 && lvl <= 10 ? lvl : 1, note: (parts[5] || '').slice(0, 120), flag });
  }
  return { rows, header };
}
const emptyRow = () => ({ t: '', f: '', type: '', theme: '', level: 1, note: '', flag: '' });
function knownWord(lang, row) {
  const t = splitTerms(row.t)[0]; const f = splitTerms(row.f)[0];
  if (!t || !f) return null;
  const k = norm(t) + '|' + norm(f);
  return (S.words[lang] || []).find((w) => norm(w.t[0]) + '|' + norm(w.f[0]) === k) || null;
}

SCREENS.addLesson = () => {
  const al = S.al;
  return `<div class="screen">${back()}
  <h1 class="title">Ajouter une leçon</h1>
  <label class="lab" for="lname">Nom de la leçon</label>
  <input id="lname" class="inp" data-bind="al.name" value="${esc(al.name)}" maxlength="60">
  <div class="row"><label class="grow"><span class="lab">Langue</span><select class="inp" data-bind="al.lang" data-rerender="1">${Object.entries(LANGS).map(([k, L]) => `<option value="${k}" ${al.lang === k ? 'selected' : ''}>${L.name}</option>`).join('')}</select></label>
  <label class="grow"><span class="lab">Date</span><input type="date" class="inp" data-bind="al.date" value="${esc(al.date)}"></label></div>
  <button class="opt" style="background:var(--t2);border-color:var(--t2);min-height:96px" data-a="alAi"><span class="code" style="width:48px;height:48px">IA</span><span><b class="fd" style="font-size:21px">Utiliser mon IA</b><br><span class="small" style="color:#33405F">Claude, ChatGPT, Gemini… lit la photo de ta leçon</span></span></button>
  <button class="opt" data-a="alManual"><span class="code">✎</span><b class="fd" style="font-size:19px">Écrire les mots</b></button>
</div>`;
};

SCREENS.ai = () => {
  const al = S.al;
  return `<div class="screen">${back('Retour')}
  <h1 class="title">Utiliser mon IA</h1>
  <div class="step"><i>1</i><span>Copie ce message.</span></div>
  <div class="prompt" id="promptText">${esc(aiPrompt())}</div>
  <button class="btn blue" data-a="copyPrompt">${al.copied ? 'Copié !' : 'Copier le message'}</button>
  <div class="step"><i>2</i><span>Ouvre ton IA, colle le message et ajoute la photo de ta leçon.</span></div>
  <div class="step"><i>3</i><span>Copie sa réponse et colle-la ici.</span></div>
  <label class="lab" for="paste">Réponse de l'IA</label>
  <textarea id="paste" class="inp" data-bind="al.pasted" placeholder="VOCAB;${al.lang};…">${esc(al.pasted)}</textarea>
  ${navigator.clipboard && navigator.clipboard.readText && !window.VQ_DEMO ? '<button class="btn3" data-a="pasteClip">Coller depuis le presse-papiers</button>' : ''}
  ${al.parseError ? '<p class="tag" style="color:#A3271B">Je ne trouve pas de mots dans ce texte. Vérifie que tu as copié toute la réponse.</p>' : ''}
  <button class="btn green" data-a="readAnswer">Lire la réponse</button>
  <p class="small">Pour un enfant de moins de 13 ans : un parent fait l'étape 2 sur son téléphone et lui envoie la réponse par message.</p>
</div>`;
};

SCREENS.verify = () => {
  const al = S.al;
  const L = LANGS[al.lang];
  const cards = al.rows.map((r, i) => {
    const known = knownWord(al.lang, r);
    const cls = known ? 'known' : r.flag;
    const tag = known ? 'Déjà dans la base : ta note est gardée' : r.flag === 'doubt' ? 'À vérifier : lecture incertaine' : r.flag === 'sug' ? 'Traduction proposée par l\'IA' : '';
    return `<div class="vrow ${cls}">
      <div class="row"><b class="grow">Mot ${i + 1}</b><button class="iconbtn" data-a="rowDel" data-i="${i}" aria-label="Supprimer ce mot">${icon.trash}</button></div>
      <label class="small">${L.name} (synonymes séparés par /)<input class="inp" data-row="${i}" data-field="t" value="${esc(r.t)}" autocapitalize="off" spellcheck="false"></label>
      <label class="small">Français (synonymes séparés par /)<input class="inp" data-row="${i}" data-field="f" value="${esc(r.f)}" spellcheck="false"></label>
      <div class="row"><label class="small" style="width:76px">Niveau<select class="inp" data-row="${i}" data-field="level">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option ${Number(r.level) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label class="small grow">Type<select class="inp" data-row="${i}" data-field="type">${TYPES.map((t) => `<option value="${t}" ${r.type === t ? 'selected' : ''}>${t || '—'}</option>`).join('')}</select></label></div>
      <div class="row"><label class="small grow">Thème<input class="inp" data-row="${i}" data-field="theme" value="${esc(r.theme)}"></label><label class="small grow">Indice de sens<input class="inp" data-row="${i}" data-field="note" value="${esc(r.note)}"></label></div>
      ${tag ? `<span class="tag ${cls}">${esc(tag)}</span>` : ''}
    </div>`;
  }).join('');
  return `<div class="screen">${back('Retour')}
  <h1 class="title">Vérifie les mots</h1>
  <p class="sub">« ${esc(al.name)} » · ${L.name}. Corrige ce qui est en orange. Ajoute 1 à 2 synonymes par mot si tu peux : sinon Claude s'en chargera.</p>
  ${cards}
  <button class="btn3" data-a="rowAdd">+ Ajouter un mot</button>
  <button class="btn green" data-a="saveLesson">Enregistrer la leçon</button>
</div>`;
};

SCREENS.lessons = () => {
  const ls = lessonsOf(null);
  return `<div class="screen">${back()}
  <h1 class="title">Mes leçons</h1>
  ${ls.length ? ls.map((l) => {
    const sess = S.p.sessions.filter((s) => s.lesson === l.id).slice(-1)[0];
    const conf = S.confirm === l.id;
    return `<div class="card" style="display:flex;flex-direction:column;gap:10px"><div class="row"><span class="code">${LANGS[l.lang].code}</span><div class="grow"><b class="fd" style="font-size:18px">${esc(l.name)}</b><div class="small">${frDate(l.date)} · ${l.words.length} mots${sess ? ` · dernière note ${sess.score}/${sess.total}` : ''}</div></div></div>
    <div class="row"><button class="btn red" style="min-height:48px;font-size:17px" data-a="playLesson" data-id="${l.id}">Réviser</button><button class="btn2" style="width:auto;${conf ? 'border-color:#A3271B;color:#A3271B' : ''}" data-a="delLesson" data-id="${l.id}">${conf ? 'Confirmer' : 'Supprimer'}</button></div></div>`;
  }).join('') : '<p class="sub">Aucune leçon pour l\'instant.</p>'}
  <button class="btn3" data-a="addLesson">+ Ajouter une leçon</button>
</div>`;
};

const BADGES = [
  ['first_game', 'Première partie', 'Joue une partie'], ['perfect', 'Premier 20/20', 'Fais un 20/20'], ['streak7', "7 jours d'affilée", 'Joue 7 jours de suite'],
  ['level5', 'Niveau 5', 'Joue au niveau 5'], ['level10', 'Niveau 10', 'Joue au niveau 10'], ['langs3', '3 langues', 'Joue dans les 3 langues'],
  ['lesson1', 'Première leçon', 'Ajoute une leçon'], ['correct100', '100 bonnes réponses', 'Donne 100 bonnes réponses'], ['xp1000', '1 000 XP', 'Gagne 1 000 XP'],
];
const badgeName = (id) => (BADGES.find((b) => b[0] === id) || [id, id])[1];
// Badge menacé : le plus récent encore détenu, et la date limite pour le garder.
function badgeRisk() {
  const p = S.p; const last = p.sessions.length ? p.sessions[p.sessions.length - 1].at : null;
  const held = Object.entries(p.badges || {}).filter(([, v]) => !v.lost).sort((x, y) => y[1].at.localeCompare(x[1].at));
  if (!last || !held.length) return null;
  const n = p.decay && p.decay.since === last ? p.decay.n : 0;
  const deadline = Date.parse(last) + (n + 1) * 30 * 864e5;
  const daysLeft = Math.ceil((deadline - Date.now()) / 864e5);
  return daysLeft <= 9 ? { id: held[0][0], date: new Date(deadline), daysLeft } : null;
}
SCREENS.progress = () => {
  const p = S.p; const lang = p.lang; const pr = prog(lang);
  const sess = p.sessions.filter((s) => s.lang === lang).slice(-14);
  const ev = p.events.filter((e) => e.lang === lang).slice(-8).reverse();
  return `<div class="screen">${back()}
  <h1 class="title">Ma progression</h1>
  <div class="grid3"><div class="stat"><span>Niveau</span><b>${pr.level}</b><span>${LANGS[lang].name}</span></div><div class="stat"><span>Série</span><b>${p.streak} j</b><span>record ${p.best || 0} j</span></div><div class="stat"><span>XP</span><b>${p.xp}</b><span>${p.sessions.length} partie${p.sessions.length > 1 ? 's' : ''}</span></div></div>
  <div class="card"><b>Mes dernières notes (${LANGS[lang].name})</b>
  ${sess.length ? `<div class="bars" style="margin-top:10px">${sess.map((s) => `<div title="${frDate(s.day)}"><span>${s.score}</span><i class="${s.lc === 1 ? 'up' : ''}" style="height:${Math.max(4, Math.round((s.total ? s.score / s.total : 0) * 130))}px"></i></div>`).join('')}</div><div class="small" style="margin-top:6px">Barre bleue : passage de niveau. Hauteur : note rapportée à 20.</div>` : '<p class="sub">Pas encore de partie dans cette langue.</p>'}</div>
  ${ev.length ? `<div class="card"><b>Changements de niveau</b>${ev.map((e) => `<div class="small" style="margin-top:6px">${frDate(e.at)} : niveau ${e.from} → ${e.to} ${e.why === 'manual' ? '(choisi)' : e.why === 'auto_up' ? '(gagné !)' : '(consolidation)'}</div>`).join('')}</div>` : ''}
  <b>Badges</b>
  <div class="badges">${BADGES.map(([id, n, how]) => { const b = (p.badges || {})[id]; const st = b ? (b.lost ? 'lost' : 'on') : ''; return `<div class="bdg ${st}">${icon.medal}<span>${esc(n)}</span>${st === 'on' ? '' : `<small>${st === 'lost' ? 'Perdu · ' : ''}${esc(how)}</small>`}</div>`; }).join('')}</div>
  <p class="small">Sans partie pendant 30 jours, tu perds ton dernier badge gagné, puis un autre chaque mois. Rejoue pour les regagner.</p>
</div>`;
};

SCREENS.profile = () => {
  const p = S.p;
  const dirs = [['mixed', 'Mélangé (comme le fichier Excel)'], ['to_fr', 'Langue étrangère → français'], ['from_fr', 'Français → langue étrangère']];
  const t = S.transfer;
  return `<div class="screen">${back()}
  <h1 class="title">Mon profil</h1>
  <label class="lab" for="pname">Mon prénom</label>
  <div class="row"><input id="pname" class="inp grow" data-bind="tmp.name" value="${esc(S.tmp.name != null ? S.tmp.name : p.name)}" maxlength="30" placeholder="Ton prénom"><button class="btn2" style="width:auto" data-a="saveName">OK</button></div>
  <b>Mon avatar</b>
  <div class="row wrap">${AVATARS.map((a, i) => `<button data-a="setAvatar" data-v="${i}" aria-label="${a[1]}" aria-pressed="${p.avatar === i}" style="width:52px;height:52px;border-radius:50%;background:${a[0]};border:4px solid ${p.avatar === i ? '#1B2340' : '#fff'};box-shadow:0 0 0 1px #D7DEEE"></button>`).join('')}</div>
  <b>Sens des questions</b>
  <div style="display:flex;flex-direction:column;gap:8px">${dirs.map(([v, l]) => `<button class="opt ${p.dir === v ? 'on' : ''}" style="min-height:50px" data-a="setDir" data-v="${v}">${esc(l)}</button>`).join('')}</div>
  <button class="opt" style="min-height:50px" data-a="toggleSound">Son : <b>${p.sound ? 'activé' : 'coupé'}</b></button>
  <div class="banner" style="flex-direction:column;align-items:flex-start;gap:6px">
    <b>Mon code de secours</b>
    <span style="font-family:Fredoka,sans-serif;font-weight:600;font-size:24px;letter-spacing:.08em">${esc(p.rc)}</span>
    <span>Note-le ou prends-le en photo : il permet de retrouver ton profil si tu perds ton appareil.</span>
    ${p.rcAck ? '<span class="tag">Noté ✓</span>' : '<button data-a="ackRc">C\'est noté</button>'}
  </div>
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><b>Changer d'appareil</b>
    ${t ? `<div style="text-align:center"><div class="big" style="letter-spacing:.12em">${esc(t.code.slice(0, 3))} ${esc(t.code.slice(3))}</div><div class="small">Saisis ce code sur ton nouvel appareil (lien « J'ai déjà un profil »). Valable 10 minutes, une seule fois.</div></div>` : '<button class="btn2" data-a="makeTransfer">Afficher un code de transfert</button>'}
  </div>
  ${p.role === 'admin' ? '<button class="btn2" data-a="openAdmin">Ouvrir l\'administration</button>' : `<details class="card"><summary class="small">Mode administrateur</summary><div class="row" style="margin-top:8px"><input class="inp grow" data-bind="tmp.adminCode" placeholder="Code administrateur" autocapitalize="off"><button class="btn2" style="width:auto" data-a="claimAdmin">Activer</button></div></details>`}
</div>`;
};

SCREENS.recover = () => `<div class="screen">${back(S.p ? 'Accueil' : 'Retour')}
  <h1 class="title">Retrouver mon profil</h1>
  <p class="sub">Sur ton ancien appareil : Mon profil → « Afficher un code de transfert ». Ou utilise ton code de secours.</p>
  ${S.p ? '<div class="banner"><div class="grow">Attention : le profil actuel de cet appareil sera remplacé. Note d\'abord son code de secours si tu veux le garder.</div></div>' : ''}
  <label class="lab" for="rcode">Code</label>
  <input id="rcode" class="inp" style="font-size:22px;text-align:center;letter-spacing:.08em" data-bind="tmp.rcode" placeholder="6 chiffres ou code de secours" autocapitalize="characters" autocomplete="off" spellcheck="false">
  <button class="btn blue" data-a="redeem">Récupérer mon profil</button>
</div>`;

// ----- Administration -----
SCREENS.admin = () => {
  const a = S.admin;
  const scopes = [['to_check', 'Mots à vérifier'], ['missing_synonyms', 'Mots sans synonymes'], ['language:en', 'Toute la base anglaise'], ['language:de', 'Toute la base allemande'], ['language:es', 'Toute la base espagnole'], ['all', 'Toute la base']];
  const list = S.adm.list;
  return `<div class="screen">${back()}
  <h1 class="title">Administration</h1>
  ${a ? `<table class="mini"><tr><th></th><th>Mots</th><th>À vérifier</th><th>À arbitrer</th><th>Sans syn.</th></tr>${Object.entries(a.langs).map(([k, x]) => `<tr><td><b>${LANGS[k].code}</b></td><td>${x.total}</td><td>${x.to_check}</td><td>${x.flagged}</td><td>${x.missing_synonyms}</td></tr>`).join('')}</table>
  <div class="small">${a.pendingRequests} demande${a.pendingRequests > 1 ? 's' : ''} de vérification en attente.</div>` : ''}
  <div class="card" style="display:flex;flex-direction:column;gap:10px"><b>Faire vérifier par Claude</b>
    <select class="inp" data-bind="adm.scope">${scopes.map(([v, l]) => `<option value="${v}" ${S.adm.scope === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <button class="btn blue" data-a="copyAdminRequest">Vérifier maintenant</button>
    <span class="small">La demande est copiée : colle-la dans une conversation Claude. Le résumé s'affiche dans la conversation.</span>
    <button class="btn2" data-a="adminRequest">Ajouter à la vérification de lundi</button>
    <span class="small">Claude la traite lundi à 7 h avec la relecture hebdomadaire et t'envoie le résumé par e-mail.</span>
  </div>
  <div class="row wrap">${[['flagged', 'À arbitrer'], ['to_check', 'À vérifier'], ['search', 'Rechercher']].map(([v, l]) => `<button class="pill ${S.adm.tab === v ? 'on' : ''}" data-a="admTab" data-v="${v}">${l}</button>`).join('')}</div>
  ${S.adm.tab === 'search' ? `<div class="row"><input class="inp grow" data-bind="adm.q" value="${esc(S.adm.q)}" placeholder="mot ou traduction"><button class="btn2" style="width:auto" data-a="admSearch">Chercher</button></div>` : ''}
  ${list ? (list.words.length ? list.words.map((w) => `<div class="list-item"><div class="grow"><b>${esc(w.t.join(' / '))}</b> = ${esc(w.f.join(' / '))}<div class="small">${w.id} · niv. ${w.level} · ${esc(w.status)}${w.note ? ' · ' + esc(w.note) : ''}</div></div><button class="btn2" style="width:auto" data-a="admEdit" data-id="${esc(w.id)}">Modifier</button></div>`).join('') : '<p class="small">Aucun mot.</p>') : ''}
  <b>Dernières corrections</b>
  ${a && a.lastReviews.length ? a.lastReviews.map((r) => `<div class="card small"><b>${frDate(r.at)}</b> · ${r.by === 'claude' ? 'Claude' : 'admin'} · ${esc(r.action)} · ${esc(r.wid)}<br>${r.before ? esc((r.before.t || []).join(' / ') + ' = ' + (r.before.f || []).join(' / ')) : ''} → <b>${r.after ? esc((r.after.t || []).join(' / ') + ' = ' + (r.after.f || []).join(' / ')) : ''}</b>
    ${(r.sources || []).length ? `<br>${r.sources.map((s) => `<a href="${esc(s)}" target="_blank" rel="noopener">source</a>`).join(' ')}` : ''}
    ${r.reverted ? '<br><i>Annulée</i>' : r.action !== 'merged' && r.action !== 'checked' ? `<br><button class="link" data-a="revert" data-id="${esc(r.id)}">Annuler cette correction</button>` : ''}</div>`).join('') : '<p class="small">Aucune correction pour l\'instant.</p>'}
  <b>Exporter (sauvegarde)</b>
  <div class="row">${Object.entries(LANGS).map(([k, L]) => `<button class="btn2" data-a="exportCsv" data-v="${k}">${L.code}</button>`).join('')}</div>
</div>`;
};

SCREENS.adminWord = () => {
  const e = S.edit;
  return `<div class="screen">${back('Retour')}
  <h1 class="title">Modifier un mot</h1>
  <div class="small">${esc(e.id)} · ajouté ${e.src === 'user' ? 'par un utilisateur' : 'base'}</div>
  <label class="small">Termes (/)<input class="inp" data-bind="edit.t" value="${esc(e.t)}"></label>
  <label class="small">Français (/)<input class="inp" data-bind="edit.f" value="${esc(e.f)}"></label>
  <div class="row"><label class="small">Niveau<select class="inp" data-bind="edit.level">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => `<option ${Number(e.level) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
  <label class="small grow">Type<select class="inp" data-bind="edit.type">${TYPES.map((t) => `<option value="${t}" ${e.type === t ? 'selected' : ''}>${t || '—'}</option>`).join('')}</select></label></div>
  <label class="small">Thème<input class="inp" data-bind="edit.theme" value="${esc(e.theme)}"></label>
  <label class="small">Indice de sens<input class="inp" data-bind="edit.note" value="${esc(e.note)}"></label>
  <label class="small">Statut<select class="inp" data-bind="edit.status">${['validated', 'flagged', 'to_check'].map((s) => `<option value="${s}" ${e.status === s ? 'selected' : ''}>${{ validated: 'validé', flagged: 'à arbitrer', to_check: 'à vérifier' }[s]}</option>`).join('')}</select></label>
  <button class="btn green" data-a="admSave">Enregistrer</button>
</div>`;
};

// ---------- Partie ----------
function weight(id) {
  const s = st(id);
  const score = s ? s.s : 0;
  const never = !s || !s.a;
  return Math.pow(1.5, -score) * (never ? 10 : 1);
}
function pickWeighted(ids, n) {
  const pool = [...ids]; const out = [];
  while (out.length < n && pool.length) {
    const ws = pool.map(weight); const tot = ws.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot; let i = 0;
    for (; i < pool.length - 1; i++) { r -= ws[i]; if (r <= 0) break; }
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
function startSession(sel) {
  const ids = sel.ids.filter((id) => W(id));
  const n = Math.min(QUESTIONS, ids.length);
  if (!n) { toast('Aucun mot à réviser avec ce choix.'); return; }
  const dir = S.p.dir;
  const items = pickWeighted(ids, n).map((id) => ({ id, dir: dir === 'mixed' ? (Math.random() < 0.5 ? 'to_fr' : 'from_fr') : dir }));
  S.lastSel = sel;
  S.q = { mode: sel.mode, lang: sel.lang, level: prog(sel.lang).level, lesson: sel.lesson || null, title: sel.title || '', items, i: 0, score: 0, missed: [], fb: null, answer: '', given: '', xp: 0 };
  go('quiz');
}
function currentExpected() {
  const q = S.q; const it = q.items[q.i]; const w = W(it.id);
  return it.dir === 'to_fr' ? w.f : w.t;
}
function answerWith(given, ok) {
  const q = S.q; if (!q || q.fb) return;
  const it = q.items[q.i];
  q.fb = ok ? 'ok' : 'ko'; q.given = given; q.fbAt = Date.now();
  if (ok) { q.score += 1; q.xp += 10; } else q.missed.push(it.id);
  const s = S.p.w[it.id] || (S.p.w[it.id] = { s: 0, a: 0, e: 0, c: 0 });
  s.a += 1; if (ok) { s.c += 1; s.s = Math.min(5, s.s + 1); S.p.xp += 10; } else { s.e += 1; s.s = Math.max(-10, s.s - 1); }
  S.pending.push({ id: it.id, ok });
  flushPending();
  beep(ok);
  render();
  clearTimeout(S.timer);
  S.timer = setTimeout(nextQuestion, ok ? 1500 : 5000);
}
let flushing = false;
async function flushPending() {
  if (flushing) return; flushing = true;
  try {
    while (S.pending.length) {
      const a = S.pending[0];
      try { await api('/answer', { body: a }); S.pending.shift(); } catch { break; }
    }
  } finally { flushing = false; }
}
function nextQuestion() {
  clearTimeout(S.timer);
  const q = S.q; if (!q || !q.fb) return;
  q.i += 1; q.fb = null; q.answer = ''; q.given = '';
  if (q.i >= q.items.length) { finishSession(); return; }
  render();
}
async function finishSession() {
  const q = S.q;
  await flushPending();
  S.r = { q, levelChange: 0, remaining: 0, bonus: 0, offline: false };
  try {
    const res = await api('/finish', { body: { mode: q.mode, lang: q.lang, score: q.score, total: q.items.length, day: today(), lesson: q.lesson } });
    S.p = res.profile; S.r.levelChange = res.levelChange; S.r.remaining = res.remaining; S.r.bonus = res.bonus; S.r.newBadges = res.newBadges || [];
  } catch { S.r.offline = true; }
  S.stack = [];
  S.screen = 'result'; render(); window.scrollTo(0, 0);
  if (q.score === q.items.length || S.r.levelChange === 1 || (S.r.newBadges || []).length) confetti();
}

// ---------- Actions ----------
const A = {
  back() { clearTimeout(S.timer); const prev = S.stack.pop(); S.screen = prev || (S.p ? 'home' : 'gate'); S.confirm = null; render(); window.scrollTo(0, 0); },
  home,
  nav(el) { if (el.dataset.to === 'profile') { S.tmp.name = null; S.transfer = null; } go(el.dataset.to); },
  ackNewRc() { S.newRc = null; api('/me', { body: { rcAck: true } }).then((r) => { S.p = r.profile; render(); }).catch(fail); render(); },
  async ackBadges() { try { const r = await api('/me', { body: { badgeAck: true } }); S.p = r.profile; render(); } catch (e) { fail(e); } },
  async ackRc() { try { const r = await api('/me', { body: { rcAck: true } }); S.p = r.profile; render(); } catch (e) { fail(e); } },
  playLevel() {
    if (!S.p.setup) { S.tmp = { lang: S.p.lang, level: prog(S.p.lang).level, name: S.p.name }; go('setup'); return; }
    const lang = S.p.lang; const lv = prog(lang).level;
    startSession({ mode: 'my_level', lang, ids: levelWords(lang, lv).map((w) => w.id), title: `${LANGS[lang].name} · niveau ${lv}` });
  },
  async tmpLang(el) { S.tmp.lang = el.dataset.v; try { await withLoading(() => loadWords(S.tmp.lang)); } catch (e) { fail(e); } S.tmp.level = prog(S.tmp.lang).level; render(); },
  tmpLevel(el) { S.tmp.level = Number(el.dataset.v); render(); },
  async setupGo() {
    try {
      await withLoading(async () => {
        const body = { lang: S.tmp.lang, setup: true };
        if ((S.tmp.name || '').trim()) body.name = S.tmp.name.trim();
        const r = await api('/me', { body }); S.p = r.profile;
        if (prog(S.tmp.lang).level !== S.tmp.level) { const r2 = await api('/level', { body: { lang: S.tmp.lang, level: S.tmp.level } }); S.p = r2.profile; }
        await loadWords(S.p.lang);
      });
      S.stack = []; S.screen = 'home'; A.playLevel();
    } catch (e) { fail(e); }
  },
  langLevel() { S.tmp = { lang: S.p.lang, level: prog(S.p.lang).level }; go('lang'); },
  async langSave() {
    try {
      await withLoading(async () => {
        if (S.tmp.lang !== S.p.lang || !S.p.setup) { const r = await api('/me', { body: { lang: S.tmp.lang, setup: true } }); S.p = r.profile; }
        if (prog(S.tmp.lang).level !== S.tmp.level) { const r2 = await api('/level', { body: { lang: S.tmp.lang, level: S.tmp.level } }); S.p = r2.profile; }
        await loadWords(S.p.lang);
      });
      home(); toast(`${LANGS[S.p.lang].name}, niveau ${prog(S.p.lang).level}`);
    } catch (e) { fail(e); }
  },
  submit() {
    const inp = document.getElementById('answer');
    const given = inp ? inp.value : S.q.answer;
    if (!given.trim()) { toast('Écris une réponse, ou touche « Je ne sais pas ».', 2500); return; }
    answerWith(given, matches(given, currentExpected()));
  },
  dontKnow() { answerWith('', false); },
  next() { nextQuestion(); },
  quitQuiz() { clearTimeout(S.timer); flushPending(); S.q = null; home(); },
  async toggleRev(el) {
    const id = el.dataset.id; const s = S.p.w[id] || (S.p.w[id] = { s: 0, a: 0, e: 0, c: 0 });
    s.r = !s.r;
    const inp = document.getElementById('answer'); if (inp && S.q) S.q.answer = inp.value;
    render();
    try { await api('/review', { body: { id, on: s.r } }); } catch (e) { fail(e); }
  },
  replay() { if (S.lastSel) startSession(S.lastSel); },
  replayMissed() { const ids = [...new Set(S.r.q.missed)]; startSession({ ...S.lastSel, mode: S.lastSel.mode === 'my_level' ? 'errors' : S.lastSel.mode, ids, title: 'Mes erreurs' }); },
  async playLastLesson() { const l = lessonsOf(S.p.lang)[0]; if (l) A.playLesson({ dataset: { id: l.id } }); },
  async playLesson(el) {
    const l = S.p.lessons.find((x) => x.id === el.dataset.id); if (!l) return;
    try { await withLoading(() => loadWords(l.lang)); } catch (e) { fail(e); return; }
    startSession({ mode: 'lesson', lang: l.lang, ids: l.words, lesson: l.id, title: l.name });
  },
  async delLesson(el) {
    const id = el.dataset.id;
    if (S.confirm !== id) { S.confirm = id; render(); return; }
    try { const r = await api('/lessons/delete', { body: { id } }); S.p = r.profile; S.confirm = null; render(); toast('Leçon supprimée. Les notes des mots sont gardées.'); } catch (e) { fail(e); }
  },
  choose() { S.ch = { lessons: new Set(), origin: 'all', period: 'all', from: '', to: '', levels: new Set(), err: false, never: false, rev: false }; go('choose'); },
  chLesson(el) { const s = S.ch.lessons; s.has(el.dataset.v) ? s.delete(el.dataset.v) : s.add(el.dataset.v); render(); },
  chOrigin(el) { S.ch.origin = el.dataset.v; render(); },
  chPeriod(el) { S.ch.period = el.dataset.v; render(); },
  chLevel(el) { const v = Number(el.dataset.v); const s = S.ch.levels; s.has(v) ? s.delete(v) : s.add(v); render(); },
  chState(el) { const k = el.dataset.v; S.ch[k] = !S.ch[k]; render(); },
  chPlay() { startSession({ mode: 'custom', lang: S.p.lang, ids: chooseIds(), title: 'Mes mots choisis' }); },
  async addLesson() {
    S.al = { name: `Leçon du ${frDate(today())}`, lang: S.p.lang, date: today(), rows: [], pasted: '', copied: false, parseError: false };
    go('addLesson');
    try { await loadWords(S.al.lang); } catch { /* sans détection des doublons */ }
  },
  async alAi() { try { await withLoading(() => loadWords(S.al.lang)); } catch { /* ignore */ } S.al.copied = false; S.al.parseError = false; go('ai'); },
  async alManual() { try { await withLoading(() => loadWords(S.al.lang)); } catch { /* ignore */ } S.al.rows = [emptyRow(), emptyRow(), emptyRow()]; go('verify'); },
  async copyPrompt() {
    const text = aiPrompt();
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    if (ok) { S.al.copied = true; render(); toast('Message copié. Colle-le dans ton IA avec la photo.'); } else toast('Copie impossible : sélectionne le texte à la main.');
  },
  async pasteClip() { try { const t = await navigator.clipboard.readText(); S.al.pasted = t; render(); } catch { toast('Colle la réponse à la main dans le cadre.'); } },
  readAnswer() {
    const ta = document.getElementById('paste'); if (ta) S.al.pasted = ta.value;
    const { rows, header } = parseAnswer(S.al.pasted);
    if (!rows.length) { S.al.parseError = true; render(); return; }
    if (header && LANGS[header.lang] && header.lang !== S.al.lang) { S.al.lang = header.lang; loadWords(header.lang).then(() => render()).catch(() => {}); }
    S.al.rows = rows; S.al.parseError = false; go('verify');
  },
  rowAdd() { S.al.rows.push(emptyRow()); render(); },
  rowDel(el) { S.al.rows.splice(Number(el.dataset.i), 1); render(); },
  async saveLesson() {
    const rows = S.al.rows.filter((r) => r.t.trim() || r.f.trim());
    const bad = rows.filter((r) => !splitTerms(r.t).length || !splitTerms(r.f).length);
    if (!rows.length) { toast('Ajoute au moins un mot.'); return; }
    if (bad.length) { toast(`${bad.length} mot${bad.length > 1 ? 's' : ''} sans traduction : complète ou supprime.`); return; }
    try {
      const res = await withLoading(() => api('/lessons', { body: { name: S.al.name, lang: S.al.lang, date: S.al.date, rows: rows.map((r) => ({ t: splitTerms(r.t), f: splitTerms(r.f), level: Number(r.level) || 1, type: r.type, theme: r.theme, note: r.note })) } }));
      S.p = res.profile;
      await loadWords(S.al.lang, true);
      S.stack = ['home']; S.screen = 'lessons'; render(); window.scrollTo(0, 0);
      toast(`Leçon enregistrée : ${res.lesson.words.length} mots${res.created ? `, dont ${res.created} nouveaux que Claude vérifiera` : ''}.`, 5000);
    } catch (e) { fail(e); }
  },
  async saveName() { const name = S.tmp.name != null ? S.tmp.name : S.p.name; try { const r = await api('/me', { body: { name } }); S.p = r.profile; toast('Prénom enregistré.'); render(); } catch (e) { fail(e); } },
  async setAvatar(el) { try { const r = await api('/me', { body: { avatar: Number(el.dataset.v) } }); S.p = r.profile; render(); } catch (e) { fail(e); } },
  async setDir(el) { try { const r = await api('/me', { body: { dir: el.dataset.v } }); S.p = r.profile; render(); } catch (e) { fail(e); } },
  async toggleSound() { try { const r = await api('/me', { body: { sound: !S.p.sound } }); S.p = r.profile; render(); } catch (e) { fail(e); } },
  async makeTransfer() { try { S.transfer = await api('/transfer', { body: {} }); render(); } catch (e) { fail(e); } },
  async claimAdmin() { try { const r = await api('/admin/claim', { body: { code: (S.tmp.adminCode || '').trim() } }); S.p = r.profile; toast('Mode administrateur activé.'); render(); } catch (e) { fail(e); } },
  async joinInvite() {
    let code = (S.tmp.icode || '').trim();
    const m = code.match(/[?&]i=([^&#\s]+)/);
    if (m) code = decodeURIComponent(m[1]);
    try {
      const res = await withLoading(() => api('/profile', { body: { invite: code }, noLogout: true }));
      S.token = res.token; if (!store.set('vq_token', res.token)) S.noStorage = true;
      S.tmp = {};
      await withLoading(boot2);
    } catch (e) { fail(e); }
  },
  async redeem() {
    const code = (S.tmp.rcode || '').trim();
    if (!code) { toast('Saisis le code.'); return; }
    try {
      const res = await withLoading(() => api('/redeem', { body: { code }, noLogout: true }));
      S.token = res.token; if (!store.set('vq_token', res.token)) S.noStorage = true;
      S.newRc = res.newRecovery || null; S.words = {}; S.wmap = new Map(); S.tmp = {};
      await withLoading(boot2);
      toast('Profil retrouvé !');
    } catch (e) { fail(e); }
  },
  async openAdmin() {
    S.adm = { tab: 'flagged', list: null, q: '', scope: S.adm.scope || 'to_check' };
    try { await withLoading(async () => { S.admin = await api('/admin/summary'); S.adm.list = await api('/admin/words?status=flagged&limit=100'); }); go('admin'); } catch (e) { fail(e); }
  },
  async admTab(el) {
    S.adm.tab = el.dataset.v; S.adm.list = null;
    if (S.adm.tab !== 'search') { try { S.adm.list = await withLoading(() => api(`/admin/words?status=${S.adm.tab}&limit=100`)); } catch (e) { fail(e); } }
    render();
  },
  async admSearch() { try { S.adm.list = await withLoading(() => api(`/admin/words?status=all&limit=100&q=${encodeURIComponent(S.adm.q || '')}`)); render(); } catch (e) { fail(e); } },
  admEdit(el) {
    const w = (S.adm.list.words || []).find((x) => x.id === el.dataset.id); if (!w) return;
    S.edit = { ...w, t: w.t.join(' / '), f: w.f.join(' / ') }; go('adminWord');
  },
  async admSave() {
    const e = S.edit;
    try {
      await withLoading(() => api('/admin/word', { body: { id: e.id, t: splitTerms(e.t), f: splitTerms(e.f), level: Number(e.level), type: e.type, theme: e.theme, note: e.note, status: e.status } }));
      S.admin = await api('/admin/summary');
      if (S.adm.tab !== 'search') S.adm.list = await api(`/admin/words?status=${S.adm.tab}&limit=100`); else S.adm.list = await api(`/admin/words?status=all&limit=100&q=${encodeURIComponent(S.adm.q || '')}`);
      S.words = {}; S.wmap = new Map(); await loadWords(S.p.lang);
      A.back(); toast('Mot enregistré.');
    } catch (err) { fail(err); }
  },
  async adminRequest() {
    const [scope, value] = (S.adm.scope || 'to_check').split(':');
    try { await api('/admin/request', { body: { scope, value } }); S.admin = await api('/admin/summary'); render(); toast('Demande enregistrée pour la vérification de lundi 7 h.', 5000); } catch (e) { fail(e); }
  },
  async copyAdminRequest() {
    const labels = { to_check: 'les mots à vérifier', missing_synonyms: 'les mots sans synonymes ni indice', 'language:en': 'toute la base anglaise', 'language:de': 'toute la base allemande', 'language:es': 'toute la base espagnole', all: 'toute la base' };
    const label = labels[S.adm.scope || 'to_check'] || labels.to_check;
    const text = `Avec le connecteur VocaQuest, vérifie maintenant ${label}. Contrôle chaque mot dans des dictionnaires reconnus (Larousse, PONS, Duden, RAE, Cambridge), corrige si besoin, ajoute 1 à 2 synonymes par langue ou un indice de sens court, mets le statut validated si c'est sûr ou flagged en cas de doute, cite tes sources et fusionne les doublons (merge_words). Traite aussi les demandes en attente (list_requests puis complete_request). Termine par un résumé : mots vérifiés, corrigés, à arbitrer, avec la liste des corrections.`;
    let ok = false;
    try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); ok = true; } } catch { ok = false; }
    if (!ok) {
      const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
    }
    toast(ok ? 'Demande copiée : colle-la dans une conversation Claude.' : text, ok ? 4000 : 15000);
  },
  async revert(el) { try { await withLoading(() => api('/admin/revert', { body: { id: el.dataset.id } })); S.admin = await api('/admin/summary'); render(); toast('Correction annulée.'); } catch (e) { fail(e); } },
  async exportCsv(el) {
    try {
      const r = await fetch('/api/admin/export?lang=' + el.dataset.v, { headers: { authorization: 'Bearer ' + S.token } });
      if (!r.ok) throw new Error('Export impossible');
      const blob = await r.blob(); const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `vocaquest-${el.dataset.v}.csv`; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { fail(e); }
  },
};

// ---------- Événements ----------
document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-a]');
  if (!el || el.disabled) return;
  const fn = A[el.dataset.a];
  if (fn) { e.preventDefault(); fn(el, e); }
});
document.addEventListener('mousedown', (e) => { if (e.target.closest('[data-keep]')) e.preventDefault(); });
function setPath(path, value) {
  const parts = path.split('.'); let o = S;
  for (let i = 0; i < parts.length - 1; i++) { o = o[parts[i]]; if (!o) return; }
  o[parts[parts.length - 1]] = value;
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (el.dataset.bind) setPath(el.dataset.bind, el.value);
  if (el.dataset.row != null && S.al) S.al.rows[Number(el.dataset.row)][el.dataset.field] = el.value;
  if (el.id === 'answer' && S.q) { if (S.q.fb) el.value = S.q.given; else S.q.answer = el.value; }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.bind) { setPath(el.dataset.bind, el.value); if (el.dataset.rerender) render(); }
  if (el.dataset.row != null && S.al) { S.al.rows[Number(el.dataset.row)][el.dataset.field] = el.value; if (el.dataset.field === 't' || el.dataset.field === 'f') { const y = window.scrollY; render(); window.scrollTo(0, y); } }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'answer') {
    e.preventDefault();
    if (S.q && S.q.fb) { if (Date.now() - (S.q.fbAt || 0) > 700) nextQuestion(); } else A.submit();
    return;
  }
  if (S.screen === 'quiz' && S.q && S.q.fb && e.target.tagName !== 'BUTTON') { e.preventDefault(); nextQuestion(); }
  if (e.target.id === 'rcode') { e.preventDefault(); A.redeem(); }
  if (e.target.id === 'icode') { e.preventDefault(); A.joinInvite(); }
});
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') flushPending(); });

// ---------- Démarrage ----------
async function boot2() {
  const { profile } = await api('/me');
  S.p = profile;
  await loadWords(S.p.lang);
  S.stack = []; S.screen = 'home'; render();
  if (S.p.role === 'admin') api('/admin/summary').then((a) => { S.admin = a; if (S.screen === 'home') render(); }).catch(() => {});
}
async function boot() {
  render();
  const params = new URLSearchParams(location.search);
  const invite = params.get('i') || '';
  S.token = store.get('vq_token');
  if (store.set('vq_probe', '1')) store.del('vq_probe'); else S.noStorage = true;
  try {
    if (!S.token) {
      const res = await api('/profile', { body: { invite }, noLogout: true });
      S.token = res.token; store.set('vq_token', res.token);
    }
    if (params.get('i')) { try { history.replaceState(null, '', location.pathname); } catch { /* bac à sable */ } }
    if (!S.token) { S.screen = 'gate'; render(); return; }
    await boot2();
  } catch (e) {
    if (!S.token) { S.tmp.icode = invite && !window.VQ_DEMO ? invite : ''; S.screen = 'gate'; render(); }
    fail(e);
  }
}
boot();
