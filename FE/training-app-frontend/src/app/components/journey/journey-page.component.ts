import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JourneyPanelComponent } from './journey-panel.component';
import { UiIconComponent } from '../ui-icon.component';
@Component({
  standalone: true,
  imports: [RouterLink, JourneyPanelComponent, UiIconComponent],
  template: `<main class="journey-page">
    <header class="journey-nav">
      <a routerLink="/dashboard">← Back to overview</a
      ><a class="journey-wordmark" routerLink="/dashboard"
        >🏋️<span>.</span></a
      >
    </header>
    <section class="journey-title">
      <div>
        <p class="kicker">PROOF THAT YOU SHOWED UP</p>
        <h1>EARN YOUR<br /><em>EVERYTHING.</em></h1>
        <p>Build your streak. Beat your best. Make it yours.</p>
      </div>
      <a class="journey-cta" routerLink="/add-training"
        ><app-icon name="plus" /> Log workout</a
      >
    </section>
    <app-journey-panel [expanded]="true" />
    <nav class="journey-mobile-nav" aria-label="Main navigation">
      <a routerLink="/dashboard"><app-icon name="grid" />Home</a
      ><a routerLink="/add-training"><app-icon name="plus" />Train</a
      ><a routerLink="/journey" aria-current="page"
        ><app-icon name="trophy" />Journey</a
      ><a routerLink="/profile"><app-icon name="user" />Profile</a>
    </nav>
  </main>`,
  styleUrls: ['./journey-page.css'],
})
export class JourneyPageComponent {}
