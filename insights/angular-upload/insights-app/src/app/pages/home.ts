import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CATEGORIES } from '../core/config';
import { PublicApi } from '../core/public-api.service';
import { Seo } from '../core/seo.service';
import { articleSlug, fmtDate, initials } from '../core/util';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  template: `
    <section class="hero">
      <div class="shell">
        <h1>Insights from professionals who do this work every day</h1>
        <p>Income tax, GST, IPOs, merchant banking and accounting, explained by practising professionals empanelled with Esyton. Free to read, no sign-up needed.</p>
        <div class="hero-actions">
          @if (auth.user()) {
            <a class="btn btn-gold" [routerLink]="auth.canWrite() ? '/write' : '/dashboard'"><i class="ti ti-pencil"></i> {{ auth.canWrite() ? 'Write an article' : 'Go to dashboard' }}</a>
          } @else {
            <button class="btn btn-gold" type="button" (click)="auth.modal.set('register')"><i class="ti ti-user-plus"></i> Register as a professional</button>
          }
        </div>
      </div>
    </section>

    <section class="section">
      <div class="shell">
        <div class="toolbar">
          <div class="chips">
            @for (c of cats; track c) {
              <button class="chip" type="button" [class.active]="c === cat()" (click)="cat.set(c)">{{ c }}</button>
            }
          </div>
          <div class="search"><i class="ti ti-search"></i>
            <input type="text" placeholder="Search articles" aria-label="Search articles" [value]="q()" (input)="q.set($any($event.target).value)">
          </div>
        </div>

        @if (all() === undefined) {
          <div class="state"><i class="ti ti-loader-2"></i>Loading articles...</div>
        } @else if (all() === null) {
          <div class="state"><i class="ti ti-alert-triangle"></i><h3>Could not load articles</h3>Please refresh the page in a moment.</div>
        } @else if (!filtered().length) {
          <div class="state"><i class="ti ti-news"></i>
            <h3>{{ all()!.length ? 'No articles match your search' : 'No articles published yet' }}</h3>
            {{ all()!.length ? 'Try a different category or keyword.' : 'Empanelled professionals are preparing the first articles. Please check back soon.' }}
          </div>
        } @else {
          <div class="grid">
            @for (a of filtered(); track a.id) {
              <a class="card" [routerLink]="['/a', slug(a)]">
                <span class="tag">{{ a.category }}</span>
                <h3>{{ a.title }}</h3>
                <p>{{ a.summary }}</p>
                <div class="byline"><span class="avatar">{{ initials(a.authorName) }}</span>
                  <span><strong>{{ a.authorName }}</strong>{{ date(a.publishedAt) }} &middot; {{ a.readMins }} min read</span></div>
              </a>
            }
          </div>
        }
      </div>
    </section>
  `,
})
export class HomePage {
  protected auth = inject(AuthService);
  private api = inject(PublicApi);
  protected cats = ['All', ...CATEGORIES];
  protected cat = signal('All');
  protected q = signal('');
  protected all = toSignal(this.api.published(), { initialValue: undefined });
  protected filtered = computed(() => {
    const list = this.all() ?? [];
    const q = this.q().trim().toLowerCase();
    return list.filter((a) => (this.cat() === 'All' || a.category === this.cat()) &&
      (!q || [a.title, a.summary, a.authorName, a.category].join(' ').toLowerCase().includes(q)));
  });
  protected slug = articleSlug;
  protected initials = initials;
  protected date = fmtDate;

  constructor() {
    inject(Seo).set({
      title: 'Esyton Insights | Articles on Income Tax, GST, IPO, Merchant Banking & Accounting',
      description: 'Practical articles on income tax, GST, IPOs, merchant banking, accounting and company law, written by professionals empanelled with Esyton Insights.',
      path: '',
    });
  }
}
