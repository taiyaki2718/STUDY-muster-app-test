/* Regression test for onboarding gating + COMPLETE_ONBOARDING payload.
   Run: node tests/onboarding.test.mjs
   NOTE: mirrors shouldOnboard() and the COMPLETE_ONBOARDING reducer case in
   index.html. Keep in sync until shared logic is extracted. */
const pad = n => String(n).padStart(2,'0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const today = () => dstr(new Date());
const addDays = (ds,n)=>{const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return dstr(d);};
let _id=0; const uid=()=>'id'+(++_id);

function shouldOnboard(state){
  if(state.onboarded===true) return false;
  const used=(state.goals&&state.goals.length)||(state.tasks&&state.tasks.length)||(state.cards&&state.cards.length)||(state.monthGoals&&Object.keys(state.monthGoals).length);
  return !used;
}
function completeOnboarding(state,a){
  let next={...state,onboarded:true};
  if(a.identity!=null) next.identity=a.identity.trim();
  if(a.goal&&a.goal.title&&a.goal.title.trim()){
    next.goals=[...next.goals,{id:uid(),title:a.goal.title.trim(),deadline:a.goal.deadline||addDays(today(),30)}];
  }
  if(a.task&&a.task.title&&a.task.title.trim()){
    const tk={id:uid(),title:a.task.title.trim(),date:today(),done:false};
    const cue=a.task.cue&&a.task.cue.trim();
    if(cue) tk.cue=cue;
    next.tasks=[...next.tasks,tk];
  }
  return next;
}

let pass=0,fail=0;
const chk=(n,g,e)=>{const ok=JSON.stringify(g)===JSON.stringify(e);ok?pass++:fail++;console.log((ok?'PASS':'FAIL')+' '+n+' => '+JSON.stringify(g)+(ok?'':' exp '+JSON.stringify(e)));};
const base={goals:[],tasks:[],cards:[],monthGoals:{},identity:'',onboarded:false};

// gating
chk('fresh user -> onboard', shouldOnboard(base), true);
chk('onboarded flag -> skip', shouldOnboard({...base,onboarded:true}), false);
chk('has goal -> skip (existing user)', shouldOnboard({...base,goals:[{id:'g'}]}), false);
chk('has card -> skip', shouldOnboard({...base,cards:[{id:'c'}]}), false);
chk('has monthGoal -> skip', shouldOnboard({...base,monthGoals:{'2026-06':{}}}), false);

// payload: full
const full=completeOnboarding(base,{identity:'  学ぶ人 ',goal:{title:' 英語 '},task:{title:' 1ページ開く ',cue:' 朝食後 '}});
chk('onboarded set', full.onboarded, true);
chk('identity trimmed', full.identity, '学ぶ人');
chk('goal added+trimmed', full.goals.length===1 && full.goals[0].title, '英語');
chk('goal default deadline +30d', full.goals[0].deadline, addDays(today(),30));
chk('task added today', full.tasks.length===1 && full.tasks[0].date, today());
chk('task cue trimmed', full.tasks[0].cue, '朝食後');

// payload: skip (empty)
const skip=completeOnboarding(base,{identity:'',goal:null,task:null});
chk('skip sets onboarded', skip.onboarded, true);
chk('skip adds no goal', skip.goals.length, 0);
chk('skip adds no task', skip.tasks.length, 0);

// payload: task without cue
const noCue=completeOnboarding(base,{identity:'',goal:{title:'G'},task:{title:'T',cue:''}});
chk('no cue -> cue field absent', 'cue' in noCue.tasks[0], false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
