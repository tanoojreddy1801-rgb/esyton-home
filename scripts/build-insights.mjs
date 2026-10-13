// Esyton Insights: static page generator (runs in GitHub Actions)
// Reads PUBLISHED articles from Firestore (public read, same as the website)
// and writes one real, crawlable HTML page per article + a sitemap.
import fs from "node:fs";
import path from "node:path";
import sanitizeHtml from "sanitize-html";

const SITE = "https://esyton.com";
const LOGO = "https://raw.githubusercontent.com/tanoojreddy1801-rgb/esyton-home/main/logo.jpg";
const FAVICON = "https://raw.githubusercontent.com/tanoojreddy1801-rgb/esyton-home/main/favicon.ico";

const cfg = fs.readFileSync("firebase-config.js", "utf8");
const API_KEY = cfg.match(/apiKey:\s*"([^"]+)"/)[1];
const PROJECT = cfg.match(/projectId:\s*"([^"]+)"/)[1];

// MUST match slugify() in insights/index.html
const slugify = t => String(t).toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70).replace(/-+$/, "");
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const val = f => f == null ? "" : (f.stringValue ?? f.integerValue ?? f.timestampValue ?? "");
const initials = n => String(n || "?").replace(/^(CA|CS|Adv\.?|Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, "").split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
const fmtDate = iso => iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "";

const clean = html => sanitizeHtml(html || "", {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "u", "h2", "h3", "ul", "ol", "li", "a", "blockquote", "table", "thead", "tbody", "tr", "th", "td"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: { div: "p", a: sanitizeHtml.simpleTransform("a", { target: "_blank", rel: "noopener noreferrer nofollow" }) }
});

// 1. Fetch published articles (abort BEFORE touching any files if this fails)
const res = await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery?key=${API_KEY}`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "articles" }], where: { fieldFilter: { field: { fieldPath: "status" }, op: "EQUAL", value: { stringValue: "published" } } } } })
});
if (!res.ok) { console.error("Firestore query failed:", res.status, await res.text()); process.exit(1); }
const rows = await res.json();
const articles = rows.filter(r => r.document).map(r => {
  const f = r.document.fields || {};
  const id = r.document.name.split("/").pop();
  const a = { id, title: val(f.title), summary: val(f.summary), body: clean(val(f.body)), category: val(f.category), authorName: val(f.authorName), authorDesignation: val(f.authorDesignation), readMins: Number(val(f.readMins)) || 1, publishedAt: val(f.publishedAt) || r.document.createTime, updatedAt: val(f.updatedAt) || val(f.publishedAt) || r.document.createTime };
  a.slug = `${slugify(a.title)}-${id}`;
  return a;
}).sort((x, y) => new Date(y.publishedAt) - new Date(x.publishedAt));

// 2. Page template
function page(a, related) {
  const url = `${SITE}/insights/a/${a.slug}/`;
  const words = a.body.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  const ld = {
    "@context": "https://schema.org", "@type": "Article",
    headline: a.title, description: a.summary, articleSection: a.category, wordCount: words, inLanguage: "en-IN",
    datePublished: a.publishedAt, dateModified: a.updatedAt, mainEntityOfPage: url,
    author: { "@type": "Person", name: a.authorName, ...(a.authorDesignation ? { jobTitle: a.authorDesignation } : {}) },
    publisher: { "@type": "Organization", name: "Esyton Insights LLP", url: SITE, logo: { "@type": "ImageObject", url: LOGO } }
  };
  const ldJson = JSON.stringify(ld).replace(/</g, "\\u003c");
  const css = fs.readFileSync("insights/index.html", "utf8").match(/<style>([\s\S]*?)<\/style>/)[1];
  return `<!DOCTYPE html>
<html lang="en-IN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(a.title)} | Esyton Insights</title>
  <meta name="description" content="${esc(a.summary)}">
  <meta name="author" content="${esc(a.authorName)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Esyton Insights">
  <meta property="og:title" content="${esc(a.title)}">
  <meta property="og:description" content="${esc(a.summary)}">
  <meta property="og:url" content="${url}">
  <meta property="og:image" content="${LOGO}">
  <meta property="article:published_time" content="${esc(a.publishedAt)}">
  <meta property="article:modified_time" content="${esc(a.updatedAt)}">
  <meta property="article:section" content="${esc(a.category)}">
  <meta name="twitter:card" content="summary">
  <meta name="theme-color" content="#062f59">
  <link rel="icon" type="image/x-icon" href="${FAVICON}">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@tabler/icons-webfont@latest/tabler-icons.min.css">
  <script type="application/ld+json">${ldJson}</script>
  <style>${css}</style>
</head>
<body>
  <div class="topbar"><div class="shell topbar-row"><div><strong>Esyton Insights</strong> &nbsp;·&nbsp; Articles by empanelled professionals</div><div>connect@esyton.com</div></div></div>
  <header class="site-header"><div class="shell nav">
    <a href="/" class="brand" aria-label="Esyton home"><img src="${LOGO}" alt="Esyton Insights Logo" class="brand-logo"></a>
    <nav class="nav-links" aria-label="Main">
      <a href="/">Home</a><a href="/insights/" class="active">Insights</a><a href="/#services">Services</a><a href="/#query">Enquiry</a>
      <div class="nav-auth"><a class="nav-btn" href="/insights/#/dashboard">Login</a><a class="nav-btn solid" href="/insights/#/dashboard">Register</a></div>
    </nav></div></header>
  <main><div class="shell"><article class="article-wrap">
    <a class="back-link" href="/insights/">&larr; All articles</a>
    <span class="tag">${esc(a.category)}</span>
    <h1>${esc(a.title)}</h1>
    <div class="article-meta">
      <span class="avatar">${esc(initials(a.authorName))}</span>
      <span><strong style="color:var(--navy)">${esc(a.authorName)}</strong>${a.authorDesignation ? `<br>${esc(a.authorDesignation)}` : ""}</span>
      <span><time datetime="${esc(a.publishedAt)}">${esc(fmtDate(a.publishedAt))}</time></span><span>${a.readMins} min read</span>
    </div>
    <div class="prose">${a.body}</div>
    <p class="disclaimer">This article reflects the personal views of its author and is published for general information only. It is not legal, tax, accounting, financial or investment advice, and reading it does not create a professional engagement. Laws and rates change; please consult a qualified professional before acting. See our <a href="/insights/#/disclaimer" style="text-decoration:underline">Disclaimer</a> and <a href="/insights/#/terms" style="text-decoration:underline">Terms and Conditions</a>. Need help? <a href="/#query" style="text-decoration:underline">Contact Esyton</a>.</p>
    ${related.length ? `<h2 style="margin:40px 0 16px;font-size:1.3rem">More from Esyton Insights</h2><div class="grid" style="grid-template-columns:1fr">${related.map(r => `<a class="card" href="/insights/a/${r.slug}/"><span class="tag">${esc(r.category)}</span><h3>${esc(r.title)}</h3><p>${esc(r.summary)}</p></a>`).join("")}</div>` : ""}
  </article></div></main>
  <footer class="site-footer"><div class="shell">
    <div class="footer-row"><a href="/" aria-label="Esyton home"><img src="${LOGO}" alt="Esyton Insights Logo" class="footer-logo"></a>
      <div style="display:flex;gap:16px;flex-wrap:wrap"><a href="/">Home</a><a href="/insights/">Insights</a><a href="/#services">Services</a><a href="/#query">Enquiry Desk</a><a href="/insights/#/terms">Terms &amp; Conditions</a><a href="/insights/#/disclaimer">Disclaimer</a></div></div>
    <p class="footer-notice">Content on Esyton Insights is published for general information only and is not legal, tax, accounting or investment advice. Views expressed are those of the respective authors. Esyton Insights LLP provides business support, accounting organization, tax filing, and administrative services on non-assurance and non-attest tracks.</p>
  </div></footer>
</body>
</html>
`;
}

// 3. Write files (clean rebuild so unpublished/deleted articles disappear)
fs.rmSync("insights/a", { recursive: true, force: true });
for (const a of articles) {
  const related = articles.filter(r => r.id !== a.id && r.category === a.category).slice(0, 3);
  const dir = path.join("insights/a", a.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), page(a, related));
}
const urls = [{ loc: `${SITE}/insights/`, lastmod: articles[0]?.updatedAt }, ...articles.map(a => ({ loc: `${SITE}/insights/a/${a.slug}/`, lastmod: a.updatedAt }))];
fs.writeFileSync("insights/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${esc(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod.slice(0, 10)}</lastmod>` : ""}</url>`).join("\n")}\n</urlset>\n`);
console.log(`Built ${articles.length} article page(s).`);
