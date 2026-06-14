const pad = n => String(n).padStart(2,'0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const addDays = (ds,n)=>{const d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return dstr(d);};
const today = () => '2026-06-14';
const dnames=['日','月','火','水','木','金','土'];

function last7(sessions){
  const days=[];
  for(let i=6;i>=0;i--){
    const ds=addDays(today(),-i);
    const min=sessions.filter(s=>dstr(new Date(s.t))===ds).reduce((a,s)=>a+s.min,0);
    const dow=dnames[new Date(ds+'T00:00:00').getDay()];
    days.push({ds,min,dow,isToday:ds===today()});
  }
  return days;
}

// build sessions: 25 min today, 50 min 3 days ago, one outside window (8 days ago)
const mk = (dayOffset,min)=>({t:new Date(addDays(today(),dayOffset)+'T10:00:00').getTime(),min});
const sessions=[mk(0,25), mk(0,10), mk(-3,50), mk(-8,99)];
const days=last7(sessions);
let pass=0,fail=0;
const chk=(n,g,e)=>{const ok=JSON.stringify(g)===JSON.stringify(e);ok?pass++:fail++;console.log((ok?'PASS':'FAIL')+' '+n+' => '+JSON.stringify(g)+(ok?'':' exp '+JSON.stringify(e)));};

chk('7 days returned', days.length, 7);
chk('today sums 25+10', days[6].min, 35);
chk('today flagged', days[6].isToday, true);
chk('3 days ago = 50', days[3].min, 50);
chk('out-of-window excluded (total=85)', days.reduce((a,d)=>a+d.min,0), 85);
chk('first day label is correct dow', days[0].dow, dnames[new Date(addDays(today(),-6)+'T00:00:00').getDay()]);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
