import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PwaService } from './services/pwa.service';
import { MobileNavComponent } from './components/mobile-nav.component';
import { RewardOverlayComponent } from './components/ranks/reward-overlay.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MobileNavComponent, RewardOverlayComponent],
  template: `@if (!pwa.online) {
      <p class="connection-banner" role="status">
        You're offline. Reconnect before saving your workout.
      </p>
    }
    <router-outlet></router-outlet><app-mobile-nav /><app-reward-overlay />`,
})
export class AppComponent {
  constructor(public pwa: PwaService) {}
}
