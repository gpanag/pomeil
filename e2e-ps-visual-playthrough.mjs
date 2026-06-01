import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.TEST_URL || 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/problem-solving`;
const OUT_DIR = '/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/e2e-screenshots/ps';

let passCount = 0;
let failCount = 0;
const errors = [];

function assert(name, cond, info = '') {
  if (cond) { console.log(`  ✓ ${name}`); passCount++; }
  else { console.log(`  ✗ ${name}${info ? ' → ' + info : ''}`); failCount++; errors.push(`${name}${info ? ': ' + info : ''}`); }
}

async function shot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
}

async function skipTyping(page) {
  await page.locator('.dialogue-panel').click({ force: true }).catch(() => {});
  await page.waitForTimeout(250);
}

async function clickContinue(page) {
  const btn = page.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
  try { await btn.waitFor({ state: 'visible', timeout: 5000 }); await btn.click({ force: true }); await page.waitForTimeout(400); } catch {}
}

async function waitForMainView(page) {
  await page.waitForTimeout(500);
  const zoomed = await page.evaluate(() => {
    const b = document.querySelector('.scene-background');
    const st = b && getComputedStyle(b).transform;
    return st && st !== 'none' && st !== 'matrix(1, 0, 0, 1, 0, 0)';
  });
  return !zoomed;
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomeil_player_name','TestPlayer'); sessionStorage.setItem('pomeil_login_warning_dismissed','true'); } catch(e){} });
  const page = await ctx.newPage();
  page.on('pageerror', err => { errors.push(`PAGE ERROR: ${err.message}`); failCount++; });
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`); });

  console.log('── Problem Solving visual playthrough ──');
  await page.goto(ROOM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await shot(page, '01_intro');

  await page.getByRole('button', { name: /Enter the Storage Room/i }).click();
  await page.waitForTimeout(600);
  await shot(page, '02_main_with_sticky_note');

  // Check visual sticky note is rendered
  const visualStickyCount = await page.locator('.visual-sticky-note').count();
  assert('Visual sticky note rendered in main view', visualStickyCount > 0);

  // Click sticky note
  await page.locator('.hotspot').first().click();
  await page.waitForTimeout(2800);
  await shot(page, '03_sticky_zoom');

  // Dialogue visible
  const dialog = await page.locator('.dialogue-panel .dialogue-text').textContent().catch(() => '');
  assert('Letter dialogue shown', (dialog || '').length > 10);

  // Advance through letter + thought
  await skipTyping(page); await clickContinue(page);
  await skipTyping(page); await clickContinue(page);
  await page.waitForTimeout(3000);
  await shot(page, '04_after_letter_clean_intro');

  // Dismiss clean intro
  await skipTyping(page); await clickContinue(page);
  await page.waitForTimeout(600);
  await shot(page, '05_cleanables_visible');

  const cleanCount = await page.locator('.hotspot.cleanable').count();
  assert(`5 cleanable items visible (got ${cleanCount})`, cleanCount === 5);

  // Click through cleanables
  for (let i = 0; i < cleanCount; i++) {
    const items = page.locator('.hotspot.cleanable:not(.cleaned)');
    if ((await items.count()) === 0) break;
    await items.first().click({ force: true });
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1500);
  await shot(page, '06_clean_done');

  await skipTyping(page); await clickContinue(page);
  await page.waitForTimeout(2500);
  await shot(page, '07_knut_arrived');

  // First dismiss the knut-arrival dialogue that triggered
  await skipTyping(page); await clickContinue(page);
  await page.waitForTimeout(600);
  const knutCount = await page.locator('.character-hotspot').count();
  assert('Knut character hotspot visible', knutCount > 0);

  // Knut hover test (now that dialog is dismissed, pointer-events are active)
  await page.locator('.character-hotspot').first().hover();
  await page.waitForTimeout(400);
  await shot(page, '08_knut_hover');

  // Click Knut
  await page.locator('.character-hotspot').first().click();
  await page.waitForTimeout(500);
  await shot(page, '09_knut_conversation');

  // Conversation loop
  for (let i = 0; i < 6; i++) {
    await skipTyping(page);
    const replyBtn = page.locator('.reply-btn');
    try {
      await replyBtn.waitFor({ state: 'visible', timeout: 3000 });
      await replyBtn.click({ force: true });
      await page.waitForTimeout(400);
      await skipTyping(page);
      const cont = page.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
      if (await cont.count()) { await cont.click({ force: true }); await page.waitForTimeout(500); }
    } catch { break; }
  }
  await page.waitForTimeout(1500);
  await shot(page, '10_investigate_intro');

  await skipTyping(page); await clickContinue(page);
  await page.waitForTimeout(800);
  await shot(page, '11_phase1_hotspots');

  const phase1Count = await page.locator('.hotspot').count();
  assert(`Phase 1: 5 hotspots visible (got ${phase1Count})`, phase1Count >= 5);

  // Helper: dismiss any open dialogue by waiting for Continue and clicking it
  async function dismissAnyDialogue(p, maxTries = 3) {
    for (let t = 0; t < maxTries; t++) {
      const panel = p.locator('.dialogue-panel');
      if ((await panel.count()) === 0) return;
      // Skip typewriter
      await panel.click({ force: true }).catch(() => {});
      await p.waitForTimeout(200);
      const cont = p.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
      if ((await cont.count()) > 0) {
        await cont.click({ force: true }).catch(() => {});
        await p.waitForTimeout(450);
      } else {
        await p.waitForTimeout(300);
      }
    }
  }

  // Click an investigation object + handle its thought + any phase-done dialog
  async function investigateOne(p, shotName) {
    // Wait for hotspots (only real .hotspot in hotspot-layer, not layered UI)
    const items = p.locator('.hotspot-layer > .hotspot');
    if ((await items.count()) === 0) return false;
    await items.first().click({ force: true });
    await p.waitForTimeout(2800); // zoom + dialogue start
    await shot(p, shotName);
    await dismissAnyDialogue(p);    // object thought
    await p.waitForTimeout(400);     // goBack settle + potential advance
    await dismissAnyDialogue(p);    // possible phase-done dialogue
    return true;
  }

  // Phase 1: 5 objects
  for (let step = 0; step < 5; step++) {
    if (!await investigateOne(page, `12_phase1_step${step + 1}_zoom`)) break;
  }

  // Phase 2
  await shot(page, '13_phase2_hotspots');
  for (let step = 0; step < 2; step++) {
    if (!await investigateOne(page, `14_phase2_step${step + 1}_zoom`)) break;
  }

  // Phase 3
  await shot(page, '15_phase3_hotspots');
  for (let step = 0; step < 3; step++) {
    if (!await investigateOne(page, `16_phase3_step${step + 1}_zoom_box_open`)) break;
  }

  // Phase 4
  await shot(page, '17_phase4_hotspots');
  for (let step = 0; step < 2; step++) {
    if (!await investigateOne(page, `18_phase4_step${step + 1}_zoom`)) break;
  }

  // After phase 4 completes, an investigate-complete dialogue shows → dismiss
  await page.waitForTimeout(1500);
  await dismissAnyDialogue(page);
  await page.waitForTimeout(800);
  await shot(page, '19_define_problem');

  const defineCount = await page.locator('.define-option').count();
  assert(`Define problem: 5 options (got ${defineCount})`, defineCount === 5);

  // Click wrong option first (to test tooltip + elimination)
  await page.locator('.define-option').filter({ hasText: /messy/i }).first().click({ force: true });
  await page.waitForTimeout(500);
  await shot(page, '20_define_wrong_answer_tooltip');

  // Now click correct
  await page.locator('.define-option').filter({ hasText: /Labels do not match/i }).first().click({ force: true });
  await page.waitForTimeout(500);
  await shot(page, '21_define_correct');

  await page.getByRole('button', { name: /Continue/i }).first().click({ force: true });
  await page.waitForTimeout(2000);
  await shot(page, '22_completion');

  const completion = page.locator('mat-card-title').filter({ hasText: /Problem Solving Complete/i });
  assert('Completion overlay visible', await completion.isVisible({ timeout: 3000 }).catch(() => false));

  assert('No runtime errors', errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).length === 0,
    errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).join('; '));

  await browser.close();
  console.log(`\n── Results: ${passCount} passed, ${failCount} failed ──`);
  if (failCount > 0) { for (const e of errors) console.log(' - ' + e); process.exit(1); }
}

const ESCAPE_ROOM_TIMING_CLONE = { zoomOutDelay: 300 };

run().catch(err => { console.error('FATAL:', err); process.exit(2); });
