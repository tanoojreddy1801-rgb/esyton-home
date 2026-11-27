import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AdminData } from '../core/admin-data.service';
import { AuthService } from '../core/auth.service';
import type { Article, Profile } from '../core/models';
import { Seo } from '../core/seo.service';
import { Toast } from '../core/toast.service';
import { fmtDate } from '../core/util';

type Pro = Profile & { id: string };

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink],
  template: `
    <div class="dash"><div class="shell">
      @if (!auth.ready()) {
        <div class="state"><i class="ti ti-loader-2"></i>Loading...</div>
      } @else if (!auth.user()) {
        <div class="note"><h3>Please log in</h3><p>Log in to manage articles, or register if you are a professional who wants to contribute.</p>
          <div class="form-actions"><button class="btn btn-navy" (click)="auth.modal.set('login')">Login</button><button class="btn btn-ghost" (click)="auth.modal.set('register')">Register</button></div></div>
      } @else if (auth.isAdmin()) {
        <div class="dash-head"><div><h2>Admin dashboard</h2><p>Verify professionals and review articles.</p></div>
          <a class="btn btn-navy" routerLink="/write"><i class="ti ti-pencil"></i> Write an article</a></div>
        <div class="tabs" role="tablist">
          <button class="tab" [class.active]="tab() === 'pros'" (click)="tab.set('pros')">Professionals @if (pendPros()) {<span class="count">{{ pendPros() }}</span>}</button>
          <button class="tab" [class.active]="tab() === 'review'" (click)="tab.set('review')">Articles to review @if (pendArts()) {<span class="count">{{ pendArts() }}</span>}</button>
          <button class="tab" [class.active]="tab() === 'all'" (click)="tab.set('all')">All articles</button>
        </div>
        @if (loading()) { <div class="state"><i class="ti ti-loader-2"></i>Loading...</div> }
        @else if (error()) { <div class="state"><i class="ti ti-alert-triangle"></i><h3>Could not load data</h3>{{ error() }}</div> }
        @else if (tab() === 'pros') {
          @for (p of pros(); track p.id) {
            <div class="row"><div class="row-main"><h4>{{ p.name }} <span class="badge" [class]="'badge b-' + p.status">{{ p.status }}</span></h4>
              <div class="row-sub">{{ p.profession }} &middot; {{ p.email }}<br>Verify by email if needed, then approve.</div></div>
              <div class="row-actions">
                @if (p.status !== 'approved') { <button class="btn btn-navy btn-sm" [disabled]="busy()" (click)="pro(p.id, 'approved')">Approve</button> }
                @if (p.status !== 'rejected') { <button class="btn btn-danger btn-sm" [disabled]="busy()" (click)="pro(p.id, 'rejected')">Reject</button> }
              </div></div>
          } @empty { <div class="state"><i class="ti ti-users"></i><h3>No professionals registered yet</h3></div> }
        } @else {
          @for (a of list(); track a.id) {
            <div class="row"><div class="row-main"><h4>{{ a.title }} <span class="badge" [class]="'badge b-' + a.status">{{ a.status }}</span></h4>
              <div class="row-sub">{{ a.category }} &middot; by {{ a.authorName }} &middot; {{ date(a.createdAt) }}</div></div>
              <div class="row-actions">
                <a class="btn btn-ghost btn-sm" [routerLink]="['/a', a.id]">Read</a>
                <a class="btn btn-ghost btn-sm" [routerLink]="['/write', a.id]">Edit</a>
                @if (a.status !== 'published') { <button class="btn btn-navy btn-sm" [disabled]="busy()" (click)="art('publish', a)">Publish</button> }
                @else { <button class="btn btn-ghost btn-sm" [disabled]="busy()" (click)="art('unpublish', a)">Unpublish</button> }
                @if (a.status === 'pending') { <button class="btn btn-danger btn-sm" [disabled]="busy()" (click)="art('decline', a)">Decline</button> }
                <button class="btn btn-danger btn-sm" [disabled]="busy()" aria-label="Delete article" (click)="art('delete', a)"><i class="ti ti-trash"></i></button>
              </div></div>
          } @empty { <div class="state"><i class="ti ti-circle-check"></i><h3>{{ tab() === 'review' ? 'Nothing waiting for review' : 'No articles yet' }}</h3></div> }
        }
      } @else if (auth.role() === 'contributor') {
        @if (auth.profile()?.status === 'pending') {
          <div class="note"><h3>Verification in progress</h3><p>Thanks, {{ auth.profile()?.name }}. Our team is verifying your profile and may email you for supporting details. You will be able to submit articles as soon as your profile is approved. Please check back here in a day or two.</p></div>
        } @else if (auth.profile()?.status === 'rejected') {
          <div class="note"><h3>Registration not approved</h3><p>We could not verify this profile.@if (auth.profile()?.reviewNote) { Reason: {{ auth.profile()?.reviewNote }}} Write to connect&#64;esyton.com if you think this is a mistake.</p></div>
        } @else {
          <div class="dash-head"><div><h2>My articles</h2><p>Submitted articles go live after admin review.</p></div>
            <a class="btn btn-navy" routerLink="/write"><i class="ti ti-pencil"></i> Write an article</a></div>
          @if (loading()) { <div class="state"><i class="ti ti-loader-2"></i>Loading...</div> }
          @else {
            @for (a of mine(); track a.id) {
              <div class="row"><div class="row-main"><h4>{{ a.title }} <span class="badge" [class]="'badge b-' + a.status">{{ a.status }}</span></h4>
                <div class="row-sub">{{ a.category }} &middot; {{ date(a.createdAt) }}@if (a.reviewNote) {<br><strong>Reviewer note:</strong> {{ a.reviewNote }}}</div></div>
                <div class="row-actions"><a class="btn btn-ghost btn-sm" [routerLink]="['/a', a.id]">View</a>
                  @if (a.status !== 'published') { <a class="btn btn-navy btn-sm" [routerLink]="['/write', a.id]">Edit</a> }</div></div>
            } @empty { <div class="state"><i class="ti ti-pencil"></i><h3>You have not written anything yet</h3>Click "Write an article" to submit your first one.</div> }
          }
        }
      } @else {
        <div class="note"><h3>No profile found</h3><p>This login is not linked to an Insights profile. Please register as a professional using a new email.</p></div>
      }
    </div></div>
  `,
})
export class DashboardPage {
  protected auth = inject(AuthService);
  private data = inject(AdminData);
  private toast = inject(Toast);
  protected date = fmtDate;

  protected tab = signal<'pros' | 'review' | 'all'>('pros');
  protected pros = signal<Pro[]>([]);
  protected arts = signal<Article[]>([]);
  protected mine = signal<Article[]>([]);
  protected loading = signal(true);
  protected busy = signal(false);
  protected error = signal('');

  protected pendPros = computed(() => this.pros().filter((p) => p.status === 'pending').length);
  protected pendArts = computed(() => this.arts().filter((a) => a.status === 'pending').length);
  protected list = computed(() => (this.tab() === 'review' ? this.arts().filter((a) => a.status === 'pending') : this.arts()));

  constructor() {
    inject(Seo).set({ title: 'Dashboard', description: 'Esyton Insights dashboard.', path: 'dashboard', noindex: true });
    effect(() => {
      if (this.auth.ready() && this.auth.user()) { this.auth.role(); this.auth.profile(); untracked(() => this.load()); }
    });
  }

  private async load() {
    this.loading.set(true); this.error.set('');
    try {
      if (this.auth.isAdmin()) {
        const [p, a] = await Promise.all([this.data.allProfessionals(), this.data.allArticles()]);
        this.pros.set(p); this.arts.set(a);
      } else if (this.auth.isApproved()) {
        this.mine.set(await this.data.myArticles(this.auth.user()!.uid));
      }
    } catch (e) { console.error(e); this.error.set('Make sure the Firestore rules for Insights have been published.'); }
    this.loading.set(false);
  }

  async pro(id: string, status: 'approved' | 'rejected') {
    let note = '';
    if (status === 'rejected') { const n = prompt('Reason for rejection (shown to the applicant):'); if (n === null) return; note = n.trim(); }
    await this.run(() => this.data.setProfessional(id, status, note));
  }

  async art(kind: 'publish' | 'unpublish' | 'decline' | 'delete', a: Article) {
    if (kind === 'decline') {
      const n = prompt('Feedback for the author (they will see this):'); if (n === null) return;
      await this.run(() => this.data.decline(a.id, n.trim()));
    } else if (kind === 'delete') {
      if (!confirm('Delete this article permanently?')) return;
      await this.run(() => this.data.remove(a.id));
    } else if (kind === 'publish') await this.run(() => this.data.publish(a.id));
    else await this.run(() => this.data.unpublish(a.id));
  }

  private async run(fn: () => Promise<void>) {
    this.busy.set(true);
    try { await fn(); await this.load(); this.toast.show('Done. Public pages update within about 30 minutes.'); }
    catch (e) { console.error(e); this.toast.show('Action failed. Check your permissions.'); }
    this.busy.set(false);
  }
}
