import { Component } from '@angular/core';
import { PwaService } from '../services/pwa.service';
import { UiIconComponent } from './ui-icon.component';
@Component({
  selector: 'app-install-app',
  standalone: true,
  imports: [UiIconComponent],
  template: `@if (!pwa.browserDemo && !pwa.installed && !pwa.localPreview) {
    <section class="install-card">
      <span class="install-icon"><app-icon name="phone" /></span>
      <div>
        <strong>Your progress. In your pocket.</strong>
        <p>Add 🏋️ to your home screen. One tap from your next session.</p>
      </div>
      <button type="button" (click)="install()">
        {{ pwa.promptEvent ? 'Install app' : 'How to install' }} <span>↗</span>
      </button>
    </section>
    @if (showHelp) {
      <div class="install-help">
        <strong>iPhone</strong>
        <p>
          Open the app's HTTPS address in Safari → Share → Add to Home Screen →
          Open as Web App → Add.
        </p>
        <strong>Android / desktop</strong>
        <p>
          Open the app in Chrome or Edge → browser menu → Install app / Add to
          Home screen.
        </p>
        <p class="install-note">
          Use a trusted HTTPS address. First sign-in and syncing need the server. After offline preparation, new workouts can be saved on this device without a connection.
        </p>
        <button type="button" (click)="showHelp = false">Got it</button>
      </div>
    }
  }`,
  styles: [
    `
      :host {
        display: block;
      }
      .install-card {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 22px;
        border: 1px solid #ac83e62b;
        background: linear-gradient(115deg, #ac83e614, #141117);
        border-radius: 14px;
        margin: 24px 0;
      }
      .install-icon {
        display: grid;
        place-items: center;
        width: 44px;
        height: 48px;
        background: #ac83e620;
        border-radius: 11px;
        color: #c4a1f3;
        flex-shrink: 0;
      }
      .install-icon app-icon {
        width: 24px;
        height: 24px;
      }
      .install-card strong {
        font-size: 14px;
        color: #e4d4f3;
      }
      .install-card p {
        font-size: 11px;
        color: #a48ab6;
        margin: 6px 0 0;
        line-height: 1.6;
      }
      .install-card button {
        margin-left: auto;
        flex-shrink: 0;
        background: #a477e923;
        color: #d4b7fa;
        border: 1px solid #a477e935;
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 11px;
      }
      .install-card button span {
        margin-left: 18px;
      }
      .install-help {
        background: #21192b;
        border: 1px solid #a477e930;
        padding: 24px;
        border-radius: 12px;
        font-size: 12px;
        color: #c3abd5;
        line-height: 1.8;
        margin-top: -12px;
      }
      .install-help p {
        margin: 5px 0 18px;
      }
      .install-note {
        color: #9983ab;
      }
      .local-setup { display:block;color:#d2b4f3;margin:15px 0;font-size:12px;text-decoration:none; }
      .install-help button {
        background: #9565eb;
        color: white;
        border: 0;
        border-radius: 7px;
        padding: 9px 16px;
      }
      @media (max-width: 650px) {
        .install-card {
          flex-wrap: wrap;
          padding: 18px;
        }
        .install-card > div {
          flex: 1;
          min-width: 150px;
        }
        .install-card button {
          margin-left: 60px;
        }
        .install-card p {
          font-size: 10px;
        }
      }
    `,
  ],
})
export class InstallAppComponent {
  showHelp = false;
  constructor(public pwa: PwaService) {}
  install() {
    if (this.pwa.promptEvent) this.pwa.install();
    else this.showHelp = !this.showHelp;
  }
}
