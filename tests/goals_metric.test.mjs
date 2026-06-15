/* Regression test for the goal metric (progress) logic in Goals:
   building a metric on save, and the +/- adjust clamping.
   Run: node tests/goals_metric.test.mjs
   NOTE: mirrors save()/adjust() in the Goals component in index.html. */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let _id=0; const uid=()=>'id'+(++_id);

// mirror of Goals.save() metric construction
function buildGoal(f){
  const goal = { id: f.id || uid(), title: (f.title||'').trim(), deadline: f.deadline };
  const target = parseInt(f.metricTarget, 10);
  if (f.metricOn && target > 0) {
    const done = clamp(parseInt(f.metricDone, 10) || 0, 0, target);
    goal.metric = { done, target, unit: (f.metricUnit || '').trim() };
  }
  return goal;
}
// mirror of Goals.adjust()
function adjust(metric, delta){ return clamp(metric.done + delta, 0, metric.target); }

let pass=0,fail=0;
const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS':'FAIL')+' '+n);};

// metric off -> no metric
ok('metric off omits metric', !('metric' in buildGoal({title:'g',deadline:'d',metricOn:false,metricTarget:'10',metricDone:0})));
// metric on with target
let g = buildGoal({title:'読書',deadline:'2026-12-31',metricOn:true,metricTarget:'30',metricUnit:' 冊 ',metricDone:'5'});
ok('metric built', g.metric && g.metric.target===30 && g.metric.done===5);
ok('unit trimmed', g.metric.unit==='冊');
// done clamped to target on save
ok('save clamps done > target', buildGoal({title:'g',metricOn:true,metricTarget:'10',metricDone:'99'}).metric.done===10);
ok('save clamps negative done', buildGoal({title:'g',metricOn:true,metricTarget:'10',metricDone:'-3'}).metric.done===0);
// target 0 or invalid -> no metric
ok('target 0 omits metric', !('metric' in buildGoal({title:'g',metricOn:true,metricTarget:'0',metricDone:'0'})));
ok('target NaN omits metric', !('metric' in buildGoal({title:'g',metricOn:true,metricTarget:'',metricDone:'0'})));
// adjust clamping
ok('adjust +1', adjust({done:4,target:10},1)===5);
ok('adjust does not exceed target', adjust({done:10,target:10},1)===10);
ok('adjust does not go below 0', adjust({done:0,target:10},-1)===0);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
