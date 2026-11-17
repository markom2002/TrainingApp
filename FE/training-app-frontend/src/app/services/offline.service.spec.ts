import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../api.config';
import { OfflineService, offlineInterceptor } from './offline.service';
describe('Offline workouts',()=>{
  let http:HttpClient,requests:HttpTestingController,store:OfflineService,online:jasmine.Spy,previous:string|null;
  beforeEach(()=>{
    previous=localStorage.getItem('form.offlineAccount');localStorage.setItem('form.offlineAccount','offline-test');
    for(const key of Object.keys(localStorage))if(key.startsWith('form.offline.v1.offline-test.'))localStorage.removeItem(key);
    online=spyOnProperty(navigator,'onLine','get').and.returnValue(false);
    TestBed.configureTestingModule({providers:[provideHttpClient(withInterceptors([offlineInterceptor])),provideHttpClientTesting()]});
    http=TestBed.inject(HttpClient);requests=TestBed.inject(HttpTestingController);store=TestBed.inject(OfflineService);
  });
  afterEach(()=>{requests.verify();store.ngOnDestroy();for(const key of Object.keys(localStorage))if(key.startsWith('form.offline.v1.offline-test.'))localStorage.removeItem(key);if(previous===null)localStorage.removeItem('form.offlineAccount');else localStorage.setItem('form.offlineAccount',previous);});
  it('durably saves a new workout without sending a network request',()=>{
    let saved:any;http.post(`${API_BASE_URL}/trainings`,{exercises:[{weightKg:13.61,weightUnit:'lbs',weightValue:30}]}).subscribe(v=>saved=v);
    requests.expectNone(`${API_BASE_URL}/trainings`);expect(saved.id).toBeLessThan(0);expect(store.pending.length).toBe(1);expect(store.pending[0].body.exercises[0].weightValue).toBe(30);
    expect(JSON.parse(localStorage.getItem('form.offline.v1.offline-test.pending')!).length).toBe(1);
  });
  it('retains a stable sync ID after network failure and removes the queue only on confirmation',async()=>{
    store.save({exercises:[]});const id=store.pending[0].clientId;online.and.returnValue(true);
    const failed=store.sync();const attempt=requests.expectOne(`${API_BASE_URL}/trainings`);expect(attempt.request.body.clientId).toBe(id);attempt.error(new ProgressEvent('error'));await failed;
    expect(store.pending.length).toBe(1);
    const success=store.sync();const retry=requests.expectOne(`${API_BASE_URL}/trainings`);expect(retry.request.body.clientId).toBe(id);retry.flush({id:1});await success;expect(store.pending.length).toBe(0);
  });
  it('shows pending workouts even when the calendar server responds successfully',()=>{
    online.and.returnValue(true);
    const saved=store.save({trainingDate:'2026-11-16T12:00:00Z',exercises:[]});
    store.save({trainingDate:'2026-10-16T12:00:00Z',exercises:[]});
    let result:any;
    http.get(`${API_BASE_URL}/journey/calendar`,{params:{year:2026,month:11}}).subscribe(v=>result=v);
    requests.expectOne(r=>r.url.endsWith('/journey/calendar')).flush([]);
    expect(result.map((item:any)=>item.id)).toEqual([saved.id]);
    expect(store.pending.length).toBe(2);
  });
  it('does not duplicate a queued workout already committed by the server',()=>{
    const saved=store.save({trainingDate:'2026-11-16T12:00:00Z'});
    const result=store.calendar([{...saved,id:42}],`${API_BASE_URL}/journey/calendar?year=2026&month=11`);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe(42);
  });
  it('notifies the calendar only after a queued workout is confirmed',async()=>{
    store.save({trainingDate:'2026-11-16T12:00:00Z'});
    const refresh=jasmine.createSpy('refresh');store.workoutsSynced.subscribe(refresh);
    online.and.returnValue(true);
    const syncing=store.sync();expect(refresh).not.toHaveBeenCalled();
    requests.expectOne(`${API_BASE_URL}/trainings`).flush({id:42});await syncing;
    expect(refresh).toHaveBeenCalledTimes(1);expect(store.pending.length).toBe(0);
  });
  it('serves cached exercises on transport failure and isolates other accounts',()=>{
    online.and.returnValue(true);
    http.get(`${API_BASE_URL}/exercises`).subscribe();requests.expectOne(`${API_BASE_URL}/exercises`).flush([{id:'lat-pulldown'}]);
    let result:any;http.get(`${API_BASE_URL}/exercises`).subscribe(v=>result=v);requests.expectOne(`${API_BASE_URL}/exercises`).error(new ProgressEvent('error'));expect(result[0].id).toBe('lat-pulldown');
    localStorage.setItem('form.offlineAccount','other-account');expect(store.pending).toEqual([]);expect(store.read(`get:${API_BASE_URL}/exercises`)).toBeNull();
  });
  it('opens cached exercises and pending calendar immediately while offline',()=>{
    store.write(`get:${API_BASE_URL}/exercises`,[{id:'lat-pulldown'}]);
    store.save({trainingDate:'2026-11-17T12:00:00Z'});
    let exercises:any,calendar:any;
    http.get(`${API_BASE_URL}/exercises`).subscribe(v=>exercises=v);
    http.get(`${API_BASE_URL}/journey/calendar`,{params:{year:2026,month:11}}).subscribe(v=>calendar=v);
    requests.expectNone(()=>true);
    expect(exercises[0].id).toBe('lat-pulldown');expect(calendar.length).toBe(1);
  });
});
