import { Injectable } from '@angular/core';
import { filter, fromEvent, interval, merge, share } from 'rxjs';
import { OfflineService } from './offline.service';

@Injectable({ providedIn: 'root' })
export class LiveRefreshService {
  // Every visible device reads the same server; resuming refreshes immediately.
  readonly changes;
  constructor(offline: OfflineService) {
    this.changes = merge(
      interval(5000),
      fromEvent(document, 'visibilitychange'),
      fromEvent(window, 'focus'),
      fromEvent(window, 'online'),
      offline.workoutsSynced,
    ).pipe(
      filter(() => navigator.onLine && document.visibilityState !== 'hidden'),
      share(),
    );
  }
}
