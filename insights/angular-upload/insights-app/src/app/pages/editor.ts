import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AdminData } from '../core/admin-data.service';
import { AuthService } from '../core/auth.service';
import { CATEGORIES, EDITORIAL_NAME } from '../core/config';
import type { Article } from '../core/models';
import { Seo } from '../core/seo.service';
import { Toast } from '../core/toast.service';
import { sanitize, wordCount } from '../core/util';

@Component({
  selector: 'app-editor',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="dash"><div class="shell">
      @if (!auth.ready()) {
        <div class="state"><i class="ti ti-loader-2"></i>Loading...</div>
      } @else if (!auth.canWrite()) {
        <div class="note"><h3>Writing is for empanelled professionals</h3>
          <p>{{ auth.user() ? 'Your profile must be approved by the admin before you can write.' : 'Please log in with your approved professional account.' }}</p>
          @if (!auth.user()) { <div class="form-actions"><button class="btn btn-navy" (click)="auth.modal.set('login')">Login</button></div> }</div>
      } @else if (denied()) {
        <div class="note"><h3>Not allowed</h3><p>You can only edit your own articles.</p></div>
      } @else {
        <div class="panel">
          <h2 style="margin-bottom:4px">{{ id ? 'Edit article' : 'Write an article' }}</h2>
          <p class="row-sub" style="margin-bottom:22px">{{ auth.isAdmin() ? 'As admin you can publish directly or save a draft.' : 'Your article will be reviewed by the Esyton team before it goes live.' }}</p>
          <div class="form-grid">
            <div class="form-group form-full"><label for="eTitle">Title</label>
              <input type="text" id="eTitle" name="eTitle" maxlength="140" [ngModel]="title()" (ngModelChange)="title.set($event)">
              <div class="hint">Use the words people would search for, ideally under 60 characters.</div></div>
            <div class="form-group"><label for="eCat">Category</label>
              <select id="eCat" name="eCat" [ngModel]="category()" (ngModelChange)="category.set($event)">@for (c of cats; track c) { <option [value]="c">{{ c }}</option> }</select></div>
            <div class="form-group form-full"><label for="eSum">Short summary (shown on the article card and in Google results)</label>
              <textarea id="eSum" name="eSum" maxlength="260" style="min-height:70px" [ngModel]="summary()" (ngModelChange)="summary.set($event)"></textarea>
              <div class="hint">One or two sentences, up to 260 characters.</div></div>
            <div class="form-group form-full"><label>Article</label>
              <div class="editor-bar" (mousedown)="$event.preventDefault()">
                <button type="button" title="Bold" aria-label="Bold" (click)="cmd('bold')"><b>B</b></button>
                <button type="button" title="Italic" aria-label="Italic" (click)="cmd('italic')"><i>I</i></button>
                <button type="button" title="Heading" aria-label="Heading" (click)="cmd('h2')">H2</button>
                <button type="button" title="Sub-heading" aria-label="Sub-heading" (click)="cmd('h3')">H3</button>
                <button type="button" title="Bullet list" aria-label="Bullet list" (click)="cmd('insertUnorderedList')"><i class="ti ti-list"></i></button>
                <button type="button" title="Numbered list" aria-label="Numbered list" (click)="cmd('insertOrderedList')"><i class="ti ti-list-numbers"></i></button>
                <button type="button" title="Quote" aria-label="Quote" (click)="cmd('blockquote')"><i class="ti ti-quote"></i></button>
                <button type="button" title="Add link" aria-label="Add link" (click)="cmd('link')"><i class="ti ti-link"></i></button>
                <button type="button" title="Clear formatting" aria-label="Clear formatting" (click)="cmd('clear')"><i class="ti ti-clear-formatting"></i></button>
              </div>
              <div #ed id="editorBody" class="prose" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Article body" (paste)="paste($event)"></div>
            </div>
          </div>
          <div class="form-actions">
            @if (auth.isAdmin()) {
              <button class="btn btn-navy" [disabled]="busy()" (click)="save('published')">Publish now</button>
              <button class="btn btn-ghost" [disabled]="busy()" (click)="save('draft')">Save as draft</button>
            } @else {
              <button class="btn btn-navy" [disabled]="busy()" (click)="save('pending')">Submit for review</button>
            }
            <a class="btn btn-ghost" routerLink="/dashboard">Cancel</a>
          </div>
          <div class="msg err">{{ msg() }}</div>
        </div>
      }
    </div></div>
  `,
})
export class EditorPage {
  protected auth = inject(AuthService);
  private data = inject(AdminData);
  private router = inject(Router);
  private toast = inject(Toast);
  private doc = inject(DOCUMENT);
  protected id: string | null = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected cats = CATEGORIES;

  protected title = signal('');
  protected summary = signal('');
  protected category = signal(CATEGORIES[0]);
  protected msg = signal('');
  protected busy = signal(false);
  protected denied = signal(false);
  private existing = signal<Article | null>(null);
  private ed = viewChild<ElementRef<HTMLDivElement>>('ed');
  private pendingBody = signal<string | null>(null);
  private started = false;
  private canEdit = computed(() => this.auth.ready() && this.auth.canWrite());

  constructor() {
    inject(Seo).set({ title: 'Write an article', description: 'Esyton Insights editor.', path: 'write', noindex: true });

    // load the article being edited (once login state is known)
    effect(() => {
      if (this.canEdit() && !this.started) {
        this.started = true;
        untracked(() => this.loadExisting());
      }
    });
    // put the saved text into the editor once both the editor and the text are ready
    effect(() => {
      const el = this.ed(), body = this.pendingBody();
      if (el && body !== null) { el.nativeElement.innerHTML = body; untracked(() => this.pendingBody.set(null)); }
    });
  }

  private async loadExisting() {
    if (!this.id) return;
    const a = await this.data.article(this.id);
    if (!a) return;
    if (!this.auth.isAdmin() && a.authorUid !== this.auth.user()?.uid) { this.denied.set(true); return; }
    this.existing.set(a);
    this.title.set(a.title); this.summary.set(a.summary); this.category.set(a.category);
    this.pendingBody.set(sanitize(a.body || ''));
  }

  cmd(c: string) {
    const el = this.ed()?.nativeElement; if (!el) return;
    el.focus();
    if (c === 'h2' || c === 'h3' || c === 'blockquote') this.doc.execCommand('formatBlock', false, c.toUpperCase());
    else if (c === 'link') { const u = prompt('Link address (https://...)'); if (u) this.doc.execCommand('createLink', false, u); }
    else if (c === 'clear') { this.doc.execCommand('removeFormat'); this.doc.execCommand('formatBlock', false, 'P'); }
    else this.doc.execCommand(c);
  }

  paste(e: ClipboardEvent) {
    e.preventDefault();
    const html = e.clipboardData?.getData('text/html') ?? '', txt = e.clipboardData?.getData('text/plain') ?? '';
    const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
    this.doc.execCommand('insertHTML', false, html ? sanitize(html) : esc(txt).replace(/\n/g, '<br>'));
  }

  async save(status: 'published' | 'draft' | 'pending') {
    this.msg.set('');
    const title = this.title().trim(), summary = this.summary().trim();
    const body = sanitize(this.ed()?.nativeElement.innerHTML ?? '');
    if (title.length < 8) { this.msg.set('Please enter a title (at least 8 characters).'); return; }
    if (summary.length < 20) { this.msg.set('Please add a short summary (at least 20 characters).'); return; }
    if (wordCount(body) < 150) { this.msg.set('The article looks too short. Please write at least 150 words.'); return; }

    const fields: Record<string, any> = { title, summary, body, category: this.category(), readMins: Math.max(1, Math.round(wordCount(body) / 200)), status };
    if (!this.auth.isAdmin()) fields['reviewNote'] = '';
    const wasPublished = this.existing()?.status === 'published';
    if (!this.id) {
      const p = this.auth.profile();
      fields['authorUid'] = this.auth.user()!.uid;
      fields['authorName'] = this.auth.isAdmin() ? EDITORIAL_NAME : p!.name;
      fields['authorDesignation'] = this.auth.isAdmin() ? 'Esyton Insights LLP' : (p!.profession || '');
    }
    this.busy.set(true);
    try {
      await this.data.save(this.id, fields, this.auth.isAdmin() && status === 'published' && !wasPublished);
      this.toast.show(status === 'published' ? 'Published. The public page is created within about 30 minutes.' : status === 'pending' ? 'Submitted for review.' : 'Draft saved.');
      this.router.navigateByUrl('/dashboard');
    } catch (e) { console.error(e); this.msg.set('Could not save. Please check your connection and permissions.'); this.busy.set(false); }
  }
}
