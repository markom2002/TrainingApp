import { Component } from '@angular/core';
import { OfflineService } from './services/offline.service';
import { RouterModule } from '@angular/router';
import { PwaService } from './services/pwa.service';
import { MobileNavComponent } from './components/mobile-nav.component';
import { AchievementToastComponent } from './components/achievements/achievement-toast.component';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, MobileNavComponent, AchievementToastComponent, DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  constructor(public pwa: PwaService, public offline: OfflineService) {}
}
