import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import type { Profile } from './models';

type Fb = typeof import('./firebase');

@Injectable({ providedIn: 'root' })
export class AuthService {
  private platformId = inject(PLATFORM_ID);
  private fbPromise?: Promise<Fb>;
  private registering = false;

  user = signal<{ uid: string; email: string } | null>(null);
  role = signal<'admin' | 'contributor' | null>(null);
  profile = signal<Profile | null>(null);
  ready = signal(false);
  modal = signal<'login' | 'register' | null>(null);

  isAdmin = computed(() => this.role() === 'admin');
  isApproved = computed(() => this.role() === 'contributor' && this.profile()?.status === 'approved');
  canWrite = computed(() => this.isAdmin() || this.isApproved());
  displayName = computed(() => (this.isAdmin() ? 'Administrator' : this.profile()?.name || this.user()?.email || ''));
  subtitle = computed(() => (this.isAdmin() ? 'Admin' : this.profile()?.status === 'approved' ? 'Empanelled professional' : 'Verification pending'));

  /** Loads the Firebase SDK on first use. */
  firebase(): Promise<Fb> {
    return (this.fbPromise ??= import('./firebase'));
  }

  /** Call once from the browser after the page has hydrated. */
  async init() {
    if (!isPlatformBrowser(this.platformId)) return;
    const fb = await this.firebase();
    fb.onAuthStateChanged(fb.auth, async (u) => {
      if (this.registering) return;
      await this.load(u ? { uid: u.uid, email: u.email || '' } : null);
    });
  }

  private async load(u: { uid: string; email: string } | null) {
    this.user.set(u); this.role.set(null); this.profile.set(null);
    if (u) {
      const fb = await this.firebase();
      try {
        const r = await fb.getDoc(fb.doc(fb.db, 'roles', u.email.toLowerCase()));
        const d: any = r.exists() ? r.data() : null;
        if (d && String(d.role || '').toLowerCase() === 'admin' && d.active === true) this.role.set('admin');
      } catch { /* not allowed to read: treat as non-admin */ }
      if (!this.role()) {
        try {
          const c = await fb.getDoc(fb.doc(fb.db, 'contributors', u.uid));
          if (c.exists()) { this.profile.set(c.data() as Profile); this.role.set('contributor'); }
        } catch (e) { console.warn(e); }
      }
    }
    this.ready.set(true);
  }

  errorText(e: any): string {
    return ({
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/wrong-password': 'Email or password is incorrect.',
      'auth/user-not-found': 'No account found for this email. Please register first.',
      'auth/email-already-in-use': 'An account with this email already exists. Please log in instead.',
      'auth/weak-password': 'Password must be at least 6 characters.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
    } as Record<string, string>)[e?.code] || 'Something went wrong. Please try again.';
  }

  async login(email: string, pass: string) {
    const fb = await this.firebase();
    await fb.signInWithEmailAndPassword(fb.auth, email, pass);
  }

  async register(d: { name: string; email: string; profession: string; password: string }) {
    const fb = await this.firebase();
    this.registering = true;
    try {
      const cred = await fb.createUserWithEmailAndPassword(fb.auth, d.email, d.password);
      await fb.setDoc(fb.doc(fb.db, 'contributors', cred.user.uid), {
        name: d.name, email: d.email, profession: d.profession, status: 'pending', createdAt: fb.serverTimestamp(),
      });
      await this.load({ uid: cred.user.uid, email: d.email });
    } finally { this.registering = false; }
  }

  async reset(email: string) {
    const fb = await this.firebase();
    await fb.sendPasswordResetEmail(fb.auth, email);
  }

  async logout() {
    const fb = await this.firebase();
    await fb.signOut(fb.auth);
  }
}
