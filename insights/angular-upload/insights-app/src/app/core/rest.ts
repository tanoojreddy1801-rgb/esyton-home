// Public (no login) reads from Firestore's REST API. Works in the browser AND at build time (prerender).
import { FIREBASE } from './config';
import type { Article } from './models';

export const DOCS = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;
export const QUERY_URL = `${DOCS}:runQuery?key=${FIREBASE.apiKey}`;
export const QUERY_BODY = {
  structuredQuery: {
    from: [{ collectionId: 'articles' }],
    where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'EQUAL', value: { stringValue: 'published' } } },
  },
};
export const docUrl = (id: string) => `${DOCS}/articles/${encodeURIComponent(id)}?key=${FIREBASE.apiKey}`;

const val = (f: any): string => (f == null ? '' : (f.stringValue ?? f.integerValue ?? f.timestampValue ?? ''));

export function parseDoc(d: any): Article {
  const f = d.fields || {};
  return {
    id: String(d.name).split('/').pop() as string,
    title: val(f.title), summary: val(f.summary), body: val(f.body), category: val(f.category),
    authorName: val(f.authorName), authorDesignation: val(f.authorDesignation),
    status: (val(f.status) || 'published') as Article['status'],
    readMins: Number(val(f.readMins)) || 1,
    publishedAt: val(f.publishedAt) || d.createTime,
    updatedAt: val(f.updatedAt) || val(f.publishedAt) || d.createTime,
    createdAt: val(f.createdAt) || d.createTime,
  };
}

export function parseQuery(rows: any[]): Article[] {
  return rows.filter((r) => r.document).map((r) => parseDoc(r.document))
    .sort((a, b) => new Date(b.publishedAt!).getTime() - new Date(a.publishedAt!).getTime());
}

/** Used by the build (Node). Throws on failure so a broken build never replaces the live site. */
export async function fetchPublishedForBuild(): Promise<Article[]> {
  const res = await fetch(QUERY_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(QUERY_BODY) });
  if (!res.ok) throw new Error(`Firestore query failed: ${res.status} ${await res.text()}`);
  return parseQuery(await res.json());
}
