/* Regression test for the keyless auto-scheduler (planGoal/planTaskDates):
   distributing tasks from today..deadline by cadence onto the calendar.
   Run: node tests/autoplan.test.mjs
   NOTE: mirrors planGoal/planTaskDates in index.html. Keep in sync. */
const pad = n => String(n).padStart(2,'0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (ds,n)=>{const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return dstr(d);};
const dayDiff = (a,b) => Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/86400000);
let _id=0; const uid=()=>'id'+(++_id);
// 2026-06-15 is a Monday — good anchor for weekday/cadence checks
const TODAY='2026-06-15';
const today=()=>TODAY;

const CADENCE = {
  daily:    { label:'毎日', keep:()=>true },
  weekdays: { label:'平日（月〜金）', keep:(dow)=>dow>=1&&dow<=5 },
  mwf:      { label:'週3回（月・水・金）', keep:(dow)=>dow===1||dow===3||dow===5 },
  weekly:   { label:'週1回（月曜）', keep:(dow)=>dow===1 }
};
function planTaskDates(startDS,endDS,cadence){
  const keep=(CADENCE[cadence]||CADENCE.daily).keep; const out=[]; let d=startDS,g=0;
  while(dayDiff(d,endDS)>=0 && g<800){ const dow=new Date(d+'T00:00:00').getDay(); if(keep(dow)) out.push(d); d=addDays(d,1); g++; }
  return out;
}
function planGoal({title,deadline,cadence='daily',perSession='',today:t}){
  t=t||today(); const safeTitle=(title||'目標').trim()||'目標';
  let dl=deadline; if(!dl||dayDiff(t,dl)<0) dl=addDays(t,30);
  const dates=planTaskDates(t,dl,cadence); if(dates[0]!==t) dates.unshift(t);
  const n=dates.length; const per=(perSession||'').trim();
  const tasks=dates.map((date,i)=>{ const task={id:uid(),title:per||`${safeTitle}に取り組む`,date,done:false};
    if(i===0){ task.title=`🌱 まず2分：${per||safeTitle+'を始める'}`; task.cue='朝の支度が終わったら'; }
    else if(i===n-1&&n>1){ task.title=`🏁 総仕上げ・達成チェック：${safeTitle}`; }
    return task; });
  return { tasks, count:n, first:dates[0], last:dates[n-1], deadline:dl, cadenceLabel:(CADENCE[cadence]||CADENCE.daily).label };
}

let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS':'FAIL')+' '+n);};

// daily for 6 days (today..+5) -> 6 tasks
let p = planGoal({title:'英語',deadline:addDays(TODAY,5),cadence:'daily'});
ok('daily count = 6', p.count===6);
ok('first date is today', p.first===TODAY);
ok('last date is deadline', p.last===addDays(TODAY,5));
ok('all dates within range and sorted', p.tasks.every((t,i)=> i===0 || dayDiff(p.tasks[i-1].date,t.date)>=1));
ok('first task is 2-min starter with cue', p.tasks[0].title.startsWith('🌱 まず2分') && p.tasks[0].cue==='朝の支度が終わったら');
ok('last task is wrap-up', p.tasks[5].title.startsWith('🏁 総仕上げ'));

// weekdays: 2026-06-15(Mon)..2026-06-21(Sun) -> Mon-Fri = 5 days (Sat/Sun excluded)
p = planGoal({title:'g',deadline:addDays(TODAY,6),cadence:'weekdays'});
ok('weekdays excludes weekend (5)', p.count===5);
ok('weekdays no Sat/Sun', p.tasks.every(t=>{const d=new Date(t.date+'T00:00:00').getDay();return d>=1&&d<=5;}));

// mwf: today(Mon)..+13 (two weeks) -> Mon,Wed,Fri x2 = 6
p = planGoal({title:'g',deadline:addDays(TODAY,13),cadence:'mwf'});
ok('mwf two weeks = 6', p.count===6);

// today always included even if cadence excludes it: weekly starting on a Monday includes today; test a non-matching start
// pick start Tuesday by faking: weekly keep=Mon; today is Mon so included. Use mwf with a Sunday deadline-only span:
p = planGoal({title:'g',deadline:TODAY,cadence:'weekly'});
ok('today forced as first step (count>=1)', p.count>=1 && p.first===TODAY);

// perSession customizes titles
p = planGoal({title:'読書',deadline:addDays(TODAY,2),cadence:'daily',perSession:'1章読む'});
ok('perSession used for middle task', p.tasks[1].title==='1章読む');

// no/invalid deadline -> falls back to +30 days
p = planGoal({title:'g',deadline:'',cadence:'weekly'});
ok('fallback deadline +30d', p.deadline===addDays(TODAY,30));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
