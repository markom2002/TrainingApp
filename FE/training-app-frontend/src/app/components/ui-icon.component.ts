import { Component, Input } from '@angular/core';
@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path [attr.d]="paths[name] || paths['activity']" />
  </svg>`,
  styles: [
    ':host{display:inline-flex;width:20px;height:20px;flex-shrink:0}svg{width:100%;height:100%}',
  ],
})
export class UiIconComponent {
  @Input() name = 'activity';
  readonly paths: Record<string, string> = {
    arm:'M4 19c4 2 12 2 15-2 2-3 0-7-3-7h-3l-1-5-3-1-2 2 2 3 1 4c-3-1-5 1-6 6z M13 10l-2 4',
    leg:'M9 3h7l-1 8-3 5 5 3v2H8l-2-4 3-7z M9 10h6',
    core:'M7 3l5 2 5-2 2 6-3 12H8L5 9z M12 6v14 M9 10h6 M9 14h6',
    back:'M7 3l5 2 5-2 3 5-4 4-1 9H9l-1-9-4-4z M12 5v14',
    trophy:
      'M8 3h8v6a4 4 0 0 1-8 0z M8 5H4v2a4 4 0 0 0 4 4 M16 5h4v2a4 4 0 0 1-4 4 M12 13v6 M8 21h8 M9 19h6',
    scale:
      'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2 M8 8a5 5 0 0 1 8 0 M12 11l2-4',
    lock: 'M5 10h14v11H5z M8 10V7a4 4 0 0 1 8 0v3 M12 14v3',
    phone: 'M7 2h10v20H7z M11 18h2',
    grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    activity: 'M2 12h4l3-8 6 16 3-8h4',
    history: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M4 21v-2a8 8 0 0 1 16 0v2',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    up: 'M6 18 18 6 M6 6h12v12',
    plus: 'M12 5v14 M5 12h14',
    clock: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M12 7v5l3 2',
    flame:
      'M12 3c1 5 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 4 2 4 2 4s3-4 1-10z',
    bolt: 'M13 2 4 14h7l-1 8 10-13h-7z',
    target:
      'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M12 12h.01',
    dumbbell: 'M6 5v14 M3 8v8 M18 5v14 M21 8v8 M6 12h12',
    logout: 'M9 4H4v16h5 M9 12h12 M17 8l4 4-4 4',
    check: 'M5 12l4 4L19 6',
    calendar: 'M4 5h16v16H4z M8 3v4 M16 3v4 M4 10h16',
    chevron: 'M9 5l7 7-7 7',
  };
}
