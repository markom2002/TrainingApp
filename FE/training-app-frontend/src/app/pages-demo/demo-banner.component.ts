import { Component } from '@angular/core';
import { DemoStore } from './demo-store';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-pages-demo-banner', standalone: true,
  template: `<aside aria-label="Portfolio demo">
    <div><strong>INTERACTIVE DEMO</strong><span>Sample data. Changes stay in this browser. No live server.</span></div>
    <nav aria-label="Demo controls">
      <a href="https://github.com/markom2002/TrainingApp" target="_blank" rel="noopener noreferrer">View source &#8599;</a>
      <button type="button" (click)="reset()">Reset demo</button>
    </nav>
    @if (error) { <p role="alert">{{ error }}</p> }
  </aside>`,
  styles: [`
    :host{display:block}aside{padding:12px 24px;background:#14200f;border-bottom:1px solid #caff4833;color:#dfeaca;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;line-height:1.5}
    aside>div{display:flex;gap:12px;align-items:center;flex-wrap:wrap}strong{font-size:10px;letter-spacing:1.5px;color:#caff48}span{color:#b3c3a6}
    nav{display:flex;gap:16px;align-items:center}a,button{font:inherit;color:#e3efcf}button{background:transparent;border:1px solid #b4c49955;border-radius:5px;padding:6px 10px;cursor:pointer}
    a:focus-visible,button:focus-visible{outline:2px solid #caff48;outline-offset:3px}p{width:100%;margin:0;color:#ffbea9}
    @media(max-width:600px){aside{padding:12px 16px}aside>div{gap:4px}span{width:100%}nav{width:100%;justify-content:space-between}}
  `],
})
export class PagesDemoBannerComponent {
  error = '';
  constructor(private store: DemoStore, private auth: AuthService) {}
  reset() {
    if (!window.confirm('Restore sample data and remove the changes you made in this demo?')) return;
    try { this.store.reset(); this.auth.clearSession(); window.location.reload(); }
    catch { this.error = 'Browser storage is unavailable. The demo could not be reset.'; }
  }
}
