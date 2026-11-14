import { Component, Input, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Journey, RankTier } from '../../services/journey.service';
import { ProgressionService } from '../../services/progression.service';
import { RankEmblemComponent } from './rank-emblem.component';
import { UiIconComponent } from '../ui-icon.component';
import { RewardAudioService } from '../../services/reward-audio.service';
@Component({
  selector: 'app-rank-board',
  standalone: true,
  imports: [CommonModule, RankEmblemComponent, UiIconComponent],
  templateUrl: './rank-board.component.html',
  styleUrls: [
    './rank-board.css',
    './rank-board-details.css',
    './rank-ledger.css',
    './rank-rulebook.css',
    './rank-board-responsive.css',
    './rank-motion.css',
  ],
})
export class RankBoardComponent implements OnChanges {
  @Input({ required: true }) journey!: Journey;
  selected?: RankTier;
  constructor(public progression: ProgressionService, private audio: RewardAudioService) {}
  preview(rank: RankTier) {
    this.audio.audition(rank.index);
    this.progression.preview(rank);
  }
  ngOnChanges() {
    if (!this.selected) this.selected = this.journey.rank?.current;
  }
  select(rank: RankTier) {
    this.selected = rank;
    void this.audio.preload(rank.index);
  }
  get completed() {
    return this.journey.rank?.current.index ?? 0;
  }
}
