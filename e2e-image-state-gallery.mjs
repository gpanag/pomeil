/**
 * E2E Image-State Gallery — layer (b) of the image audit.
 *
 * For every escape room, drives the universal image states and:
 *   1. captures a screenshot of each state (intro, main, per-character hover,
 *      per-character talking, per-character AFTER-talk, item hovers)
 *   2. records currentBackgroundUrl + the hover crossfade CSS vars at each state
 *   3. ASSERTS, for EACH character, that the background reverts to a non-"talking"
 *      image after the dialogue is dismissed (the stuck-close-up bug, checked
 *      per-character — the older bg-check only covered the first character)
 *   4. ASSERTS hover sets a hover image and leaving clears it
 *
 * Screenshots → image-audit/<room>/NN-*.png ; per-room JSON → image-audit/<room>/summary.json
 *
 * Run:    node e2e-image-state-gallery.mjs [room-id]
 * Requires: ng serve on localhost:4200 (dev mode for window.ng)
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const BASE = 'http://localhost:4200';
const ONE = process.argv[2] || null;

const ROOMS = [
  'cultural-awareness','empathy','strategic-thinking','open-mindedness','financial',
  'stress-management','trust-building','active-listening','adaptability','flexibility',
  'interpersonal-skills','language-skills','market-awareness','legal-compliance','self-reliance',
  'resilience','teamwork','motivating-others','tolerance','leadership','decision-making','crm',
  'business-planning','critical-thinking','digital-skills','negotiation-skills','networking-skills',
  'risk-management','problem-solving','project-management',
];

const findCompSrc = `
function findComp(el){ if(!el) return null;
  try{ const c=window.ng.getComponent(el); if(c && typeof c.onHotspotClick==='function') return c; }catch{}
  for(const ch of el.children){ const r=findComp(ch); if(r) return r; } return null; }`;

async function snap(page) {
  return page.evaluate(`(()=>{ ${findCompSrc}
    const c=findComp(document.body); if(!c) return null;
    const cs=getComputedStyle(document.documentElement);
    const v=n=>cs.getPropertyValue(n).trim();
    const pick=(a,b)=>{ const oa=parseFloat(v(a))||0, ob=parseFloat(v(b))||0; return oa>=ob?v('--scene-hover-bg-a'):v('--scene-hover-bg-b'); };
    return {
      bg:(c.currentBackgroundUrl||'').split('/').pop().split('?')[0],
      view:c.currentView||'main',
      hasDialogue:!!c.activeDialogue,
      isQuiz:!!c.isQuizActive,
      hoverOpacity:Math.max(parseFloat(v('--scene-hover-opacity-a'))||0, parseFloat(v('--scene-hover-opacity-b'))||0),
      hoverBg:(pick('--scene-hover-opacity-a','--scene-hover-opacity-b').match(/[^/]+\\.(png|jpe?g|webp)/)||[''])[0],
    }; })()`);
}
async function dismissAll(page, max = 25) {
  for (let i = 0; i < max; i++) {
    const s = await snap(page);
    if (!s?.hasDialogue) break;
    const panel = page.locator('.dialogue-panel');
    if (await panel.isVisible({ timeout: 800 }).catch(() => false)) {
      await panel.click({ force: true }).catch(() => {});
      await page.waitForTimeout(250);
      const btn = page.locator('.dialogue-actions button');
      if (await btn.isVisible({ timeout: 800 }).catch(() => false)) { await btn.click({ force: true }).catch(() => {}); }
    } else break;
    await page.waitForTimeout(350);
  }
}
const isTalkBg = (bg) => /talking|_talk\.|Talking|closeup|close_up|close-up/.test(bg || '');

async function auditRoom(browser, roomId) {
  const dir = `image-audit/${roomId}`;
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  await ctx.addInitScript(() => { try {
    localStorage.setItem('pomeil_player_name', 'TestPlayer'); localStorage.setItem('lang', 'en');
    localStorage.setItem('language', 'en'); sessionStorage.setItem('pomeil_login_warning_dismissed', 'true');
  } catch {} });
  const page = await ctx.newPage();
  const img404 = new Set();
  page.on('response', r => { try { const u = r.url(); if (r.status() >= 400 && /\/assets\//.test(u) && /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u)) img404.add(u.split('/').pop().split('?')[0] + ' (' + r.status() + ')'); } catch {} });

  const out = { room: roomId, states: [], characters: [], anomalies: [], img404: [] };
  let n = 0;
  const shot = async (label) => { n++; const f = `${dir}/${String(n).padStart(2,'0')}-${label}.png`; await page.screenshot({ path: f }).catch(()=>{}); const s = await snap(page); out.states.push({ label, ...s }); return s; };

  try {
    await page.goto(`${BASE}/escape-rooms/${roomId}`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1800);
    if (!await page.evaluate(() => typeof window.ng?.getComponent === 'function')) throw new Error('window.ng unavailable');

    await shot('intro');
    // close intro
    const introBtn = page.locator('mat-card-actions button').first();
    if (await introBtn.isVisible({ timeout: 5000 }).catch(() => false)) { await introBtn.click(); await page.waitForTimeout(1000); }
    await dismissAll(page);
    const main = await shot('main');
    if (main && isTalkBg(main.bg)) out.anomalies.push(`main view shows a talking/close-up bg: ${main.bg}`);

    // enumerate character hotspots present at main view
    const charCount = await page.locator('.character-hotspot').count();
    const cRecs = Array.from({ length: charCount }, (_, i) => ({ index: i }));

    // Phase A — hover affordance, measured for ALL characters at the SAME fresh
    // main-view state, BEFORE any dialogue advances the game. Measuring a
    // character's hover right after a prior character's talk cycle gives false
    // misses: canInteractWithCharacter() is briefly false during that transition.
    for (let i = 0; i < charCount; i++) {
      const loc = page.locator('.character-hotspot').nth(i);
      if (!await loc.isVisible().catch(() => false)) continue;
      await loc.hover({ force: true }).catch(() => {});
      await page.waitForTimeout(600);
      const hov = await shot(`char${i}-hover`);
      cRecs[i].hoverBg = hov?.hoverBg || ''; cRecs[i].hoverOpacity = hov?.hoverOpacity || 0;
      if (!hov?.hoverOpacity) out.anomalies.push(`char#${i}: hover set no visible hover image`);
      await page.mouse.move(5, 5); await page.waitForTimeout(450);
      const left = await snap(page);
      if (left?.hoverOpacity > 0.01) out.anomalies.push(`char#${i}: hover image did NOT clear on leave (opacity ${left.hoverOpacity})`);
    }

    // Phase B — per character: talk, then assert the background reverts to a
    // non-"talking" image (the stuck close-up bug). Run after the hover sweep so
    // talking can't confound the hover measurement.
    for (let i = 0; i < charCount; i++) {
      const loc = page.locator('.character-hotspot').nth(i);
      if (!await loc.isVisible().catch(() => false)) { out.characters.push(cRecs[i]); continue; }
      await loc.click({ force: true }).catch(() => {});
      await page.waitForTimeout(900);
      const talk = await shot(`char${i}-talking`);
      cRecs[i].talkBg = talk?.bg || ''; cRecs[i].talked = !!talk?.hasDialogue || isTalkBg(talk?.bg);
      await dismissAll(page);
      await page.waitForTimeout(700);
      const after = await shot(`char${i}-after`);
      cRecs[i].afterBg = after?.bg || '';
      cRecs[i].reverted = !!after && after.view === 'main' && !after.hasDialogue && !isTalkBg(after.bg);
      if (after && after.view === 'main' && !after.hasDialogue && !after.isQuiz && isTalkBg(after.bg))
        out.anomalies.push(`STUCK-BG after talking to char#${i}: '${after.bg}' (main view, no dialogue)`);
      out.characters.push(cRecs[i]);
    }

    // a couple of item-hotspot hovers (item hover images)
    const itemCount = Math.min(3, await page.locator('.hotspot:not(.character-hotspot)').count());
    for (let i = 0; i < itemCount; i++) {
      const loc = page.locator('.hotspot:not(.character-hotspot)').nth(i);
      if (!await loc.isVisible().catch(() => false)) continue;
      await loc.hover({ force: true }).catch(() => {});
      await page.waitForTimeout(500);
      await shot(`item${i}-hover`);
      await page.mouse.move(5, 5); await page.waitForTimeout(300);
    }
  } catch (e) {
    out.anomalies.push(`ERROR: ${e.message}`);
  }
  out.img404 = [...img404];
  writeFileSync(`${dir}/summary.json`, JSON.stringify(out, null, 2));
  await ctx.close();
  return out;
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const rooms = ONE ? [ONE] : ROOMS;
  const report = [];
  for (const r of rooms) {
    process.stdout.write(`\n══ ${r} … `);
    const o = await auditRoom(browser, r);
    const chars = o.characters.length;
    const reverted = o.characters.filter(c => c.reverted).length;
    const flag = o.anomalies.length || o.img404.length;
    console.log(`${chars} char(s), ${reverted}/${chars} reverted${o.img404.length ? `, 🖼 404:${o.img404.length}` : ''}${o.anomalies.length ? `, ⚠ ${o.anomalies.length} anomaly` : '  ✅'}`);
    o.anomalies.forEach(a => console.log(`     ⚠ ${a}`));
    o.img404.forEach(a => console.log(`     🖼 ${a}`));
    report.push({ room: r, chars, reverted, anomalies: o.anomalies, img404: o.img404 });
  }
  await browser.close();
  writeFileSync('image-audit/REPORT.json', JSON.stringify(report, null, 2));
  const bad = report.filter(r => r.anomalies.length || r.img404.length);
  console.log(`\n${'═'.repeat(50)}\nGALLERY DONE: ${report.length} rooms, ${bad.length} with anomalies/404s`);
  bad.forEach(b => console.log(`  ${b.room}: ${[...b.anomalies, ...b.img404.map(x=>'404:'+x)].join('; ')}`));
})();
