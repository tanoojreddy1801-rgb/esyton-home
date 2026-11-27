import { isPlatformBrowser } from '@angular/common';
import { Component, HostListener, PLATFORM_ID, afterNextRender, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthModal } from './shared/auth-modal';
import { AuthService } from './core/auth.service';
import { Toast } from './core/toast.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AuthModal],
  template: `
    <div class="topbar">
      <div class="shell topbar-row">
        <div><i class="ti ti-point-filled" style="color:var(--yellow)"></i> <strong>Esyton Insights</strong> &nbsp;·&nbsp; Articles by empanelled professionals</div>
        <div>connect&#64;esyton.com</div>
      </div>
    </div>

    <header class="site-header" [class.scrolled]="scrolled()">
      <div class="shell nav">
        <a href="/" class="brand" aria-label="Esyton home">
          <img src="https://raw.githubusercontent.com/tanoojreddy1801-rgb/esyton-home/main/logo.jpg" alt="Esyton Insights Logo" class="brand-logo" width="140" height="42">
        </a>
        <nav class="nav-links" aria-label="Main">
          <a href="/">Home</a>
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Insights</a>
          <a href="/#services">Services</a>
          <a href="/#query">Enquiry</a>
          <div class="nav-auth">
            @if (!auth.user()) {
              <button class="nav-btn" type="button" (click)="auth.modal.set('login')"><i class="ti ti-login-2"></i> Login</button>
              <button class="nav-btn solid" type="button" (click)="auth.modal.set('register')"><i class="ti ti-user-plus"></i> Register</button>
            } @else {
              <div class="user-chip"><strong>{{ auth.displayName() }}</strong><span>{{ auth.subtitle() }}</span></div>
              <a class="nav-btn solid" routerLink="/dashboard"><i class="ti ti-layout-dashboard"></i> Dashboard</a>
              <button class="nav-btn" type="button" (click)="logout()"><i class="ti ti-logout"></i> Logout</button>
            }
          </div>
        </nav>
      </div>
    </header>

    <main><router-outlet /></main>

    <footer class="site-footer">
      <div class="shell">
        <div class="footer-row">
          <a href="/" aria-label="Esyton home"><img src="https://raw.githubusercontent.com/tanoojreddy1801-rgb/esyton-home/main/logo.jpg" alt="Esyton Insights Logo" class="footer-logo" width="100" height="30"></a>
          <div style="display:flex; gap:16px; flex-wrap:wrap;">
            <a href="/">Home</a>
            <a routerLink="/">Insights</a>
            <a href="/#services">Services</a>
            <a href="/#query">Enquiry Desk</a>
            <a routerLink="/terms">Terms &amp; Conditions</a>
            <a routerLink="/disclaimer">Disclaimer</a>
          </div>
        </div>
        <p class="footer-notice">
          Content on Esyton Insights is published for general information only and is not legal, tax, accounting or investment advice. Views expressed are those of the respective authors. Please read our
          <a routerLink="/terms" style="text-decoration:underline">Terms and Conditions</a> and <a routerLink="/disclaimer" style="text-decoration:underline">Disclaimer</a>.
          Esyton Insights LLP provides business support, accounting organization, tax filing, and administrative services on non-assurance and non-attest tracks.
        </p>
      </div>
    </footer>

    @if (auth.modal()) { <app-auth-modal /> }
    @if (toast.msg()) { <div class="toast" role="status">{{ toast.msg() }}</div> }
  `,
})
export class App {
  protected auth = inject(AuthService);
  protected toast = inject(Toast);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected scrolled = signal(false);

  constructor() {
    afterNextRender(() => {
      this.auth.init();
      this.handleLegacyUrls();
    });
  }

  @HostListener('window:scroll')
  onScroll() { if (this.isBrowser) this.scrolled.set(window.scrollY > 30); }

  async logout() {
    await this.auth.logout();
    this.toast.show('Logged out.');
    this.router.navigateByUrl('/');
  }

  /** 1) Old links like /insights/#/a/<id>   2) paths bounced here by 404.html (articles newer than the last build) */
  private handleLegacyUrls() {
    const q = new URLSearchParams(location.search).get('__p');
    if (q) { this.router.navigateByUrl(q, { replaceUrl: true }); return; }
    if (location.hash.startsWith('#/') && location.hash.length > 2) {
      this.router.navigateByUrl(location.hash.slice(1), { replaceUrl: true });
    }
  }
}
