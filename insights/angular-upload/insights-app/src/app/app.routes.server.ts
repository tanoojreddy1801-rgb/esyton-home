import { RenderMode, ServerRoute } from '@angular/ssr';
import { articleSlug } from './core/util';
import { fetchPublishedForBuild } from './core/rest';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'terms', renderMode: RenderMode.Prerender },
  { path: 'disclaimer', renderMode: RenderMode.Prerender },
  {
    // One real HTML page per published article, created at build time
    path: 'a/:slug',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      const list = await fetchPublishedForBuild();
      return list.map((a) => ({ slug: articleSlug(a) }));
    },
  },
  // Private / logged-in screens are never prerendered
  { path: 'dashboard', renderMode: RenderMode.Client },
  { path: 'write', renderMode: RenderMode.Client },
  { path: 'write/:id', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Client },
];
