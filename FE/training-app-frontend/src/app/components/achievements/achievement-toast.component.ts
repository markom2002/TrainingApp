import { Component } from '@angular/core';
import { ProgressionService } from '../../services/progression.service';
import { UiIconComponent } from '../ui-icon.component';
@Component({selector:'app-achievement-toast', standalone:true, imports:[UiIconComponent],
template:`@if(rewards.current();as reward){<aside class="achievement-toast" role="status"><app-icon name="trophy"/><div><small>ACHIEVEMENT UNLOCKED</small><strong>{{reward.title}}</strong><p>{{reward.description}}</p></div><button type="button" (click)="rewards.advance()" aria-label="Dismiss achievement">&#215;</button></aside>}`,
styles:[`:host{position:relative;z-index:150}.achievement-toast{position:fixed;right:24px;bottom:28px;display:flex;align-items:center;gap:18px;width:min(430px,calc(100vw - 32px));padding:22px;background:#d4ff56;color:#13170c;box-shadow:0 12px 60px #0008;border-radius:14px}.achievement-toast app-icon{width:34px;height:34px;flex-shrink:0}.achievement-toast small{display:block;font:700 9px monospace;letter-spacing:2px}.achievement-toast strong{display:block;font-size:20px;margin:6px 0}.achievement-toast p{font-size:12px;margin:0;line-height:1.5}.achievement-toast button{border:0;background:none;font-size:24px;color:inherit;margin-left:auto}@media(max-width:700px){.achievement-toast{bottom:90px;right:16px}}`]
})
export class AchievementToastComponent { constructor(public rewards:ProgressionService) {} }
