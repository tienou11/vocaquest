// Normalisation commune (correction des réponses et détection des doublons).
const ARTICLES = /^(l'|le |la |les |un |une |des |the |a |an |der |die |das |den |dem |ein |eine |einen |el |los |las |una |uno |unos |unas |to )/;

function base(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[’`´‘]/g, "'")
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[.!?¡¿;:,"«»]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function strip(x) {
  return x.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
}

function dropArticle(x) {
  const y = x.replace(ARTICLES, '').trim();
  return y || x;
}

export function norm(s) {
  return dropArticle(strip(base(s)).trim());
}

// Variante allemande : ä -> ae, ö -> oe, ü -> ue (accepte « Maedchen » pour « Mädchen »).
export function normDe(s) {
  const b = base(s).replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue');
  return dropArticle(strip(b).trim());
}

export function matches(answer, expected) {
  const a = norm(answer);
  if (!a) return false;
  const ad = normDe(answer);
  return expected.some((e) => norm(e) === a || normDe(e) === ad);
}

export function wordKey(lang, t0, f0) {
  return `${lang}|${norm(t0)}|${norm(f0)}`;
}
