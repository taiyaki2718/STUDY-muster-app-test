/* Regression test for Pro entitlement pure logic.
   Run: node tests/pro.test.mjs
   NOTE: mirrors isProActive / interpretLicense / effectiveAccent in index.html. */
function isProActive(p){ return !!(p && p.active); }
function effectiveAccent(pro, accent){ return isProActive(pro) ? (accent || 'cyan') : 'cyan'; }
function interpretLicense(j){
  const status = j && j.license_key && j.license_key.status;
  return !!(j && j.valid) && (!status || status === 'active');
}
let pass=0,fail=0; const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS':'FAIL')+' '+n);};

// isProActive
ok('null -> not pro', isProActive(null)===false);
ok('active:true -> pro', isProActive({active:true})===true);
ok('active:false -> not pro', isProActive({active:false})===false);

// interpretLicense (Lemon Squeezy shape)
ok('valid+active -> ok', interpretLicense({valid:true, license_key:{status:'active'}})===true);
ok('valid no status -> ok', interpretLicense({valid:true})===true);
ok('valid+expired -> no', interpretLicense({valid:true, license_key:{status:'expired'}})===false);
ok('valid+disabled -> no', interpretLicense({valid:true, license_key:{status:'disabled'}})===false);
ok('valid:false -> no', interpretLicense({valid:false})===false);
ok('empty -> no', interpretLicense({})===false);

// effectiveAccent (free users locked to cyan)
ok('pro + amber -> amber', effectiveAccent({active:true},'amber')==='amber');
ok('pro + undefined -> cyan', effectiveAccent({active:true},undefined)==='cyan');
ok('free + amber -> cyan (locked)', effectiveAccent(null,'amber')==='cyan');
ok('free + undefined -> cyan', effectiveAccent(null,undefined)==='cyan');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
