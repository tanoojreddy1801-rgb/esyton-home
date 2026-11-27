import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Seo } from '../core/seo.service';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="shell"><div class="article-wrap">
      <div class="state"><i class="ti ti-file-off"></i><h3>Page not found</h3>
        <p style="margin-bottom:16px">The page you are looking for does not exist or has moved.</p>
        <a class="btn btn-navy" routerLink="/">Go to all articles</a></div>
    </div></div>
  `,
})
export class NotFoundPage {
  constructor() { inject(Seo).set({ title: 'Page not found', description: 'Page not found.', path: '', noindex: true }); }
}
