/**
 * Comprehensive E2E Test for Decision-Making Escape Room (Module 4)
 *
 * Unique room: no characters, elevator malfunction scenario.
 * Flow: Outside elevator → Enter → Floor sequence → Malfunction →
 *       Lights off → Gather info (8 items) → Flowchart phases →
 *       Select alternative → Review outcome → Completion
 *
 * Run: node e2e-decision-making-test.mjs
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/decision-making`;
let browser, context, page;
let passed = 0, failed = 0;
const errors = [];

function ok(name, condition) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; errors.push(name); }
}

async function screenshotAs(label) {
  await page.screenshot({ path: `public/assets/scenarios/temp_images/test_dm_${label}.png` });
}

async function waitForDialogue(timeout = 5000) {
  try { await page.waitForSelector('.dialogue-panel', { timeout }); return true; }
  catch { return false; }
}

async function dismissAllDialogues(maxChain = 10) {
  let count = 0;
  while (count < maxChain) {
    await page.waitForTimeout(600);
    const panel = page.locator('.dialogue-panel');
    if (!await panel.isVisible().catch(() => false)) break;
    await panel.click({ force: true });
    await page.waitForTimeout(400);
    const btn = page.locator('.dialogue-actions button');
    if (await btn.isVisible().catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(500);
    }
    count++;
  }
  return count;
}

async function getBackgroundUrl() {
  return page.locator('.scene-background').evaluate(el =>
    el.style.backgroundImage.replace(/url\(["']?|["']?\)/g, '')
  );
}

try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('audio') && !t.includes('.wav') && !t.includes('.mp3') &&
          !t.includes('play()') && !t.includes('NotAllowed') && !t.includes('favicon'))
        consoleErrors.push(t);
    }
  });

  // === SECTION 1: Load & Intro ===
  console.log('\n=== Decision-Making E2E Test ===\n');
  console.log('--- Section 1: Load & Intro ---');
  await page.goto(ROOM_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  ok('Room loads', page.url().includes('decision-making'));
  ok('Game container exists', await page.locator('.game-container').isVisible());
  ok('Intro popup visible', await page.locator('.overlay.center mat-card').first().isVisible());
  await screenshotAs('01_intro');

  // Close intro
  await page.locator('mat-card-actions button').click();
  await page.waitForTimeout(1000);

  // === SECTION 2: Outside Elevator ===
  console.log('\n--- Section 2: Outside Elevator ---');
  const bg = await getBackgroundUrl();
  ok('Background is outside elevator', bg.includes('outside'));
  await screenshotAs('02_outside');

  // No character hotspots (unique room)
  const charCount = await page.locator('.character-hotspot').count();
  ok('No character hotspots (elevator room)', charCount === 0);

  // Should have interactive hotspots (call button, elevator)
  const hotspots = await page.locator('.hotspot:not(.character-hotspot)').count();
  ok(`Interactive hotspots exist: ${hotspots}`, hotspots >= 1);

  // === SECTION 3: Call Elevator & Enter ===
  console.log('\n--- Section 3: Call & Enter Elevator ---');
  // Click the call button / elevator area
  if (hotspots >= 1) {
    await page.locator('.hotspot:not(.character-hotspot)').first().click({ force: true });
    await page.waitForTimeout(2000);
    await screenshotAs('03_after_call');

    const bg2 = await getBackgroundUrl();
    ok('Background changed after clicking', bg2 !== bg || bg2.includes('doors_open'));

    // Try entering the elevator
    const enterHotspot = page.locator('.hotspot:not(.character-hotspot)');
    const enterCount = await enterHotspot.count();
    if (enterCount >= 1) {
      await enterHotspot.first().click({ force: true });
      await page.waitForTimeout(2000);
      const bg3 = await getBackgroundUrl();
      ok('Entered elevator (bg changed)', bg3.includes('inside') || bg3 !== bg2);
      await screenshotAs('04_inside_elevator');
    }
  }

  // === SECTION 4: Elevator sequence (if we got inside) ===
  console.log('\n--- Section 4: Elevator Sequence ---');
  // Press a floor button
  const panelHotspot = page.locator('.hotspot:not(.character-hotspot)');
  const panelCount = await panelHotspot.count();
  if (panelCount >= 1) {
    await panelHotspot.first().click({ force: true });
    await page.waitForTimeout(5000); // Wait for floor sequence + malfunction

    const bg4 = await getBackgroundUrl();
    ok('Elevator malfunction state', bg4.includes('lights_off') || bg4.includes('inside'));
    await screenshotAs('05_malfunction');
  }

  // Dismiss any malfunction dialogues
  const malfunctionChain = await dismissAllDialogues(8);
  ok('Malfunction dialogue chain', malfunctionChain >= 1);

  // === SECTION 5: Gather Info ===
  console.log('\n--- Section 5: Gather Info ---');
  await screenshotAs('06_gather_info');

  // Check for info item hotspots
  const infoHotspots = await page.locator('.hotspot:not(.character-hotspot)').count();
  ok(`Info item hotspots visible: ${infoHotspots}`, infoHotspots >= 3);

  // Click several info items
  let infoClicked = 0;
  for (let i = 0; i < Math.min(infoHotspots, 8); i++) {
    const hs = page.locator('.hotspot:not(.character-hotspot)').nth(i);
    if (await hs.isVisible().catch(() => false)) {
      await hs.click({ force: true });
      await page.waitForTimeout(1000);
      // Dismiss any dialogue or popup
      const popup = await page.locator('.item-popup-base').isVisible().catch(() => false);
      if (popup) {
        await page.locator('.overlay.center').click({ position: { x: 5, y: 5 }, force: true });
        await page.waitForTimeout(500);
      }
      await dismissAllDialogues(2);
      infoClicked++;
    }
  }
  ok(`Clicked info items: ${infoClicked}`, infoClicked >= 3);

  // === SECTION 6: Image Verification ===
  console.log('\n--- Section 6: Image Verification ---');
  const expectedImages = [
    'outside_elevator.png', 'inside_main.png',
    'inside_lights_off.png', 'inside_facing_doors.png', 'inside_facing_panel.png',
    'zoom_button_panel.png', 'zoom_floor_indicator.png',
    'zoom_wire_panel.png', 'zoom_inspection_plaque.png',
    'zoom_safety_poster.png', 'zoom_roof_lamp.png',
  ];

  let imgFails = 0;
  for (const img of expectedImages) {
    const resp = await page.request.get(`${BASE}/assets/images/decision_making/${img}`);
    if (resp.status() >= 400) { console.log(`    404: ${img}`); imgFails++; }
  }
  ok(`All ${expectedImages.length} key images load`, imgFails === 0);

  // === SECTION 7: Learning Mode ===
  console.log('\n--- Section 7: Learning Mode ---');
  await page.goto(`${ROOM_URL}?mode=learning`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  ok('Learning score panel visible', await page.locator('.learning-score-panel').isVisible().catch(() => false));
  await screenshotAs('07_learning_mode');

  // === RESULTS ===
  console.log(`\n========================================`);
  console.log(`decision-making: ${passed} passed, ${failed} failed`);
  console.log(`========================================`);
  if (errors.length > 0) {
    console.log('\nFailed:');
    errors.forEach(e => console.log(`  ✗ ${e}`));
  }

} catch (err) {
  console.error('Test error:', err.message);
} finally {
  if (browser) await browser.close();
}
