import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class Toast {
  msg = signal('');
  private t: any;
  show(m: string) { this.msg.set(m); clearTimeout(this.t); this.t = setTimeout(() => this.msg.set(''), 3200); }
}
