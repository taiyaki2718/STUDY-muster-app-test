/* Regression test for the SSE streaming parser used by the AI coach chat.
   Run: node tests/coach_stream.test.mjs
   NOTE: mirrors the line-buffer / event-parse loop inside ClaudeAPI.callStream
   in index.html. Keep in sync. Verifies delta accumulation, chunk-boundary
   splits, ignored non-data lines, [DONE], malformed JSON, and error events. */

function makeSSEParser(onDelta) {
  let buffer = '', full = '';
  return {
    feed(chunk) {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let ev;
        try { ev = JSON.parse(payload); } catch (e) { continue; }
        if (ev.type === 'content_block_delta' && ev.delta && ev.delta.type === 'text_delta') {
          full += ev.delta.text;
          if (onDelta) onDelta(full);
        } else if (ev.type === 'error') {
          throw new Error((ev.error && ev.error.message) || 'stream error');
        }
      }
    },
    full: () => full
  };
}

const delta = t => `event: content_block_delta\ndata: ${JSON.stringify({type:'content_block_delta',index:0,delta:{type:'text_delta',text:t}})}\n\n`;

let pass=0,fail=0;
const ok=(n,c)=>{c?pass++:fail++;console.log((c?'PASS':'FAIL')+' '+n);};

// 1. basic accumulation, deltas fire in order
let seen=[];
let p=makeSSEParser(f=>seen.push(f));
p.feed(delta('こん'));
p.feed(delta('にちは'));
p.feed('data: [DONE]\n\n');
ok('accumulates full text', p.full()==='こんにちは');
ok('onDelta fired progressively', JSON.stringify(seen)===JSON.stringify(['こん','こんにちは']));

// 2. event split across chunk boundary (a data line arriving in two reads)
let p2=makeSSEParser();
const line = delta('split');
const cut = Math.floor(line.length/2);
p2.feed(line.slice(0,cut));
ok('partial line not yet parsed', p2.full()===''); // no newline completed mid-line for the data line
p2.feed(line.slice(cut));
ok('completes across boundary', p2.full()==='split');

// 3. message_start / content_block_start / ping etc. are ignored
let p3=makeSSEParser();
p3.feed('event: message_start\ndata: {"type":"message_start","message":{}}\n\n');
p3.feed('event: ping\ndata: {"type":"ping"}\n\n');
p3.feed(delta('x'));
ok('ignores non-text events', p3.full()==='x');

// 4. malformed JSON line is skipped, not fatal
let p4=makeSSEParser();
p4.feed('data: {not json}\n\n');
p4.feed(delta('ok'));
ok('skips malformed json', p4.full()==='ok');

// 5. error event throws
let threw=false;
try {
  const p5=makeSSEParser();
  p5.feed(delta('partial'));
  p5.feed('event: error\ndata: {"type":"error","error":{"message":"overloaded"}}\n\n');
} catch(e){ threw = e.message==='overloaded'; }
ok('error event throws with message', threw);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
