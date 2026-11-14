import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RewardAudioService } from '../../services/reward-audio.service';
@Component({
  selector: 'app-sound-controls',
  standalone: true,
  imports: [FormsModule],
  template: `<div class="sound-controls">
    <button
      type="button"
      (click)="audio.toggle()"
      [attr.aria-pressed]="audio.enabled"
    >
      {{ audio.enabled ? '◖ Sound on' : '◖ Enable reward sound' }}
    </button>
    @if (audio.enabled) {
      <label
        >Volume<input
          type="range"
          min="0"
          max="0.6"
          step="0.05"
          [ngModel]="audio.volume"
          (ngModelChange)="audio.setVolume($event)"
          aria-label="Reward sound volume"
      /></label>
    }
  </div>`,
  styles: [
    `
      .sound-controls {
        display: flex;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
        margin: 18px 0;
      }
      .sound-controls button {
        border: 1px solid #a58aca30;
        border-radius: 8px;
        padding: 10px 14px;
        background: #a58aca0c;
        color: #cfb3ee;
        font-size: 11px;
        cursor: pointer;
      }
      .sound-controls label {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 10px;
        color: #a68bb7;
      }
      .sound-controls input {
        width: 110px;
        accent-color: #b78ce9;
      }
    `,
  ],
})
export class SoundControlsComponent {
  constructor(public audio: RewardAudioService) {}
}
