import { isPlatformBrowser } from '@angular/common';
import { Component, PLATFORM_ID, computed, effect, inject, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map, switchMap, tap } from 'rxjs';
import { AdminData } from '../core/admin-data.service';
import { AuthService } from '../core/auth.service';
import type { Article } from '../core/models';
import { PublicApi } from '../core/public-api.service';
import { Seo } from '../core/seo.service';
import { articleSlug, fmtDate, idFromSlug, initials } from '../core/util';

@Component({
  selector: 'app-article',
  imports: [RouterLink],
  template: `
    <div class="shell">
      <article class="article-wrap">
        <a class="back-link" routerLink="/"><i class="ti ti-arrow-left"></i> All articles</a>
        @if (a(); as art) {
          @if (art.status !== 'published') {
            <div class="disclaimer" style="margin:0 0 24px"><strong>Preview.</strong> This article is "{{ art.status }}" and only visible to you and the admin.</div>
          }
          <span class="tag">{{ art.category }}</span>
          <h1>{{ art.title }}</h1>
          <div class="article-meta">
            <span class="avatar">{{ initials(art.authorName) }}</span>
            <span><strong style="color:var(--navy)">{{ art.authorName }}</strong>@if (art.authorDesignation) {<br>{{ art.authorDesignation }}}</span>
            <span><time [attr.datetime]="art.publishedAt || art.createdAt">{{ date(art.publishedAt || art.createdAt) }}</time></span>
            <span>{{ art.readMins }} min read</span>
          </div>
          <div class="prose" [innerHTML]="art.body"></div>
          <p class="disclaimer">
            This article reflects the personal views of its author and is published for general information only. It is not legal, tax, accounting, financial or investment advice, and reading it does not create a professional engagement. Laws and rates change; please consult a qualified professional before acting.
            See our <a routerLink="/disclaimer" style="text-decoration:underline">Disclaimer</a> and <a routerLink="/terms" style="text-decoration:underline">Terms and Conditions</a>.
            Need help? <a href="/#query" style="text-decoration:underline">Contact Esyton</a>.
          </p>
          @if (related().length) {
            <h2 style="margin:40px 0 16px;font-size:1.3rem">More from Esyton Insights</h2>
            <div class="grid" style="grid-template-columns:1fr">
              @for (r of related(); track r.id) {
                <a class="card" [routerLink]="['/a', slug(r)]"><span class="tag">{{ r.category }}</span><h3>{{ r.title }}</h3><p>{{ r.summary }}</p></a>
              }
            </div>
          }
        } @else if (a() === undefined) {
          <div class="state"><i class="ti ti-loader-2"></i>Loading article...</div>
        } @else {
          <div class="state"><i class="ti ti-file-off"></i><h3>Article not found</h3>It may have been removed or is not published yet.</div>
        }
      </article>
    </div>
  `,
})
export class ArticlePage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(PublicApi);
  private admin = inject(AdminData);
  private auth = inject(AuthService);
  private seo = inject(Seo);
  private browser = isPlatformBrowser(inject(PLATFORM_ID));

  protected slug = articleSlug;
  protected initials = initials;
  protected date = fmtDate;

  /** undefined = loading, null = not found */
  private pub = toSignal(
    this.route.paramMap.pipe(
      map((p) => p.get('slug') ?? ''),
      switchMap((s) => this.api.one(idFromSlug(s)).pipe(tap((a) => this.afterLoad(s, a)))),
    ),
    { initialValue: undefined },
  );
  private preview = signal<Article | null>(null);
  protected a = computed(() => this.pub() ?? this.preview() ?? (this.pub() === null ? null : undefined));

  private all = toSignal(this.api.published(), { initialValue: undefined });
  protected related = computed(() => {
    const art = this.a(), list = this.all();
    return art && list ? list.filter((r) => r.id !== art.id && r.category === art.category).slice(0, 3) : [];
  });

  constructor() {
    // Logged-in author/admin opening an unpublished article of theirs (not public, so read it with their login)
    effect(() => {
      if (this.pub() === null && this.auth.user()) {
        const id = idFromSlug(this.route.snapshot.paramMap.get('slug') ?? '');
        untracked(() => this.admin.article(id).then((a) => {
          if (a) { this.preview.set(a); this.seo.set({ title: a.title, description: a.summary, path: 'a/' + articleSlug(a), noindex: true }); }
        }));
      }
    });
  }

  private afterLoad(slug: string, a: Article | null) {
    if (!a) { this.seo.set({ title: 'Article not found', description: 'This article could not be found.', path: 'a/' + slug, noindex: true }); return; }
    const correct = articleSlug(a);
    this.seo.set({ title: a.title, description: a.summary, path: 'a/' + correct, article: a });
    // Old/short link (e.g. only the id, or a title that has since changed): move to the proper address
    if (this.browser && slug !== correct) this.router.navigate(['/a', correct], { replaceUrl: true });
  }
}
