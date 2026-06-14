/* Regression test for the streak-with-grace-day logic.
   Run: node tests/streak.test.mjs
   NOTE: these helpers mirror bumpStreak/reconcileStreak in index.html. Keep
   them in sync until the shared logic is extracted into its own module. */
const pad = n => String(n).padStart(2,'0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const dayDiff = (a,b) => Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/86400000);
// freeze "today" for deterministic test
const TODAY = '2026-06-14';
const today = () => TODAY;

function bumpStreak(state){
  const t=today(); const last=state.lastActiveDate;
  if(last===t) return state;
  let streak;
  if(!last){ streak=1; }
  else { const gap=dayDiff(last,t);
    if(gap===1||gap===2) streak=(state.streak||0)+1;
    else streak=1; }
  return {...state, streak, lastActiveDate:t};
}
function reconcileStreak(state){
  if(!state||!state.lastActiveDate) return state;
  const gap=dayDiff(state.lastActiveDate, today());
  if(gap>=3 && state.streak!==0) return {...state, streak:0};
  return state;
}

let pass=0, fail=0;
const chk=(name,got,exp)=>{ const ok=JSON.stringify(got)===JSON.stringify(exp); (ok?pass++:fail++); console.log((ok?'PASS':'FAIL')+' '+name+' => '+JSON.stringify(got)+(ok?'':' (expected '+JSON.stringify(exp)+')')); };

// first ever activity
chk('first activity', bumpStreak({streak:0,lastActiveDate:null}), {streak:1,lastActiveDate:TODAY});
// consecutive day (yesterday)
chk('consecutive (gap1)', bumpStreak({streak:5,lastActiveDate:'2026-06-13'}), {streak:6,lastActiveDate:TODAY});
// one grace day skipped (gap2)
chk('grace (gap2)', bumpStreak({streak:5,lastActiveDate:'2026-06-12'}), {streak:6,lastActiveDate:TODAY});
// broke streak (gap3)
chk('broken (gap3)', bumpStreak({streak:5,lastActiveDate:'2026-06-11'}), {streak:1,lastActiveDate:TODAY});
// already active today -> no double count
chk('same day idempotent', bumpStreak({streak:7,lastActiveDate:TODAY}), {streak:7,lastActiveDate:TODAY});
// reconcile: alive at gap1/2
chk('reconcile gap1 alive', reconcileStreak({streak:5,lastActiveDate:'2026-06-13'}), {streak:5,lastActiveDate:'2026-06-13'});
chk('reconcile gap2 alive', reconcileStreak({streak:5,lastActiveDate:'2026-06-12'}), {streak:5,lastActiveDate:'2026-06-12'});
// reconcile: broken at gap3
chk('reconcile gap3 reset', reconcileStreak({streak:5,lastActiveDate:'2026-06-11'}), {streak:0,lastActiveDate:'2026-06-11'});
// reconcile: null safe
chk('reconcile null', reconcileStreak({streak:0,lastActiveDate:null}), {streak:0,lastActiveDate:null});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
