import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { LOGO, SITE } from './config';
import type { Article } from './models';

@Injectable({ providedIn: 'root' })
export class Seo {
  private title = inject(Title);
  private meta = inject(Meta);
  private doc = inject(DOCUMENT);

  /** path like '' (home), 'terms' or 'a/some-slug' (no leading or trailing slash) */
  set(o: { title: string; description: string; path: string; article?: Article; noindex?: boolean }) {
    const url = `${SITE}/insights/${o.path ? o.path + '/' : ''}`;
    const full = o.title.includes('Esyton') ? o.title : `${o.title} | Esyton Insights`;
    this.title.setTitle(full);
    const tag = (attr: 'name' | 'property', key: string, content: string | null) => {
      if (content == null) { this.meta.removeTag(`${attr}='${key}'`); return; }
      this.meta.updateTag({ [attr]: key, content } as any, `${attr}='${key}'`);
    };
    tag('name', 'description', o.description);
    tag('name', 'robots', o.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    tag('property', 'og:type', o.article ? 'article' : 'website');
    tag('property', 'og:site_name', 'Esyton Insights');
    tag('property', 'og:title', full);
    tag('property', 'og:description', o.description);
    tag('property', 'og:url', url);
    tag('property', 'og:image', LOGO);
    tag('name', 'twitter:card', 'summary');
    tag('property', 'article:published_time', o.article?.publishedAt ?? null);
    tag('property', 'article:modified_time', o.article?.updatedAt ?? null);
    tag('property', 'article:section', o.article?.category ?? null);
    tag('name', 'author', o.article?.authorName ?? null);

    let link = this.doc.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = this.doc.createElement('link'); link.rel = 'canonical'; this.doc.head.appendChild(link); }
    link.href = url;

    this.doc.getElementById('ld-json')?.remove();
    if (o.article) {
      const a = o.article;
      const words = a.body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
      const ld = {
        '@context': 'https://schema.org', '@type': 'Article',
        headline: a.title, description: a.summary, articleSection: a.category, wordCount: words, inLanguage: 'en-IN',
        datePublished: a.publishedAt, dateModified: a.updatedAt, mainEntityOfPage: url,
        author: { '@type': 'Person', name: a.authorName, ...(a.authorDesignation ? { jobTitle: a.authorDesignation } : {}) },
        publisher: { '@type': 'Organization', name: 'Esyton Insights LLP', url: SITE, logo: { '@type': 'ImageObject', url: LOGO } },
      };
      const s = this.doc.createElement('script');
      s.id = 'ld-json'; s.type = 'application/ld+json';
      s.text = JSON.stringify(ld).replace(/</g, '\\u003c');
      this.doc.head.appendChild(s);
    }
  }
}
