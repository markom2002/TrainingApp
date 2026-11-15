import { Component } from '@angular/core';
import { OfflineService } from './services/offline.service';
import { RouterModule } from '@angular/router';
import { PwaService } from './services/pwa.service';
import { MobileNavComponent } from './components/mobile-nav.component';
import { AchievementToastComponent } from './components/achievements/achievement-toast.component';
import { DatePipe } from '@angular/common';
import { environment } from '../environments/environment';
import { PagesDemoBannerComponent } from './pages-demo/demo-banner.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MobileNavComponent, AchievementToastComponent, DatePipe, PagesDemoBannerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly pagesDemo = environment.pagesDemo;
  constructor(public pwa: PwaService, public offline: OfflineService) {}
}
