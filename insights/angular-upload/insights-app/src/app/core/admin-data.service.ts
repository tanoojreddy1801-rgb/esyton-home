import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { PublicApi } from './public-api.service';
import type { Article, Profile } from './models';

const iso = (t: any): string | undefined => (t?.toDate ? t.toDate().toISOString() : typeof t === 'string' ? t : undefined);
const ms = (s?: string) => (s ? new Date(s).getTime() : 0);

/** Everything that needs a login (reads of private data and all writes). */
@Injectable({ providedIn: 'root' })
export class AdminData {
  private auth = inject(AuthService);
  private api = inject(PublicApi);

  private map(id: string, d: any): Article {
    return { ...d, id, createdAt: iso(d.createdAt), updatedAt: iso(d.updatedAt), publishedAt: iso(d.publishedAt) } as Article;
  }

  async article(id: string): Promise<Article | null> {
    const fb = await this.auth.firebase();
    try { const s = await fb.getDoc(fb.doc(fb.db, 'articles', id)); return s.exists() ? this.map(s.id, s.data()) : null; }
    catch { return null; }
  }

  async myArticles(uid: string): Promise<Article[]> {
    const fb = await this.auth.firebase();
    const s = await fb.getDocs(fb.query(fb.collection(fb.db, 'articles'), fb.where('authorUid', '==', uid)));
    return s.docs.map((d) => this.map(d.id, d.data())).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  }

  async allArticles(): Promise<Article[]> {
    const fb = await this.auth.firebase();
    const s = await fb.getDocs(fb.collection(fb.db, 'articles'));
    return s.docs.map((d) => this.map(d.id, d.data())).sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  }

  async allProfessionals(): Promise<(Profile & { id: string })[]> {
    const fb = await this.auth.firebase();
    const s = await fb.getDocs(fb.collection(fb.db, 'contributors'));
    return s.docs.map((d) => ({ ...(d.data() as any), id: d.id, createdAt: iso((d.data() as any).createdAt) }) as Profile & { id: string })
      .sort((a, b) => ms(b.createdAt) - ms(a.createdAt));
  }

  async setProfessional(id: string, status: 'approved' | 'rejected', note = '') {
    const fb = await this.auth.firebase();
    await fb.updateDoc(fb.doc(fb.db, 'contributors', id), { status, reviewedAt: fb.serverTimestamp(), reviewNote: note });
  }

  async publish(id: string) {
    const fb = await this.auth.firebase();
    await fb.updateDoc(fb.doc(fb.db, 'articles', id), { status: 'published', publishedAt: fb.serverTimestamp(), reviewNote: '' });
    this.api.clear();
  }
  async unpublish(id: string) {
    const fb = await this.auth.firebase();
    await fb.updateDoc(fb.doc(fb.db, 'articles', id), { status: 'draft' });
    this.api.clear();
  }
  async decline(id: string, note: string) {
    const fb = await this.auth.firebase();
    await fb.updateDoc(fb.doc(fb.db, 'articles', id), { status: 'rejected', reviewNote: note });
    this.api.clear();
  }
  async remove(id: string) {
    const fb = await this.auth.firebase();
    await fb.deleteDoc(fb.doc(fb.db, 'articles', id));
    this.api.clear();
  }

  /** `fields` = title, summary, body, category, readMins, status (+ author info on create) */
  async save(id: string | null, fields: Record<string, any>, newlyPublished: boolean) {
    const fb = await this.auth.firebase();
    const data: Record<string, any> = { ...fields, updatedAt: fb.serverTimestamp() };
    if (newlyPublished) data['publishedAt'] = fb.serverTimestamp();
    if (id) await fb.updateDoc(fb.doc(fb.db, 'articles', id), data);
    else await fb.addDoc(fb.collection(fb.db, 'articles'), { ...data, createdAt: fb.serverTimestamp() });
    this.api.clear();
  }
}
