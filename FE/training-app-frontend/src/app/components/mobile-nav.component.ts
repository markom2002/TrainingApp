import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UiIconComponent } from './ui-icon.component';
@Component({
  selector: 'app-mobile-nav',
  standalone: true,
  imports: [RouterLink, UiIconComponent],
  template: `@if (visible) {
    <nav class="mobile-dock" aria-label="Mobile navigation">
      <a
        routerLink="/dashboard"
        [class.active]="url === '/dashboard' || url.startsWith('/dashboard?')"
        ><app-icon name="grid" /><span>Home</span></a
      ><a
        routerLink="/dashboard"
        fragment="history"
        [class.active]="url.includes('#history')"
        ><app-icon name="history" /><span>History</span></a
      ><a
        class="dock-train"
        routerLink="/add-training"
        [class.active]="url.includes('training')"
        ><span class="dock-plus"><app-icon name="plus" /></span
        ><span>Train</span></a
      ><a routerLink="/journey" [class.active]="url.startsWith('/journey')"
        ><app-icon name="trophy" /><span>Achievements</span></a
      ><a routerLink="/profile" [class.active]="url.startsWith('/profile')"
        ><app-icon name="user" /><span>Profile</span></a
      >
    </nav>
  }`,
  styles: [
    `
      :host {
        display: none;
      }
      @media (max-width: 700px) {
        :host {
          display: block;
        }
        .mobile-dock {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          position: fixed;
          inset: auto 0 0;
          z-index: 60;
          min-height: calc(66px + env(safe-area-inset-bottom));
          padding: 8px 9px calc(8px + env(safe-area-inset-bottom));
          background: #17131ef5;
          border-top: 1px solid #b088e620;
          backdrop-filter: blur(24px);
        }
        a {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          gap: 5px;
          text-decoration: none;
          color: #9783aa;
          font-size: 9px;
          min-width: 0;
        }
        app-icon {
          width: 19px;
          height: 19px;
        }
        .active {
          color: #c8a4fc;
        }
        .dock-plus {
          width: 36px;
          height: 31px;
          display: grid;
          place-items: center;
          border-radius: 10px;
          background: linear-gradient(135deg, #aa7af0, #7a47ce);
          color: #fff;
          box-shadow: 0 3px 16px #985cea30;
          margin-top: -4px;
        }
        .dock-train {
          gap: 3px;
          color: #c8a4fc;
        }
        .dock-plus app-icon {
          width: 20px;
          height: 20px;
        }
      }
    `,
  ],
})
export class MobileNavComponent {
  constructor(private router: Router) {}
  get url() {
    return this.router.url;
  }
  get visible() {
    return !['/', '/login', '/register'].includes(
      this.router.url.split('?')[0],
    );
  }
}
