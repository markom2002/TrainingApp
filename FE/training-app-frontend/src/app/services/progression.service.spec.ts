import { ProgressionService } from './progression.service';
import { Journey, RankTier } from './journey.service';
const ranks:RankTier[]=[{id:'iron',index:0,name:'Iron',motto:'Start',minXp:0,color:'#abc',secondary:'#678'},{id:'bronze',index:1,name:'Bronze',motto:'Build',minXp:400,color:'#eab',secondary:'#978'},{id:'silver',index:2,name:'Silver',motto:'Grow',minXp:1200,color:'#def',secondary:'#789'}];
function state(xp:number,earned:string[]=[],accountId=90001):Journey{
  const current=ranks.filter(r=>r.minXp<=xp).at(-1)!;const next=ranks[current.index+1]??null;
  return {accountId,xp,rank:{current,next,xpInRank:xp-current.minXp,rankSpan:next?next.minXp-current.minXp:0,xpToNext:next?next.minXp-xp:0,percent:0},rankLadder:ranks,achievements:['first','spark'].map(id=>({id,name:id,description:id,icon:'bolt',color:'violet',xp:100,progress:earned.includes(id)?1:0,target:1,unlocked:earned.includes(id)})),currentStreak:0,bestStreak:0,totalWorkouts:0,level:1,levelXp:0,nextLevelXp:500,trainedToday:false,streakDeadline:null,week:[],personalRecords:[],bodyGoal:'Track',measurements:[],weightChangeKg:null};
}
describe('Progression rewards',()=>{
  let service:ProgressionService;
  beforeEach(()=>{localStorage.removeItem('form.progression.v1.90001');localStorage.removeItem('form.progression.v1.90002');service=new ProgressionService();});
  afterEach(()=>{service.ngOnDestroy();localStorage.removeItem('form.progression.v1.90001');localStorage.removeItem('form.progression.v1.90002');});
  it('quietly establishes a baseline for existing history',()=>{service.observe(state(1500,['first','spark']));expect(service.current()).toBeNull();expect(service.remaining()).toBe(0);});
  it('queues only newly earned achievements once, including across reloads',()=>{
    service.observe(state(0));service.observe(state(500,['first','spark']));
    expect(service.current()?.title).toBe('first');expect(service.remaining()).toBe(1);
    service.observe(state(500,['first','spark']));expect(service.remaining()).toBe(1);
    service.advance();expect(service.current()?.title).toBe('spark');service.advance();expect(service.current()).toBeNull();
    const reloaded=new ProgressionService();reloaded.observe(state(500,['first','spark']));expect(reloaded.current()).toBeNull();reloaded.ngOnDestroy();
  });
  it('does not announce XP gains',()=>{service.observe(state(140,['first']));service.observe(state(180,['first']));expect(service.current()).toBeNull();});
  it('does not replay earned badges or rank ups after corrections and re-entry',()=>{service.observe(state(1500,['first','spark']));service.observe(state(0));expect(service.current()).toBeNull();service.observe(state(1500,['first','spark']));expect(service.current()).toBeNull();expect(service.remaining()).toBe(0);});
  it('keeps different accounts separate',()=>{service.observe(state(0,[],90001));service.observe(state(1500,['first','spark'],90002));expect(service.current()).toBeNull();service.observe(state(140,['first'],90001));expect(service.current()?.title).toBe('first');});
  it('ignores removed rank previews without modifying achievements',()=>{service.observe(state(140,['first']));const before=localStorage.getItem('form.progression.v1.90001');service.preview(ranks[2]);expect(service.current()).toBeNull();expect(localStorage.getItem('form.progression.v1.90001')).toBe(before);service.dismissAll();expect(service.current()).toBeNull();});
  it('treats corrupt snapshots as a new baseline',()=>{localStorage.setItem('form.progression.v1.90001','{"version":1,"xp":"invalid"}');service.observe(state(140,['first']));expect(service.current()).toBeNull();});
});
