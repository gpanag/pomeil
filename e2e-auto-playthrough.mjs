/**
 * Generic auto-player for ALL escape rooms — drives each room with REAL DOM
 * clicks (intro, dialogues, hotspots, skip buttons, puzzle answers) and reads
 * state via the Angular debug API (window.ng). Unlike e2e-all-rooms-playthrough
 * (which calls onHotspotClick() directly), this clicks the actual DOM elements,
 * so it also catches hotspots that aren't clickable for a real user.
 *
 * It does not need per-room scripts: each round it dismisses dialogues, skips or
 * brute-forces (3-attempt reveal) any active puzzle, else clicks every visible
 * hotspot until the game state advances. Passes when the completion overlay shows.
 *
 * Run:  node e2e-auto-playthrough.mjs            (all rooms)
 *       node e2e-auto-playthrough.mjs financial  (one room)
 * Requires: ng serve on :4200 (dev mode for window.ng).
 */
import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const ALL = [
  'cultural-awareness','empathy','strategic-thinking','open-mindedness','financial','stress-management',
  'trust-building','active-listening','adaptability','flexibility','interpersonal-skills','language-skills',
  'market-awareness','legal-compliance','self-reliance','resilience','teamwork','motivating-others',
  'tolerance','leadership','decision-making','crm','business-planning','critical-thinking','digital-skills',
  'negotiation-skills','networking-skills','risk-management','problem-solving','project-management'
];
const ROOMS = process.argv[2] ? [process.argv[2]] : ALL;
const MAX_ITERS = 140;
const PER_ROOM_MS = 160000;

async function state(page){
  return page.evaluate(()=>{
    function findComp(el){ if(!el) return null; try{ const c=window.ng.getComponent(el); if(c && typeof c.onHotspotClick==='function') return c; }catch(e){} for(const ch of (el.children||[])){ const r=findComp(ch); if(r) return r;} return null; }
    const comp = findComp(document.body); if(!comp) return null;
    let sn=null; if(comp.GameState){ for(const [k,v] of Object.entries(comp.GameState)){ if(v===comp.currentState && isNaN(Number(k))){ sn=k; break; } } }
    // Generic item-popup detection: any room flag like isStickyNoteVisible / isPaperVisible
    // that is currently true (excluding the structural intro/completion flags).
    let popup=false, popupKey=null;
    try { for(const k of Object.keys(comp)){ if(/Visible$/.test(k) && comp[k]===true && k!=='isIntroPopupVisible' && k!=='isGameCompleteOverlayVisible'){ popup=true; popupKey=k; break; } } } catch(e){}
    return { sn, view: comp.currentView||'main', complete: !!comp.isGameCompleteOverlayVisible,
             dialogue: !!comp.activeDialogue, quiz: !!comp.isQuizActive, animating: !!comp.isAnimating,
             preloading: !!comp.isPreloading, intro: !!comp.isIntroPopupVisible, answer: !!comp.showAnswerOverlay,
             skipConfirm: !!comp.showSkipConfirm, door: !!comp.isDoorOpen, popup, popupKey };
  });
}
const sig = s => s ? `${s.sn}|${s.view}|${s.dialogue}|${s.quiz}|${s.answer}|${s.popup}|${s.complete}` : 'null';

async function vis(page, sel, t=300){ return page.locator(sel).first().isVisible({timeout:t}).catch(()=>false); }
async function clickIf(page, sel, t=300){ const l=page.locator(sel).first(); if(await l.isVisible({timeout:t}).catch(()=>false)){ await l.click({force:true,timeout:2500}).catch(()=>{}); return true; } return false; }

const results = {};
let browser;
try {
  browser = await chromium.launch({ headless: true, args:['--no-sandbox'] });
  for (const room of ROOMS){
    const ctx = await browser.newContext({ viewport:{width:1400,height:900} });
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('pomeil_player_name','TestPlayer'); sessionStorage.setItem('pomeil_login_warning_dismissed','true'); }catch(e){} });
    const page = await ctx.newPage();
    const errors=[];
    page.on('console', m=>{ if(m.type()==='error'){ const t=m.text(); if(!/audio|Audio|play\(\)|NotAllowed|favicon|404|Failed to load resource|\.wav|\.mp3|\.png|\.jpg/i.test(t)) errors.push(t.slice(0,160)); } });
    page.on('pageerror', e=>errors.push('PAGE: '+e.message.slice(0,160)));
    const deadline = Date.now()+PER_ROOM_MS;
    let result='STUCK', lastSn='?';
    try {
      console.log(`\n=== ${room} ===`);
      await page.goto(`${BASE}/escape-rooms/${room}`, {waitUntil:'domcontentloaded', timeout:30000});
      await page.waitForTimeout(1600);
      const ng = await page.evaluate(()=>typeof window.ng?.getComponent==='function');
      if(!ng) throw new Error('window.ng unavailable');
      await clickIf(page, '.intro-popup-card button', 6000) || await clickIf(page, 'mat-card-actions button', 3000);
      await page.waitForTimeout(900);
      let stuck=0, prevM='';
      const msig = s => s ? `${s.sn}|${s.view}|${s.popup}|${s.complete}` : 'null'; // DURABLE state (ignores transient dialogue/quiz toggles)
      const dismissDialogues = async (max=14) => { for(let d=0; d<max; d++){ if(!(await state(page))?.dialogue) break; await clickIf(page,'.dialogue-panel',400); await page.waitForTimeout(170); await clickIf(page,'.dialogue-actions button',400); await page.waitForTimeout(210); } };
      for(let i=0;i<MAX_ITERS && Date.now()<deadline;i++){
        const s = await state(page);
        if(s) lastSn = s.sn;
        if(process.env.DBG) console.log(`  [${i}] ${s?.sn}|v:${s?.view}|d:${s?.dialogue?1:0}|q:${s?.quiz?1:0}|p:${s?.popup?1:0}|a:${s?.answer?1:0}|anim:${s?.animating?1:0} stuck=${stuck}`);
        if(s?.complete){ result='PASS'; break; }
        if(s?.animating || s?.preloading){ await page.waitForTimeout(550); continue; }
        if(s?.dialogue){
          await dismissDialogues();
        } else if(s?.skipConfirm){
          await clickIf(page,'.skip-confirm-card button[color="warn"]',500) || await clickIf(page,'.skip-confirm-card button:last-child',500);
        } else if(s?.answer){
          await clickIf(page,'.overlay.center button',500) || await clickIf(page,'.answer-overlay button',500);
        } else if(s?.popup){
          // item popup (sticky note / paper / document / folder …) — click to close
          await clickIf(page,'.overlay.center',600) || await clickIf(page,'.paper-popup',400) || await clickIf(page,'.item-popup-base',400) || await clickIf(page,'.sticky-note-popup',400);
        } else if(s?.quiz || await vis(page,'.skip-puzzle-btn',250) || await vis(page,'.quiz-card',250)){
          if(await clickIf(page,'.skip-puzzle-btn',400)){
            await page.waitForTimeout(250);
            await clickIf(page,'.skip-confirm-card button[color="warn"]',600) || await clickIf(page,'.skip-confirm-card button:last-child',600);
          } else {
            // No skip button — exercise the puzzle UI; wrong answers trigger the 3-attempt reveal which advances.
            const btns = page.locator('.quiz-card button:not(.skip-puzzle-btn), .options-vertical button, .matching-layout button, .sequence-box.options button, .word-bank button, .quiz-card button[color="primary"]');
            const n = await btns.count().catch(()=>0);
            for(let k=0;k<Math.min(n,10);k++){ await btns.nth(k).click({force:true,timeout:1200}).catch(()=>{}); await page.waitForTimeout(140); if(await vis(page,'.overlay.center button',150)){ await clickIf(page,'.overlay.center button',300); break; } }
          }
        } else {
          // Probe EVERY visible hotspot, dismissing decoy "nothing here" dialogues,
          // and stop only when DURABLE state advances (so a decoy click can't masquerade as progress).
          const before = msig(s);
          let advanced=false;
          for(const sel of ['.zoom-hotspot','.character-hotspot','.hotspot']){
            const loc=page.locator(sel); const n=await loc.count().catch(()=>0);
            for(let k=0;k<n;k++){
              const el=loc.nth(k);
              const viz=await el.isVisible({timeout:150}).catch(()=>false);
              if(process.env.DBG) console.log(`      probe ${sel}[${k}] visible=${viz}`);
              if(!viz) continue;
              await el.click({force:true,timeout:1200}).catch(()=>{});
              await page.waitForTimeout(280);
              for(let w=0; w<7; w++){ const a=await state(page); if(!a?.animating) break; await page.waitForTimeout(400); }
              let ns=await state(page);
              if(ns?.dialogue){ await dismissDialogues(8); ns=await state(page); }
              if(process.env.DBG) console.log(`        -> ${msig(ns)} (before ${before})`);
              if(ns?.complete || ns?.popup || msig(ns)!==before){ advanced=true; break; }
            }
            if(advanced) break;
          }
          if(!advanced && s?.view!=='main'){ await clickIf(page,'.back-button',500); }
        }
        const m2 = msig(await state(page));
        if(m2===prevM) stuck++; else stuck=0;
        prevM=m2;
        if(stuck>=6){ result='STUCK'; break; }
      }
    } catch(e){ result='ERROR: '+e.message; }
    const fin = await state(page).catch(()=>null);
    if(result==='PASS') console.log(`  PASS  (${room})`);
    else { console.log(`  ${result}  (${room}) lastState=${lastSn} view=${fin?.view} door=${fin?.door}`);
           await page.screenshot({path:`/tmp/auto-${room}.png`}).catch(()=>{}); }
    if(errors.length) console.log(`  console errors: ${[...new Set(errors)].slice(0,3).join(' | ')}`);
    results[room] = { result, lastSn: fin?.sn||lastSn, errors:[...new Set(errors)] };
    await ctx.close();
  }
  console.log(`\n========== SUMMARY ==========`);
  let pass=0, fail=0;
  for(const [r,o] of Object.entries(results)){
    const ok = o.result==='PASS'; if(ok) pass++; else fail++;
    console.log(`  ${ok?'✓':'✗'} ${r.padEnd(22)} ${ok?'':o.result+' @'+o.lastSn}${o.errors.length?'  [ERR:'+o.errors.length+']':''}`);
  }
  console.log(`\n  ${pass} passed, ${fail} failed / ${ROOMS.length}`);
  process.exit(fail>0?1:0);
} catch(e){ console.error('FATAL', e); process.exit(2); }
finally { if(browser) await browser.close(); }
