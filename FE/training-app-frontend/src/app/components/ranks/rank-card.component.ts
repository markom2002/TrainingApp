import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Journey } from '../../services/journey.service';
import { RankEmblemComponent } from './rank-emblem.component';
@Component({
  selector: 'app-rank-card',
  standalone: true,
  imports: [CommonModule, RouterLink, RankEmblemComponent],
  template: `@if (journey.rank; as r) {
    <article
      class="rank-card"
      [style.--rank-color]="r.current.color"
      [style.--rank-secondary]="r.current.secondary"
    >
      <div class="rank-card-heading">
        <span>YOUR ATHLETE RANK</span
        ><strong>{{ journey.xp | number }} XP</strong>
      </div>
      <div class="rank-card-body">
        <app-rank-emblem [rank]="r.current" />
        <div>
          <span>RANK {{ r.current.index + 1 }} / 09</span>
          <h3>{{ r.current.name }}</h3>
          <p>{{ r.current.motto }}</p>
        </div>
      </div>
      <div class="rank-card-progress">
        <span>{{
          r.next
            ? (r.xpInRank | number) + ' / ' + (r.rankSpan | number) + ' XP'
            : 'HIGHEST RANK. STILL EVOLVING.'
        }}</span><span>{{
          r.next ? r.next.name + ' ↗' : 'LEGEND STATUS'
        }}</span>
      </div>
      <div
        class="rank-fill-track"
        role="progressbar"
        aria-label="Progress to next rank"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuenow]="r.percent"
      >
        <span [style.width.%]="r.percent"></span>
      </div>
      <a routerLink="/journey"
        >{{
          r.next
            ? (r.xpToNext | number) + ' XP to your next chapter'
            : 'Every session adds to your legacy'
        }}
        <span>↗</span></a
      >
    </article>
  }`,
  styleUrls: ['./rank-card.css','./rank-motion.css'],
})
export class RankCardComponent {
  @Input({ required: true }) journey!: Journey;
}
