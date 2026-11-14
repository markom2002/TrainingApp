import { Component, Input } from '@angular/core';
import type { RankTier } from '../../services/journey.service';
let emblemSequence = 0;
@Component({
  selector: 'app-rank-emblem',
  standalone: true,
  templateUrl: './rank-emblem.component.html',
  styleUrls: ['./rank-emblem.css'],
})
export class RankEmblemComponent {
  @Input({ required: true }) rank!: RankTier;
  readonly uid = ++emblemSequence;
  get marks() {
    return Array.from(
      { length: Math.min(4, (this.rank.index % 4) + 1) },
      (_, i) => i,
    );
  }
}
