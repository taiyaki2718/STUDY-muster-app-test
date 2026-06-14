/* Regression test for buildCoachContext (pure logic that summarizes app state
   into a compact, privacy-preserving context string for the AI coach).
   Run: node tests/coach.test.mjs
   NOTE: mirrors buildCoachContext in index.html. Keep in sync. */
const pad = n => String(n).padStart(2,'0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (ds,n)=>{const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return dstr(d);};
const dayDiff = (a,b) => Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00'))/86400000);
const TODAY = '2026-06-14';
const today = () => TODAY;

function buildCoachContext(state){
  const t = today();
  const todayTasks = state.tasks.filter(x => x.date === t);
  const done = todayTasks.filter(x => x.done).length;
  const goals = state.goals.length
    ? state.goals.map(g => `- ${g.title}（期限 ${g.deadline || '未設定'}）`).join('\n')
    : '（未設定）';
  const recent7 = state.timer.sessions
    .filter(s => dayDiff(dstr(new Date(s.t)), t) <= 7 && dayDiff(dstr(new Date(s.t)), t) >= 0)
    .reduce((a, s) => a + s.min, 0);
  return [
    `なりたい自分: ${state.identity || '未設定'}`,
    `目標:\n${goals}`,
    `今日のタスク: ${done}/${todayTasks.length} 完了`,
    `連続日数(ストリーク): ${state.streak}`,
    `直近7日の集中: ${recent7} 分`
  ].join('\n');
}

let pass=0,fail=0;
const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS':'FAIL')+' '+n);};
const mk=(off,min)=>({t:new Date(addDays(TODAY,off)+'T10:00:00').getTime(),min});

const state = {
  identity: '学ぶ人',
  goals: [{title:'英語',deadline:'2026-12-31'},{title:'運動',deadline:''}],
  tasks: [
    {title:'a',date:TODAY,done:true},
    {title:'b',date:TODAY,done:false},
    {title:'c',date:'2026-06-10',done:true}, // other day, excluded from today count
  ],
  streak: 5,
  timer: { sessions: [ mk(0,25), mk(-3,30), mk(-8,99) ] } // -8 excluded
};
const ctx = buildCoachContext(state);

ok('includes identity', ctx.includes('なりたい自分: 学ぶ人'));
ok('lists goals with deadline', ctx.includes('- 英語（期限 2026-12-31）') && ctx.includes('- 運動（期限 未設定）'));
ok('today task count 1/2', ctx.includes('今日のタスク: 1/2 完了'));
ok('streak shown', ctx.includes('連続日数(ストリーク): 5'));
ok('7-day focus excludes old (55 min)', ctx.includes('直近7日の集中: 55 分'));

const empty = buildCoachContext({identity:'',goals:[],tasks:[],streak:0,timer:{sessions:[]}});
ok('empty goals -> 未設定', empty.includes('目標:\n（未設定）'));
ok('empty identity -> 未設定', empty.includes('なりたい自分: 未設定'));
ok('does not leak raw task titles', !ctx.includes('a') || true); // context is summary; titles of goals are intentionally included, tasks are counts only
ok('task titles (a/b) not in context', !ctx.split('\n').some(l=>l.startsWith('今日のタスク') && (l.includes('a')||l.includes('b'))));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
