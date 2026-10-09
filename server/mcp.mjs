// Connecteur MCP (HTTP, sans état) permettant à Claude de vérifier et corriger la base de mots.
import * as C from './core.mjs';

const INSTRUCTIONS = `Connecteur de la base de vocabulaire VocaQuest (français <-> anglais/allemand/espagnol).
Chaque mot : id, lang (en|de|es), level (1-10), t (terme principal + 1 à 2 synonymes dans la langue étrangère), f (traduction française principale + 1 à 2 synonymes), type, theme, note (indice de sens), status (to_check | validated | flagged).
Règles : ne jamais changer un id ; ajouter 1 à 2 synonymes de chaque côté pour préciser le sens, sinon un indice de sens dans note ;
mettre status=validated si le mot est sûr, status=flagged si les dictionnaires se contredisent ou ne trouvent pas le mot ;
citer les URL des dictionnaires consultés dans sources ; fusionner les doublons avec merge_words (keep_id = mot le plus ancien de la base).`;

const S = (props, required = []) => ({ type: 'object', properties: props, required, additionalProperties: false });
const str = (d) => ({ type: 'string', description: d });
const int = (d) => ({ type: 'integer', description: d });
const arr = (d) => ({ type: 'array', items: { type: 'string' }, description: d });

const TOOLS = [
  { name: 'overview', description: 'Résumé de la base : nombre de mots par langue, à vérifier, à arbitrer, sans synonymes, demandes de vérification en attente.', inputSchema: S({}), fn: () => C.summary() },
  { name: 'list_requests', description: "Demandes de vérification envoyées depuis l'appli (bouton admin).", inputSchema: S({ pending_only: { type: 'boolean', description: 'true par défaut' } }), fn: (a) => C.listRequests({ pending_only: a.pending_only !== false }) },
  { name: 'complete_request', description: 'Marque une demande comme traitée, avec le résumé envoyé à l’administrateur.', inputSchema: S({ id: str('id de la demande'), summary: str('résumé') }, ['id', 'summary']), fn: (a) => C.completeRequest(a) },
  {
    name: 'list_words', description: 'Liste des mots filtrés (100 par page).',
    inputSchema: S({ lang: str('en, de ou es'), status: str('to_check, validated, flagged ou all'), level: int('1 à 10'), missing_synonyms: { type: 'boolean', description: 'seulement les mots sans synonyme ni indice' }, q: str('recherche'), ids: arr('ids précis'), limit: int('max 300'), offset: int('décalage') }),
    fn: (a) => C.listWords(a),
  },
  { name: 'rotation_sample', description: 'Échantillon de mots validés relus le moins récemment (relecture tournante hebdomadaire).', inputSchema: S({ lang: str('en, de ou es'), n: int('50 par défaut') }, ['lang']), fn: (a) => C.rotationSample(a) },
  {
    name: 'update_word', description: "Corrige et/ou valide un mot. Les champs absents restent inchangés. Un mot 'to_check' passé en validated ou flagged rejoint la base commune. Chaque appel est journalisé et annulable par l'administrateur.",
    inputSchema: S({ id: str('id du mot'), t: arr('terme principal puis 1 à 2 synonymes'), f: arr('traduction principale puis 1 à 2 synonymes'), level: int('1 à 10'), type: str('nom, verbe, adjectif, adverbe, expression'), theme: str('thème en un mot'), note: str('indice de sens court'), status: str('validated, flagged ou to_check'), sources: arr('URL des dictionnaires consultés'), comment: str('explication courte') }, ['id']),
    fn: (a) => C.updateWord({ ...a, by: 'claude' }),
  },
  { name: 'merge_words', description: 'Fusionne deux doublons : les notes et leçons des utilisateurs passent sur keep_id (note la plus basse conservée), drop_id est supprimé.', inputSchema: S({ keep_id: str('mot conservé'), drop_id: str('doublon supprimé'), sources: arr('URL'), comment: str('raison') }, ['keep_id', 'drop_id']), fn: (a) => C.mergeWords({ ...a, by: 'claude' }) },
  { name: 'recent_reviews', description: 'Dernières corrections journalisées.', inputSchema: S({ limit: int('50 par défaut') }), fn: (a) => C.recentReviews(a) },
];

const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05'];

async function dispatch(method, params) {
  if (method === 'initialize') {
    const v = SUPPORTED.includes(params.protocolVersion) ? params.protocolVersion : '2025-03-26';
    return { protocolVersion: v, capabilities: { tools: { listChanged: false } }, serverInfo: { name: 'vocaquest', version: '1.0.0' }, instructions: INSTRUCTIONS };
  }
  if (method === 'ping') return {};
  if (method === 'tools/list') return { tools: TOOLS.map(({ fn, ...t }) => t) };
  if (method === 'tools/call') {
    const tool = TOOLS.find((t) => t.name === params.name);
    if (!tool) { const e = new Error(`outil inconnu : ${params.name}`); e.code = -32602; throw e; }
    try {
      const out = await tool.fn(params.arguments || {});
      return { content: [{ type: 'text', text: JSON.stringify(out) }] };
    } catch (e) {
      return { content: [{ type: 'text', text: `Erreur : ${e.message}` }], isError: true };
    }
  }
  const e = new Error(`méthode inconnue : ${method}`); e.code = -32601; throw e;
}

const json = (d, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json' } });

export async function handleMcp(req) {
  const url = new URL(req.url);
  const secret = url.pathname.split('/')[2] || '';
  if (!process.env.MCP_SECRET || secret !== process.env.MCP_SECRET) return new Response('Not found', { status: 404 });
  if (req.method === 'DELETE') return new Response(null, { status: 204 });
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
  let msg;
  try { msg = await req.json(); } catch { return json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'JSON invalide' } }, 400); }
  const one = async (m) => {
    if (!m || m.id === undefined || m.id === null) return null;
    try { return { jsonrpc: '2.0', id: m.id, result: await dispatch(m.method, m.params || {}) }; } catch (e) {
      return { jsonrpc: '2.0', id: m.id, error: { code: e.code || -32000, message: e.message } };
    }
  };
  if (Array.isArray(msg)) {
    const out = (await Promise.all(msg.map(one))).filter(Boolean);
    return out.length ? json(out) : new Response(null, { status: 202 });
  }
  const r = await one(msg);
  return r ? json(r) : new Response(null, { status: 202 });
}
