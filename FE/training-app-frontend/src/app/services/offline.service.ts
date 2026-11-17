import { Injectable, Injector, signal, OnDestroy } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, firstValueFrom, of, tap, map, Subject, throwError, timeout, TimeoutError } from 'rxjs';
import { API_BASE_URL } from '../api.config';
interface PendingWorkout { id:number; clientId:string; body:any; attempted?:boolean; }
@Injectable({providedIn:'root'})
export class OfflineService implements OnDestroy {
  readonly ready=signal(false);
  readonly workoutsSynced = new Subject<void>();
  private online=()=>void this.sync();
  private prepared=()=>{
    const expected=document.querySelector<HTMLMetaElement>('meta[name="form-offline-build"]')?.content;
    const worker=navigator.serviceWorker.controller;
    if(!expected||!worker)return;
    const channel=new MessageChannel(),timer=setTimeout(()=>channel.port1.close(),5000);
    channel.port1.onmessage=event=>{clearTimeout(timer);this.ready.set(event.data?.cache===`form-offline-${expected}`);channel.port1.close();};
    worker.postMessage({type:'OFFLINE_STATUS'},[channel.port2]);
  };
  private session=()=>{
    this.revision.update(n=>n+1);
    this.injector.get(HttpClient).get(`${API_BASE_URL}/exercises`).subscribe({error:()=>{}});
    void this.sync();
  };
  private timer:ReturnType<typeof setInterval>;
  readonly revision=signal(0);
  readonly syncing=signal(false);
  readonly status=signal('');
  get account(){this.revision();try{return localStorage.getItem('form.offlineAccount');}catch{return null;}}
  get pending():PendingWorkout[]{this.revision();return this.read('pending')??[];}
  constructor(private injector:Injector){
    window.addEventListener('online',this.online);
    window.addEventListener('form-session-ready',this.session);
    this.timer=setInterval(()=>{if(navigator.onLine&&this.pending.length)void this.sync();},30000);
    if('serviceWorker' in navigator&&'caches' in window){
      navigator.serviceWorker.ready.then(this.prepared);
      navigator.serviceWorker.addEventListener('controllerchange',this.prepared);
    }
  }
  ngOnDestroy(){clearInterval(this.timer);window.removeEventListener('online',this.online);window.removeEventListener('form-session-ready',this.session);navigator.serviceWorker?.removeEventListener('controllerchange',this.prepared);}
  private key(name:string){return `form.offline.v1.${this.account}.${name}`;}
  read(name:string):any{try{return JSON.parse(localStorage.getItem(this.key(name))??'null');}catch{return null;}}
  write(name:string,value:any){localStorage.setItem(this.key(name),JSON.stringify(value));this.revision.update(n=>n+1);}
  save(body:any,attempted=false){
    if(!this.account)throw new Error('Sign in online once before saving offline.');
    const item={id:Math.min(-Date.now(),...this.pending.map(p=>p.id-1)),clientId:body.clientId??crypto.randomUUID(),body,attempted};
    item.body={...body,clientId:item.clientId};
    this.write('pending',[...this.pending,item]);this.status.set('Saved on this device. Waiting to sync.');
    return {...item.body,id:item.id};
  }
  calendar(body:any[],url:string){
    const params=new URL(url,location.origin).searchParams;
    return [...body,...this.pending.filter(p=>{
      if(body.some(item=>item.clientId===p.clientId))return false;
      const d=new Date(p.body.trainingDate);
      return d.getUTCFullYear()===Number(params.get('year'))&&d.getUTCMonth()+1===Number(params.get('month'));
    }).map(p=>({...p.body,id:p.id}))];
  }
  async sync(){
    const account=this.account;
    if(!navigator.onLine||!account||this.syncing()||!this.pending.length)return;
    this.syncing.set(true);
    try{
      for(const item of this.pending){
        if(this.account!==account)break;
        this.write('pending',this.pending.map(p=>p.clientId===item.clientId?{...p,attempted:true}:p));
        await firstValueFrom(this.injector.get(HttpClient).post(`${API_BASE_URL}/trainings`,item.body,
          {headers:new HttpHeaders({'X-Offline-Sync':'1','X-Offline-Account':account})}));
        if(this.account!==account)break;
        this.write('pending',this.pending.filter(p=>p.clientId!==item.clientId));
        this.workoutsSynced.next();
      }
      this.status.set(this.pending.length?'Some workouts still need syncing.':'All workouts synced.');
    }catch{this.status.set('Workouts remain saved on this device. Reconnect or sign in to sync.');}
    finally{this.syncing.set(false);}
  }
}
export const offlineInterceptor:HttpInterceptorFn=(request,next)=>{
  const store=inject(OfflineService);
  if(!request.url.startsWith(`${API_BASE_URL}/`)||request.url.includes('/auth/'))return next(request);
  const account=store.account,key=`get:${request.urlWithParams}`;
  const calendar=request.url.endsWith('/journey/calendar');
  const localId=Number(request.url.split('/').at(-1));
  const pending=localId<0?store.pending.find(p=>p.id===localId):undefined;
  if(pending){
    if(request.method!=='GET'&&(store.syncing()||pending.attempted))return throwError(()=>new HttpErrorResponse({status:409,error:{title:'Sync required',detail:'Finish syncing this workout before changing it, so retrying cannot discard your changes.'}}));
    if(request.method==='DELETE'){store.write('pending',store.pending.filter(p=>p.id!==localId));return of(new HttpResponse({status:204}));}
    if(request.method==='PUT'){pending.body={...(request.body as object),clientId:pending.clientId};store.write('pending',store.pending.map(p=>p.id===localId?pending:p));}
    return of(new HttpResponse({status:200,body:{...pending.body,id:pending.id}}));
  }
  const create=request.method==='POST'&&request.url===`${API_BASE_URL}/trainings`&&!request.headers.has('X-Offline-Sync');
  if(create)request=request.clone({body:{...(request.body as object),clientId:crypto.randomUUID()}});
  const queue=(attempted=false)=>of(new HttpResponse({status:200,body:store.save(request.body,attempted)}));
  if(create&&!navigator.onLine)return queue();
  if(request.method==='GET'&&!navigator.onLine){
    const cached=store.read(key);
    if(cached!==null||calendar)return of(new HttpResponse({status:200,body:calendar?store.calendar(cached??[],request.urlWithParams):cached}));
  }
  return next(request).pipe(timeout({first:6000}),tap(event=>{
    if(event instanceof HttpResponse&&request.method==='GET'&&account===store.account&&account){
      try{store.write(key,event.body);}catch{store.status.set('Offline storage is full. Free device storage before going offline.');}
    }
  }),map(event=>event instanceof HttpResponse&&calendar&&account===store.account
    ?event.clone({body:store.calendar(event.body as any[],request.urlWithParams)}):event),catchError(error=>{
    if(!((error instanceof HttpErrorResponse&&error.status===0)||error instanceof TimeoutError)||!account||account!==store.account)return throwError(()=>error);
    if(create)return queue(true);
    const cached=store.read(key);
    if(request.method==='GET'&&cached!==null)return of(new HttpResponse({status:200,body:calendar?store.calendar(cached,request.urlWithParams):cached}));
    if(request.method==='GET'&&calendar)return of(new HttpResponse({status:200,body:store.calendar([],request.urlWithParams)}));
    return throwError(()=>error);
  }));
};
