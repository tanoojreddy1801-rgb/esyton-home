import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { LEGAL } from '../core/legal.data';
import { Seo } from '../core/seo.service';

@Component({
  selector: 'app-legal',
  imports: [RouterLink],
  template: `
    <div class="shell">
      <article class="article-wrap legal">
        <a class="back-link" routerLink="/"><i class="ti ti-arrow-left"></i> All articles</a>
        <h1>{{ d.title }}</h1>
        @for (m of d.meta; track m) { <p class="legal-meta">{{ m }}</p> }
        <div class="legal-switch">
          <a class="btn btn-sm" [class.btn-navy]="kind === 'terms'" [class.btn-ghost]="kind !== 'terms'" routerLink="/terms">Terms and Conditions</a>
          <a class="btn btn-sm" [class.btn-navy]="kind === 'disclaimer'" [class.btn-ghost]="kind !== 'disclaimer'" routerLink="/disclaimer">Disclaimer</a>
        </div>
        <div class="prose" [innerHTML]="d.body"></div>
      </article>
    </div>
  `,
})
export class LegalPage {
  protected kind: string = inject(ActivatedRoute).snapshot.data['kind'];
  protected d = LEGAL[this.kind];
  constructor() {
    inject(Seo).set({
      title: this.d.title,
      description: this.kind === 'terms'
        ? 'Terms and Conditions for using the Esyton Insights portal, including rules for professional contributors.'
        : 'Disclaimer for Esyton Insights: articles are general information only and not professional advice.',
      path: this.kind,
    });
  }
}
