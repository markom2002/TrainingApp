import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { guestGuard } from './guest.guard';
import { AuthService } from './services/auth.service';
describe('Reopening a saved session',()=>{
  const run=async(loggedIn:boolean,refresh:unknown)=>{
    const auth={isLoggedIn:loggedIn,refresh:jasmine.createSpy().and.returnValue(refresh)};
    TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:auth},{provide:Router,useValue:{createUrlTree:()=>'/dashboard'}}]});
    const result=TestBed.runInInjectionContext(()=>guestGuard({} as ActivatedRouteSnapshot,{} as RouterStateSnapshot));
    return {auth,result:isObservable(result)?await firstValueFrom(result):result};
  };
  it('restores a persistent cookie session before showing login',async()=>{expect((await run(false,of({token:'restored'}))).result as unknown).toBe('/dashboard');});
  it('keeps the login form available when the cookie has expired',async()=>{expect((await run(false,throwError(()=>new Error('Expired')))).result).toBeTrue();});
  it('reuses an already restored in-memory session',async()=>{const {auth,result}=await run(true,of({}));expect(result as unknown).toBe('/dashboard');expect(auth.refresh).not.toHaveBeenCalled();});
});
