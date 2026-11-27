import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';
import type { Article } from './models';
import { QUERY_BODY, QUERY_URL, docUrl, parseDoc, parseQuery } from './rest';

@Injectable({ providedIn: 'root' })
export class PublicApi {
  private http = inject(HttpClient);
  private cache: Article[] | null = null;

  /** Forget what was loaded (called after the admin publishes / edits something) */
  clear() { this.cache = null; }

  /** All published articles, newest first. `null` = could not load. */
  published(): Observable<Article[] | null> {
    if (this.cache) return of(this.cache);
    return this.http.post<any[]>(QUERY_URL, QUERY_BODY).pipe(
      map(parseQuery), tap((l) => (this.cache = l)), catchError(() => of(null)));
  }

  /** One published article, or null (not found / not public). Uses the already-loaded list when possible. */
  one(id: string): Observable<Article | null> {
    const hit = this.cache?.find((a) => a.id === id);
    if (hit) return of(hit);
    return this.http.get<any>(docUrl(id)).pipe(
      map((d) => { const a = parseDoc(d); return a.status === 'published' ? a : null; }),
      catchError(() => of(null)),
    );
  }
}
