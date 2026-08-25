/**
 * E2E Dialogue/Popup Sweep — find "broken dialogues like the TV reviews".
 *
 * For every room: open each popup/overlay the component exposes (boolean flags
 * matching /popup|overlay/i) one at a time and check for:
 *   - console errors / uncaught exceptions (RangeError, TypeError, "Invalid array
 *     length", "Cannot read" — the TV bug threw a RangeError during render)
 *   - visible text that is a raw i18n key (dot.path.like.this) = missing translation
 *
 * Run: node e2e-dialogue-sweep.mjs [room-id]
 * Requires: ng serve on :4200 (dev mode).
 */
import { chromium } from 'playwright';
const BASE = 'http://localhost:4200';
const ONE = process.argv[2] || null;
const ROOMS = ['cultural-awareness','empathy','strategic-thinking','open-mindedness','financial',
  'stress-management','trust-building','active-listening','adaptability','flexibility',
  'interpersonal-skills','language-skills','market-awareness','legal-compliance','self-reliance',
  'resilience','teamwork','motivating-others','tolerance','leadership','decision-making','crm',
  'business-planning','critical-thinking','digital-skills','negotiation-skills','networking-skills',
  'risk-management','problem-solving','project-management'];

const findCompSrc = `function findComp(el){ if(!el) return null;
  try{ const c=window.ng.getComponent(el); if(c && typeof c.onHotspotClick==='function') return {c,el}; }catch{}
  for(const ch of el.children){ const r=findComp(ch); if(r) return r; } return null; }`;
// raw i18n key: 3+ dot-segments of word-ish chars (e.g. puzzles.quiz.title, reviews.items.0.rating)
const RAWKEY = String.raw`\b[a-z][a-zA-Z]*(?:\.[a-zA-Z0-9_]+){2,}\b`;

function relevant(t){
  return /RangeError|TypeError|Invalid array length|Cannot read|is not a function|NG0|ExpressionChanged/.test(t)
    && !/audio|\.wav|\.mp3|favicon|ResizeObserver/i.test(t);
}

const b = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const report = [];
for (const room of (ONE ? [ONE] : ROOMS)) {
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(()=>{ try{ localStorage.setItem('pomeil_player_name','TestPlayer'); localStorage.setItem('lang','en'); sessionStorage.setItem('pomeil_login_warning_dismissed','true'); }catch{} });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type()==='error' && relevant(m.text())) errors.push(m.text().slice(0,160)); });
  p.on('pageerror', e => { if (relevant(e.message)) errors.push('PAGEERROR: '+e.message.slice(0,160)); });
  const out = { room, popups: [], errors: [], rawKeys: [] };
  try {
    await p.goto(`${BASE}/escape-rooms/${room}`, { waitUntil:'domcontentloaded', timeout:30000 });
    await p.waitForTimeout(2800);
    // enumerate popup/overlay flags + open each, capturing errors + raw-key text
    const result = await p.evaluate(async ({findSrc, rawKeyRe}) => {
      eval(findSrc);
      const r = findComp(document.body); if(!r) return {error:'no comp'};
      const { c, el } = r;
      const zone = c.ngZone || c.zone; const run = (zone&&zone.run)?zone.run.bind(zone):(f)=>f();
      run(()=>{ if('isIntroPopupVisible' in c) c.isIntroPopupVisible=false; c.activeDialogue=null; if('isAnimating' in c) c.isAnimating=false; });
      const flags = Object.keys(c).filter(k => typeof c[k]==='boolean'
        && /popup|overlay/i.test(k)
        && !/intro|preload|gamecomplete|fullscreen|skipconfirm/i.test(k));
      const opened = []; const rawKeys = new Set();
      const re = new RegExp(rawKeyRe, 'g');
      for (const f of flags) {
        run(()=>{
          // set any paging index to 0 so the popup has content to render
          for (const k of Object.keys(c)) { if (/index/i.test(k) && typeof c[k]==='number') c[k]=0; }
          c[f] = true;
        });
        try{ c.cdr && c.cdr.detectChanges(); }catch(e){}
        try{ window.ng.applyChanges(el); }catch(e){}
        await new Promise(r=>setTimeout(r,150));
        opened.push(f);
        // scan visible overlay/popup/dialogue text for raw keys
        const nodes = document.querySelectorAll('.overlay, .quiz-card, .dialogue-panel, [class*="popup"], [class*="Popup"], mat-card');
        for (const n of nodes) {
          if (n.offsetParent === null) continue; // not visible
          const txt = (n.innerText||'');
          const m = txt.match(re);
          if (m) m.forEach(x=>{ if(!/^\d/.test(x)) rawKeys.add(x); });
        }
        run(()=>{ c[f] = false; });
        try{ c.cdr && c.cdr.detectChanges(); }catch(e){}
      }
      // ALSO render each puzzle/quiz GameState and scan the quiz card for raw keys
      // (these aren't popup flags — the standard puzzle UIs key off currentState).
      const origState = c.currentState;
      if (c.GameState) {
        for (const [k,v] of Object.entries(c.GameState)) {
          if (isNaN(Number(k)) && /puzzle|quiz|matching|sequence|gap|pattern|order|question/i.test(k)) {
            run(()=>{ c.currentState = v; c.activeDialogue = null;
              for (const kk of Object.keys(c)) { if (/index/i.test(kk) && typeof c[kk]==='number') c[kk]=0; } });
            try{ c.cdr && c.cdr.detectChanges(); }catch(e){}
            try{ window.ng.applyChanges(el); }catch(e){}
            await new Promise(r=>setTimeout(r,120));
            opened.push('state:'+k);
            const nodes = document.querySelectorAll('.quiz-card, .wide-card, .overlay, mat-card');
            for (const n of nodes){ if(n.offsetParent===null) continue; const m=(n.innerText||'').match(re); if(m) m.forEach(x=>{ if(!/^\d/.test(x)) rawKeys.add(x); }); }
          }
        }
        run(()=>{ c.currentState = origState; });
        try{ c.cdr && c.cdr.detectChanges(); }catch(e){}
      }
      return { flags, opened, rawKeys: [...rawKeys] };
    }, { findSrc: findCompSrc, rawKeyRe: RAWKEY });
    await p.waitForTimeout(200);
    out.popups = result.opened || [];
    out.rawKeys = result.rawKeys || [];
    out.errors = [...new Set(errors)];
    if (result.error) out.errors.push(result.error);
  } catch (e) {
    out.errors.push('SWEEP ERROR: ' + e.message);
  }
  const bad = out.errors.length || out.rawKeys.length;
  console.log(`${bad?'⚠️':'✅'} ${room.padEnd(20)} popups:[${out.popups.join(',')||'none'}]` +
    (out.errors.length?`  ERRORS(${out.errors.length})`:'') + (out.rawKeys.length?`  RAWKEYS:${out.rawKeys.slice(0,5).join('|')}`:''));
  out.errors.forEach(e=>console.log(`      ⛔ ${e}`));
  report.push(out);
  await ctx.close();
}
await b.close();
const flagged = report.filter(r=>r.errors.length||r.rawKeys.length);
console.log(`\n${'═'.repeat(50)}\nDIALOGUE SWEEP: ${report.length} rooms, ${flagged.length} flagged`);
flagged.forEach(r=>console.log(`  ${r.room}: ${r.errors.length} errors, ${r.rawKeys.length} raw keys`));
