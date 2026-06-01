/**
 * Stuck-background detector for ALL 30 rooms.
 *
 * The bug: clicking a character sets the scene background to a "*_talking"
 * close-up; if a dialogue-dismiss transition forgets updateBackground(), the
 * close-up stays stuck over the scene during the exploration phase ("the base
 * image switches to a close view of <character>"). The skip-harness never
 * checked the background, so this hid in many rooms.
 *
 * Strategy per room: close intro, dismiss the auto/first character dialogue
 * chain(s), then — whenever there is NO dialogue and we are in the main view —
 * assert the background is NOT a "*_talking" image. Also explicitly talk to each
 * character once and re-check after the chain ends.
 *
 * Run: node e2e-bg-check.mjs [room]
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
const TALKING = /(_talking|talking|quiz)\.(png|jpe?g|webp)/i; // a character close-up / quiz portrait used as scene bg

async function state(page){
  return page.evaluate(()=>{
    function findComp(el){ if(!el) return null; try{ const c=window.ng.getComponent(el); if(c && typeof c.onHotspotClick==='function') return c; }catch(e){} for(const ch of (el.children||[])){ const r=findComp(ch); if(r) return r;} return null; }
    const comp = findComp(document.body); if(!comp) return null;
    return { dlg: !!comp.activeDialogue, bg: comp.currentBackgroundUrl||'', view: comp.currentView||'main',
             anim: !!comp.isAnimating, quiz: !!comp.isQuizActive, mainView: comp.isMainViewActive!==false,
             complete: !!comp.isGameCompleteOverlayVisible };
  });
}
const isStuck = s => s && !s.dlg && !s.quiz && s.view==='main' && TALKING.test(s.bg);
async function vis(page,sel,t=300){ return page.locator(sel).first().isVisible({timeout:t}).catch(()=>false); }
async function click(page,sel,t=400){ const l=page.locator(sel).first(); if(await l.isVisible({timeout:t}).catch(()=>false)){ await l.click({force:true,timeout:2500}).catch(()=>{}); return true;} return false; }

async function settle(page){ for(let i=0;i<8;i++){ const s=await state(page); if(!s?.anim) break; await page.waitForTimeout(400);} }
async function dismissChain(page, max=24){
  for(let i=0;i<max;i++){
    await settle(page);
    const s = await state(page);
    if(!s?.dlg) break;
    await click(page,'.dialogue-panel',400); await page.waitForTimeout(200);
    await click(page,'.dialogue-actions button',400); await page.waitForTimeout(220);
  }
}

const results = {};
let browser;
try {
  browser = await chromium.launch({ headless:true, args:['--no-sandbox'] });
  for(const room of ROOMS){
    const ctx = await browser.newContext({ viewport:{width:1400,height:900} });
    await ctx.addInitScript(()=>{ try{ localStorage.setItem('pomeil_player_name','TestPlayer'); sessionStorage.setItem('pomeil_login_warning_dismissed','true'); }catch(e){} });
    const page = await ctx.newPage();
    let verdict='OK', detail='';
    try {
      await page.goto(`${BASE}/escape-rooms/${room}`, {waitUntil:'domcontentloaded', timeout:30000});
      await page.waitForTimeout(1500);
      await click(page,'.intro-popup-card button',6000) || await click(page,'mat-card-actions button',3000);
      await page.waitForTimeout(700);
      const stuckAt = [];
      // 1) auto-intro chain
      await dismissChain(page);
      let s = await state(page);
      if(isStuck(s)) stuckAt.push(`after-intro:${s.bg.split('/').pop()}`);
      // 2) explicitly talk to each character hotspot, re-check after each chain
      const charN = await page.locator('.hotspot-layer .character-hotspot').count().catch(()=>0);
      for(let ci=0; ci<Math.min(charN,3); ci++){
        const c = page.locator('.hotspot-layer .character-hotspot').nth(ci);
        if(!await c.isVisible({timeout:300}).catch(()=>false)) continue;
        await c.click({force:true,timeout:2000}).catch(()=>{});
        await page.waitForTimeout(300);
        await dismissChain(page);
        s = await state(page);
        if(isStuck(s)){ stuckAt.push(`after-char${ci}:${s.bg.split('/').pop()}`); }
      }
      if(stuckAt.length){ verdict='STUCK-BG'; detail = stuckAt.join(' | '); }
      else { detail = `bg=${(await state(page))?.bg.split('/').pop()}`; }
    } catch(e){ verdict='ERROR'; detail=e.message.slice(0,80); }
    const icon = verdict==='OK'?'✓':(verdict==='ERROR'?'?':'✗');
    console.log(`  ${icon} ${room.padEnd(22)} ${verdict==='OK'?'':verdict+'  '}${detail}`);
    results[room]={verdict,detail};
    await ctx.close();
  }
  const stuck = Object.entries(results).filter(([,r])=>r.verdict==='STUCK-BG');
  console.log(`\n===== ${stuck.length} room(s) with STUCK character background =====`);
  stuck.forEach(([r,o])=>console.log(`  ✗ ${r}: ${o.detail}`));
  process.exit(stuck.length?1:0);
} catch(e){ console.error('FATAL',e); process.exit(2); }
finally { if(browser) await browser.close(); }
