import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PROFESSIONS } from '../core/config';
import { AuthService } from '../core/auth.service';
import { Toast } from '../core/toast.service';

@Component({
  selector: 'app-auth-modal',
  imports: [FormsModule, RouterLink],
  template: `
    <div class="overlay" (mousedown)="backdrop($event)">
      <div class="modal" role="dialog" aria-modal="true">
        @if (auth.modal() === 'login') {
          <h3>Login</h3><p class="sub">For Esyton admins and empanelled professionals.</p>
          <div class="form-group"><label for="lEmail">Email</label><input type="email" id="lEmail" name="lEmail" [(ngModel)]="email" autocomplete="username"></div>
          <div class="form-group"><label for="lPass">Password</label><input type="password" id="lPass" name="lPass" [(ngModel)]="pass" autocomplete="current-password" (keydown.enter)="login()"></div>
          <button class="btn btn-navy" style="width:100%" [disabled]="busy()" (click)="login()">{{ busy() ? 'Signing in...' : 'Login' }}</button>
          <div class="msg" [class.err]="isErr()" [class.ok]="!isErr()">{{ msg() }}</div>
          <div class="switch"><button type="button" (click)="forgot()">Forgot password?</button> &nbsp;|&nbsp; New professional? <button type="button" (click)="switchTo('register')">Register</button></div>
        } @else {
          <h3>Register as a professional</h3>
          <p class="sub">Registration is free. We only need your name and email. Our team verifies every profile before you can publish.</p>
          <div class="form-grid">
            <div class="form-group form-full"><label for="rName">Name as it should appear on articles (e.g. CA Priya Rao)</label><input type="text" id="rName" name="rName" [(ngModel)]="name" autocomplete="name"></div>
            <div class="form-group"><label for="rEmail">Email</label><input type="email" id="rEmail" name="rEmail" [(ngModel)]="email" autocomplete="email"></div>
            <div class="form-group"><label for="rProf">Profession</label>
              <select id="rProf" name="rProf" [(ngModel)]="profession">@for (p of professions; track p) { <option [value]="p">{{ p }}</option> }</select></div>
            <div class="form-group form-full"><label for="rPass">Create password</label><input type="password" id="rPass" name="rPass" [(ngModel)]="pass" autocomplete="new-password"><div class="hint">At least 6 characters. We do not collect membership numbers or phone numbers here.</div></div>
          </div>
          <label class="check"><input type="checkbox" name="rAgree" [(ngModel)]="agree"><span>I have read and agree to the <a routerLink="/terms" target="_blank" rel="noopener">Terms and Conditions</a> and the <a routerLink="/disclaimer" target="_blank" rel="noopener">Disclaimer</a>. I confirm that the details above are true, that articles I submit are my own original work, and that Esyton may edit, decline or remove any article and may email me to request verification details.</span></label>
          <button class="btn btn-navy" style="width:100%" [disabled]="busy()" (click)="register()">{{ busy() ? 'Submitting...' : 'Submit for verification' }}</button>
          <div class="msg err">{{ msg() }}</div>
          <div class="switch">Already registered? <button type="button" (click)="switchTo('login')">Login</button></div>
        }
        <button class="modal-close" aria-label="Close" (click)="close()">&times;</button>
      </div>
    </div>
  `,
})
export class AuthModal {
  protected auth = inject(AuthService);
  private toast = inject(Toast);
  private router = inject(Router);
  protected professions = PROFESSIONS;

  email = ''; pass = ''; name = ''; profession = PROFESSIONS[0]; agree = false;
  busy = signal(false); msg = signal(''); isErr = signal(true);

  @HostListener('document:keydown.escape') close() { this.auth.modal.set(null); }
  backdrop(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('overlay')) this.close(); }
  switchTo(m: 'login' | 'register') { this.msg.set(''); this.pass = ''; this.auth.modal.set(m); }

  async login() {
    this.isErr.set(true); this.msg.set('');
    if (!this.email.trim() || !this.pass) { this.msg.set('Enter your email and password.'); return; }
    this.busy.set(true);
    try {
      await this.auth.login(this.email.trim(), this.pass);
      this.close(); this.toast.show('Logged in.'); this.router.navigateByUrl('/dashboard');
    } catch (e) { this.msg.set(this.auth.errorText(e)); } finally { this.busy.set(false); }
  }

  async forgot() {
    this.isErr.set(true);
    if (!this.email.trim()) { this.msg.set('Enter your email above first.'); return; }
    try { await this.auth.reset(this.email.trim()); this.isErr.set(false); this.msg.set('Password reset link sent. Check your inbox.'); }
    catch (e) { this.msg.set(this.auth.errorText(e)); }
  }

  async register() {
    this.msg.set('');
    const name = this.name.trim(), email = this.email.trim().toLowerCase();
    if (!name || !email) { this.msg.set('Please enter your name and email.'); return; }
    if (!this.agree) { this.msg.set('Please tick the confirmation to continue.'); return; }
    this.busy.set(true);
    try {
      await this.auth.register({ name, email, profession: this.profession, password: this.pass });
      this.close(); this.toast.show('Registered. Awaiting admin verification.'); this.router.navigateByUrl('/dashboard');
    } catch (e) { this.msg.set(this.auth.errorText(e)); } finally { this.busy.set(false); }
  }
}
