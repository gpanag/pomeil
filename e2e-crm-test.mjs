/**
 * Comprehensive E2E Test for CRM Escape Room (Module 3)
 *
 * CRM is a unique room with free-exploration puzzles:
 * - Puzzle 1: Customer Complaint Call (mood-based branching)
 * - Puzzle 2: Customer Registry (GDPR drag-drop)
 * - Puzzle 3: Feedback Survey (A/B choices)
 * Plus 6 interactive red-herring objects.
 *
 * Run: node e2e-crm-test.mjs
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/crm`;
let browser, context, page;
let passed = 0, failed = 0;
const errors = [];

function ok(name, condition) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; errors.push(name); }
}

async function screenshotAs(label) {
  await page.screenshot({ path: `public/assets/scenarios/temp_images/test_crm_${label}.png` });
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

  // === SECTION 1: Page Load & Intro ===
  console.log('\n=== CRM E2E Test ===\n');
  console.log('--- Section 1: Load & Intro ---');
  await page.goto(ROOM_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  ok('Room loads', page.url().includes('crm'));
  ok('Game container exists', await page.locator('.game-container').isVisible());
  ok('Intro popup visible', await page.locator('.overlay.center mat-card').first().isVisible());

  const title = await page.locator('mat-card-title').first().textContent();
  ok('Intro title present', title.length > 3);
  await screenshotAs('01_intro');

  // Close intro
  await page.locator('mat-card-actions button').click();
  await page.waitForTimeout(1000);

  // === SECTION 2: Self-talk & Intro dialogues ===
  console.log('\n--- Section 2: Intro Dialogues ---');
  const introChain = await dismissAllDialogues(8);
  ok('Intro dialogue chain completed', introChain >= 1);
  await screenshotAs('02_main_view');

  // === SECTION 3: UI & Hotspots ===
  console.log('\n--- Section 3: UI & Hotspots ---');
  ok('Fullscreen button', await page.locator('.fullscreen-button').isVisible());
  ok('Back button', await page.locator('.escape-rooms-back-button').isVisible());

  const charHotspots = await page.locator('.character-hotspot').count();
  ok(`Character hotspots: ${charHotspots}`, charHotspots === 2);

  const interactiveHotspots = await page.locator('.hotspot:not(.character-hotspot)').count();
  ok(`Interactive hotspots (should be many): ${interactiveHotspots}`, interactiveHotspots >= 3);

  // === SECTION 4: Character Hover ===
  console.log('\n--- Section 4: Character Hover ---');
  const bgBefore = await getBackgroundUrl();
  await page.locator('.character-hotspot').first().hover({ force: true });
  await page.waitForTimeout(600);
  const bgHover = await getBackgroundUrl();
  ok('Hover changes background (peter)', bgHover !== bgBefore);
  await screenshotAs('03_peter_hover');

  await page.mouse.move(10, 10);
  await page.waitForTimeout(500);

  // === SECTION 5: Click Peter → Dialogue ===
  console.log('\n--- Section 5: Peter Interaction ---');
  await page.locator('.character-hotspot').first().click({ force: true });
  await page.waitForTimeout(600);

  const peterDialogue = await waitForDialogue();
  ok('Peter dialogue appears', peterDialogue);
  if (peterDialogue) {
    const bg = await getBackgroundUrl();
    ok('Background shows Peter talking', bg.includes('peter_talking'));
    await screenshotAs('04_peter_talking');
  }
  await dismissAllDialogues(5);

  // === SECTION 6: Click Simone ===
  console.log('\n--- Section 6: Simone Interaction ---');
  if (charHotspots >= 2) {
    await page.locator('.character-hotspot').nth(1).click({ force: true });
    await page.waitForTimeout(600);
    const simoneDialogue = await waitForDialogue();
    ok('Simone dialogue appears', simoneDialogue);
    if (simoneDialogue) {
      const bg = await getBackgroundUrl();
      ok('Background shows Simone talking', bg.includes('simone_talking'));
    }
    await dismissAllDialogues(5);
  }

  // === SECTION 7: Interactive Objects (red herrings) ===
  console.log('\n--- Section 7: Interactive Objects ---');
  // Click a small hotspot (rubber duck, coffee machine, etc.)
  const smallHotspots = page.locator('.hotspot.small-hotspot, .hotspot:not(.character-hotspot)');
  const smallCount = await smallHotspots.count();
  ok(`Small interactive hotspots exist: ${smallCount}`, smallCount >= 3);

  if (smallCount > 0) {
    await smallHotspots.first().click({ force: true });
    await page.waitForTimeout(600);
    const objDialogue = await waitForDialogue(3000);
    ok('Clicking object triggers dialogue', objDialogue);
    await dismissAllDialogues(3);
  }

  // === SECTION 8: Image Verification ===
  console.log('\n--- Section 8: Image Verification ---');
  const expectedImages = [
    'customer_service_dept.png', 'customer_service_dept_default.png',
    'customer_service_dept_door_open.png',
    'peter_hover.png', 'peter_talking.png', 'peter_hover_door_open.png',
    'simone_hover.png', 'simone_talking.png', 'simone_hover_door_open.png',
    'zoom_cabinet.png', 'zoom_whiteboard.png', 'phone_call.png',
  ];

  let imgFails = 0;
  for (const img of expectedImages) {
    const resp = await page.request.get(`${BASE}/assets/images/crm/${img}`);
    if (resp.status() >= 400) { console.log(`    404: ${img}`); imgFails++; }
  }
  ok(`All ${expectedImages.length} images load`, imgFails === 0);

  // === SECTION 9: Learning Mode ===
  console.log('\n--- Section 9: Learning Mode ---');
  await page.goto(`${ROOM_URL}?mode=learning`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  ok('Learning score panel visible', await page.locator('.learning-score-panel').isVisible().catch(() => false));
  await screenshotAs('05_learning_mode');

  // === RESULTS ===
  console.log(`\n========================================`);
  console.log(`CRM: ${passed} passed, ${failed} failed`);
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
