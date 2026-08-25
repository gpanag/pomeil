import { chromium } from 'playwright';

const BASE = process.env.TEST_URL || 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/problem-solving`;

const ESCAPE_ROOM_TIMING_CLONE = {
  zoomOutDelay: 300,
  completionTransitionDelay: 500,
};

let passCount = 0;
let failCount = 0;
const errors = [];

function assert(name, cond, info = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passCount++;
  } else {
    console.log(`  ✗ ${name}${info ? ' → ' + info : ''}`);
    failCount++;
    errors.push(`${name}${info ? ': ' + info : ''}`);
  }
}

async function waitForDialogue(page, idOrText) {
  // Wait for dialogue text to appear
  const panel = page.locator('.dialogue-panel .dialogue-text');
  await panel.waitFor({ state: 'visible', timeout: 10000 });
  // Wait for typewriter to finish by clicking once to skip
  await page.locator('.dialogue-panel').click({ force: true });
  return panel.textContent();
}

async function clickContinue(page) {
  const btn = page.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click();
  } catch { /* no continue button (reply flow) */ }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  const page = await ctx.newPage();

  page.on('pageerror', err => { errors.push(`PAGE ERROR: ${err.message}`); failCount++; });
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`); });

  console.log('── Problem Solving e2e ──');
  console.log(`Navigating to ${ROOM_URL}`);
  await page.goto(ROOM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Intro popup
  const introCard = page.locator('.overlay.center mat-card-title').filter({ hasText: /Problem Solving/i });
  await introCard.waitFor({ state: 'visible', timeout: 15000 });
  assert('Intro popup visible', await introCard.isVisible());

  // Start the room
  await page.getByRole('button', { name: /Enter the Storage Room/i }).click();
  await page.waitForTimeout(500);

  // Sticky note hotspot should be visible
  const stickyHotspot = page.locator('.hotspot').first();
  await stickyHotspot.waitFor({ state: 'visible', timeout: 5000 });
  assert('Sticky-note hotspot visible after intro', await stickyHotspot.isVisible());

  // Click sticky note
  await stickyHotspot.click();
  await page.waitForTimeout(3000); // wait for zoom animation

  const letter = await waitForDialogue(page);
  assert('Letter from storage manager shown', (letter || '').includes('going missing') || (letter || '').length > 30);

  // Dismiss letter → shows follow-up thought
  await clickContinue(page);
  await page.waitForTimeout(500);
  const thought = await waitForDialogue(page);
  assert('Follow-up thought shown', (thought || '').includes('stapler') || (thought || '').length > 10);

  // Dismiss → clean room intro
  await clickContinue(page);
  await page.waitForTimeout(3000);
  const cleanIntro = await waitForDialogue(page);
  assert('Clean-up intro dialogue shown', (cleanIntro || '').length > 10);
  await clickContinue(page);
  await page.waitForTimeout(1000);

  // Cleanable items should be visible
  const cleanables = page.locator('.hotspot.cleanable');
  const cleanCount = await cleanables.count();
  assert(`${cleanCount} cleanable hotspots visible`, cleanCount >= 4, `got ${cleanCount}`);

  // Click all cleanable items
  for (let i = 0; i < cleanCount; i++) {
    // Re-fetch each time since state changes
    const items = page.locator('.hotspot.cleanable:not(.cleaned)');
    const count = await items.count();
    if (count === 0) break;
    await items.first().click({ force: true });
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1500);
  const cleanDone = await waitForDialogue(page);
  assert('Clean-done dialogue shown', (cleanDone || '').length > 5);

  // Dismiss → Knut arrives
  await clickContinue(page);
  await page.waitForTimeout(2500);
  const knutArrival = await waitForDialogue(page);
  assert('Knut arrival dialogue', (knutArrival || '').toLowerCase().includes('knut') || (knutArrival || '').length > 5);

  // Dismiss → can click Knut
  await clickContinue(page);
  await page.waitForTimeout(500);
  const knutHotspot = page.locator('.character-hotspot').first();
  assert('Knut character hotspot visible', await knutHotspot.isVisible());
  await knutHotspot.click();
  await page.waitForTimeout(500);
  const knutLine1 = await waitForDialogue(page);
  assert('Knut first line visible', (knutLine1 || '').toLowerCase().includes('minute') || (knutLine1 || '').length > 5);

  // DEBUG: inspect state after first Knut line
  await page.waitForTimeout(300);
  const afterLine1 = await page.evaluate(() => {
    const btn = document.querySelector('.reply-btn');
    if (!btn) return { noBtn: true };
    const rect = btn.getBoundingClientRect();
    const cx = rect.left + rect.width/2;
    const cy = rect.top + rect.height/2;
    const atPoint = document.elementFromPoint(cx, cy);
    return {
      btnText: btn.textContent?.trim().substring(0, 40),
      rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height },
      elementAtCenter: atPoint?.tagName + '.' + atPoint?.className,
      sameAsBtn: atPoint === btn || btn.contains(atPoint) || atPoint?.contains(btn),
    };
  });
  console.log('   [DEBUG-afterLine1]', JSON.stringify(afterLine1));

  // Click reply 6 times for conversation
  for (let i = 0; i < 6; i++) {
    const replyBtn = page.locator('.reply-btn');
    try {
      await replyBtn.waitFor({ state: 'visible', timeout: 4000 });
      await replyBtn.click({ force: true });
      await page.waitForTimeout(700);
      // Click continue to dismiss the reply and advance to next NPC line
      await page.locator('.dialogue-panel').click({ force: true });
      await page.waitForTimeout(300);
      const s = await page.evaluate(() => ({
        dialogueText: (document.querySelector('.dialogue-panel .dialogue-text') || {}).textContent,
        contBtnCount: Array.from(document.querySelectorAll('.dialogue-panel button'))
          .filter(b => /Continue/i.test(b.textContent || '')).length,
      }));
      console.log(`   [loop ${i}]`, JSON.stringify(s));
      const cont = page.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
      if (await cont.count()) { await cont.click({ force: true }); await page.waitForTimeout(500); }
      else { console.log(`   [loop ${i}] no Continue button found`); }
    } catch (e) {
      console.log(`   [loop ${i}] exception:`, e.message);
      break;
    }
  }
  await page.waitForTimeout(2000);

  // After convo → investigation intro dialogue
  const investigateIntro = await waitForDialogue(page);
  assert('Investigate intro dialogue', (investigateIntro || '').length > 5);
  await clickContinue(page);
  await page.waitForTimeout(1000);

  // Phase 1 hotspots should be visible
  const phase1Spots = page.locator('.hotspot');
  const phase1Count = await phase1Spots.count();
  if (phase1Count < 5) {
    const st = await page.evaluate(() => ({
      dialogueVisible: !!document.querySelector('.dialogue-panel'),
      dialogueText: (document.querySelector('.dialogue-panel .dialogue-text') || {}).textContent,
      hotspotCount: document.querySelectorAll('.hotspot').length,
      hotspotLayerChildren: document.querySelector('.hotspot-layer')?.children.length,
      hasDisableClicks: !!document.querySelector('.hotspot-layer.disable-clicks'),
    }));
    console.log('   [DEBUG]', JSON.stringify(st));
    await page.screenshot({ path: 'debug-phase1.png' });
  }
  assert(`Phase 1: at least 5 hotspots visible`, phase1Count >= 5, `got ${phase1Count}`);

  // Click through ALL investigation hotspots across 4 phases
  for (let phase = 1; phase <= 4; phase++) {
    const phaseSpots = page.locator('.hotspot-layer > .hotspot');
    let remaining = await phaseSpots.count();
    let iters = 0;
    while (remaining > 0 && iters < 10) {
      try {
        await phaseSpots.first().click({ force: true });
        await page.waitForTimeout(3000); // zoom animation
        // dialogue shows — click through
        await page.locator('.dialogue-panel').click({ force: true });
        await page.waitForTimeout(300);
        const cont = page.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
        if (await cont.count()) {
          await cont.click({ force: true });
          await page.waitForTimeout(ESCAPE_ROOM_TIMING_CLONE.zoomOutDelay + 800);
          // phase-done dialogue may appear
          const dp = page.locator('.dialogue-panel');
          if (await dp.count()) {
            await page.locator('.dialogue-panel').click({ force: true });
            await page.waitForTimeout(300);
            const cont2 = page.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
            if (await cont2.count()) {
              await cont2.click({ force: true });
              await page.waitForTimeout(800);
            }
          }
        }
      } catch (e) { /* continue */ }
      remaining = await page.locator('.hotspot-layer > .hotspot').count();
      iters++;
    }
  }

  await page.waitForTimeout(1500);
  // Should be at define problem quiz
  const defineOpts = page.locator('.define-option');
  const defineCount = await defineOpts.count();
  assert(`Define problem options shown (${defineCount})`, defineCount === 5, `got ${defineCount}`);

  // Click correct answer ("Labels do not match contents")
  const correctOpt = defineOpts.filter({ hasText: /Labels do not match/i }).first();
  await correctOpt.click({ force: true });
  await page.waitForTimeout(500);
  const correctExplained = page.locator('mat-card-content p').filter({ hasText: /Correct/i }).first();
  assert('Correct-answer explanation shown', await correctExplained.isVisible().catch(() => false));

  // Continue → door open
  await page.getByRole('button', { name: /Continue/i }).first().click({ force: true });
  await page.waitForTimeout(2000);

  // Completion overlay should appear
  const completion = page.locator('mat-card-title').filter({ hasText: /Problem Solving Complete/i }).first();
  assert('Completion overlay shown', await completion.isVisible({ timeout: 3000 }).catch(() => false));

  // Final sanity: no JS errors
  assert('No runtime errors', errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).length === 0,
    errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).join('; '));

  await browser.close();

  console.log(`\n── Results: ${passCount} passed, ${failCount} failed ──`);
  if (failCount > 0) {
    console.log('\nFailures:');
    for (const e of errors) console.log(' - ' + e);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});
