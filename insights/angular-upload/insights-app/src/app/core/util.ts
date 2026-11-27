import type { Article } from './models';

export const slugify = (t: string) =>
  String(t).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/, '');

/** URL part for an article: readable title + the Firestore id (20 chars) at the end */
export const articleSlug = (a: Pick<Article, 'title' | 'id'>) => `${slugify(a.title)}-${a.id}`;
export const idFromSlug = (s: string) => (s.length >= 20 ? s.slice(-20) : s);

export const initials = (n: string) =>
  String(n || '?').replace(/^(CA|CS|Adv\.?|Dr\.?|Mr\.?|Ms\.?|Mrs\.?)\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export const fmtDate = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '';

export const wordCount = (html: string) => (String(html).replace(/<[^>]+>/g, ' ').match(/\S+/g) || []).length;

const ALLOWED = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'H2', 'H3', 'UL', 'OL', 'LI', 'A', 'BLOCKQUOTE', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD']);
const DROP = new Set(['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'FORM', 'INPUT', 'BUTTON', 'LINK', 'META']);

/** Whitelist sanitiser used when an article is saved (browser only). */
export function sanitize(html: string): string {
  const parsed = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
  const root = parsed.body.firstChild as HTMLElement;
  (function clean(node: Node) {
    [...Array.from(node.childNodes)].forEach((ch) => {
      if (ch.nodeType === 3) return;
      if (ch.nodeType !== 1) { (ch as ChildNode).remove(); return; }
      let el = ch as HTMLElement;
      let tag = el.tagName;
      if (DROP.has(tag)) { el.remove(); return; }
      clean(el);
      if (tag === 'DIV') { const p = parsed.createElement('p'); p.append(...Array.from(el.childNodes)); el.replaceWith(p); el = p; tag = 'P'; }
      if (!ALLOWED.has(tag)) { el.replaceWith(...Array.from(el.childNodes)); return; }
      Array.from(el.attributes).forEach((a) => { if (!(tag === 'A' && a.name === 'href')) el.removeAttribute(a.name); });
      if (tag === 'A') {
        const h = (el.getAttribute('href') || '').trim();
        if (/^(https?:|mailto:)/i.test(h)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer nofollow'); }
        else el.removeAttribute('href');
      }
    });
  })(root);
  return root.innerHTML;
}
