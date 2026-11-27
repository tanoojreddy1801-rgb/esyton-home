// Runs after `ng build`: writes sitemap.xml and makes the private screens work when opened directly.
import fs from 'node:fs';
import path from 'node:path';

const OUT = 'dist/insights-app/browser';
const SITE = 'https://esyton.com';
const cfg = fs.readFileSync('src/app/core/config.ts', 'utf8');
const KEY = cfg.match(/apiKey:\s*'([^']+)'/)[1];
const PROJECT = cfg.match(/projectId:\s*'([^']+)'/)[1];

const slugify = (t) => String(t).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');
const val = (f) => (f == null ? '' : (f.stringValue ?? f.integerValue ?? f.timestampValue ?? ''));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery?key=${KEY}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'articles' }], where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } } } }),
});
if (!res.ok) { console.error('Firestore query failed', res.status); process.exit(1); }
const arts = (await res.json()).filter((r) => r.document).map((r) => {
  const f = r.document.fields || {};
  const id = r.document.name.split('/').pop();
  return { loc: `${SITE}/insights/a/${slugify(val(f.title))}-${id}/`, lastmod: (val(f.updatedAt) || val(f.publishedAt) || r.document.createTime).slice(0, 10) };
});

const urls = [
  { loc: `${SITE}/insights/`, lastmod: arts.map((a) => a.lastmod).sort().pop() },
  { loc: `${SITE}/insights/terms/` }, { loc: `${SITE}/insights/disclaimer/` }, ...arts,
];
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`).join('\n')}\n</urlset>\n`);

// Private screens: serve the client-side app shell when opened directly (GitHub Pages is static)
const shell = fs.existsSync(path.join(OUT, 'index.csr.html')) ? 'index.csr.html' : 'index.html';
for (const dir of ['dashboard', 'write']) {
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });
  fs.copyFileSync(path.join(OUT, shell), path.join(OUT, dir, 'index.html'));
}
console.log(`Sitemap written with ${urls.length} URLs (${arts.length} articles).`);
