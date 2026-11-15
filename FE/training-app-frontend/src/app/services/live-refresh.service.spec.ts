import { fakeAsync, tick } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { OfflineService } from './offline.service';
import { LiveRefreshService } from './live-refresh.service';

describe('Live refresh across devices', () => {
  it('refreshes visible online screens every five seconds and stops after leaving', fakeAsync(() => {
    spyOnProperty(document, 'visibilityState', 'get').and.returnValue('visible');
    spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    const service = new LiveRefreshService({ workoutsSynced: new Subject<void>() } as OfflineService);
    const refresh = jasmine.createSpy('refresh');
    const subscription = service.changes.subscribe(refresh);
    tick(5000);
    expect(refresh).toHaveBeenCalledTimes(1);
    subscription.unsubscribe();
    tick(10000);
    expect(refresh).toHaveBeenCalledTimes(1);
  }));

  it('pauses hidden or offline screens and refreshes on resume and confirmed sync', fakeAsync(() => {
    const visibility = spyOnProperty(document, 'visibilityState', 'get').and.returnValue('hidden');
    const online = spyOnProperty(navigator, 'onLine', 'get').and.returnValue(true);
    const synced = new Subject<void>();
    const service = new LiveRefreshService({ workoutsSynced: synced } as OfflineService);
    const refresh = jasmine.createSpy('refresh');
    const subscription = service.changes.subscribe(refresh);
    tick(5000);
    expect(refresh).not.toHaveBeenCalled();
    visibility.and.returnValue('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(refresh).toHaveBeenCalledTimes(1);
    online.and.returnValue(false);
    tick(5000);
    expect(refresh).toHaveBeenCalledTimes(1);
    online.and.returnValue(true);
    window.dispatchEvent(new Event('online'));
    synced.next();
    expect(refresh).toHaveBeenCalledTimes(3);
    subscription.unsubscribe();
  }));
});
