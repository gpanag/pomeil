/**
 * Generic E2E Test for POMEIL Escape Rooms
 *
 * Tests: page load, images, intro popup, dialogues, character hover effects,
 * hint system, basic game flow, image loading, and learning mode.
 *
 * Usage: node e2e-room-test.mjs <room-id>
 * Example: node e2e-room-test.mjs flexibility
 *
 * Requires: dev server on localhost:4200, playwright installed
 */

import { chromium } from 'playwright';

const roomId = process.argv[2];
if (!roomId) {
  console.error('Usage: node e2e-room-test.mjs <room-id>');
  console.error('Example: node e2e-room-test.mjs flexibility');
  process.exit(1);
}

const BASE = 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/${roomId}`;
const ROOM_LEARNING_URL = `${ROOM_URL}?mode=learning`;
let browser, context, page;
let passed = 0, failed = 0;
const errors = [];

function ok(name, condition) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; errors.push(name); }
}

async function waitForDialogue(timeout = 5000) {
  try { await page.waitForSelector('.dialogue-panel', { timeout }); return true; }
  catch { return false; }
}

async function dismissDialogue() {
  const panel = page.locator('.dialogue-panel');
  if (!await panel.isVisible().catch(() => false)) return false;
  await page.waitForTimeout(500); // Wait for animation to settle
  await panel.click({ force: true });
  await page.waitForTimeout(400);
  const btn = page.locator('.dialogue-actions button');
  if (await btn.isVisible().catch(() => false)) { await btn.click({ force: true }); await page.waitForTimeout(500); return true; }
  return false;
}

async function getBackgroundUrl() {
  return await page.locator('.scene-background').evaluate(el =>
    el.style.backgroundImage.replace(/url\(["']?|["']?\)/g, '')
  );
}

async function screenshotAs(label) {
  await page.screenshot({ path: `public/assets/scenarios/temp_images/test_${roomId}_${label}.png` });
}

// =============================================
try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('audio') && !t.includes('Audio') && !t.includes('play()') &&
          !t.includes('NotAllowed') && !t.includes('favicon') && !t.includes('ERR_FILE_NOT_FOUND') &&
          !t.includes('.wav') && !t.includes('.mp3'))
        consoleErrors.push(t);
    }
  });

  const failedImages = [];
  page.on('response', response => {
    const url = response.url();
    if (url.includes(`/assets/images/`) && url.includes(roomId.replace(/-/g, '_')) && response.status() >= 400) {
      failedImages.push(url);
    }
  });

  // === SECTION 1: Hub ===
  console.log(`\n=== E2E Test: ${roomId} ===\n`);
  console.log('--- Hub ---');
  await page.goto(`${BASE}/escape-rooms`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const hubHtml = await page.content();
  ok('Room card visible in hub', hubHtml.toLowerCase().includes(roomId) || hubHtml.includes(roomId.replace(/-/g, ' ')));

  // === SECTION 2: Page Load ===
  console.log('\n--- Page Load ---');
  await page.goto(ROOM_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  ok('Room page loads', page.url().includes(roomId));
  ok('Game container exists', await page.locator('.game-container').isVisible());

  const introVisible = await page.locator('.overlay.center mat-card').first().isVisible().catch(() => false);
  ok('Intro popup visible', introVisible);

  await screenshotAs('01_intro');

  // === SECTION 3: Intro Content ===
  console.log('\n--- Intro Popup ---');
  if (introVisible) {
    const title = await page.locator('mat-card-title').first().textContent();
    ok('Intro has a title', title && title.length > 3);

    const paragraphs = await page.locator('.intro-text p').count();
    ok('Intro has paragraphs', paragraphs >= 2);

    const btn = page.locator('mat-card-actions button');
    ok('Enter button visible', await btn.isVisible());

    // Close intro
    await btn.click();
    await page.waitForTimeout(1000);
    ok('Intro closed', !(await page.locator('.intro-text').isVisible().catch(() => false)));
  }

  // === SECTION 4: Self-Talk ===
  console.log('\n--- Self-Talk Dialogue ---');
  const selfTalk = await waitForDialogue();
  ok('Self-talk dialogue appears', selfTalk);
  if (selfTalk) {
    await page.locator('.dialogue-panel').click();
    await page.waitForTimeout(300);
    const charName = await page.locator('.character-name').textContent();
    ok('Character is "System"', charName.includes('System'));
  }
  await dismissDialogue();
  await page.waitForTimeout(500);

  await screenshotAs('02_main_view');

  // === SECTION 5: UI Elements ===
  console.log('\n--- UI Elements ---');
  ok('Fullscreen button', await page.locator('.fullscreen-button').isVisible());
  ok('Back button', await page.locator('.escape-rooms-back-button').isVisible());

  const hintBtn = page.locator('.hint-button');
  const hintVisible = await hintBtn.isVisible().catch(() => false);
  ok('Hint button visible', hintVisible);

  // === SECTION 6: Character Hotspots ===
  console.log('\n--- Character Hotspots ---');
  const charHotspots = await page.locator('.character-hotspot').count();
  ok(`Character hotspots exist (${charHotspots})`, charHotspots >= 1);

  if (charHotspots >= 1) {
    const firstChar = page.locator('.character-hotspot').first();
    const beforeBg = await getBackgroundUrl();

    await firstChar.hover({ force: true, timeout: 5000 });
    await page.waitForTimeout(500);
    const hoverBg = await getBackgroundUrl();
    ok('Hover changes background', hoverBg !== beforeBg || hoverBg.includes('hover'));
    await screenshotAs('03_char1_hover');

    await page.mouse.move(10, 10);
    await page.waitForTimeout(500);
    const afterBg = await getBackgroundUrl();
    ok('Background restores after hover', afterBg === beforeBg || !afterBg.includes('hover'));
  }

  // === SECTION 7: Hint System ===
  console.log('\n--- Hint System ---');
  if (hintVisible) {
    await hintBtn.click();
    await page.waitForTimeout(500);
    const hint = await waitForDialogue();
    ok('Hint dialogue appears', hint);
    if (hint) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
      const hintText = await page.locator('.dialogue-text').textContent();
      ok('Hint text is meaningful', hintText.length > 10);
    }
    await dismissDialogue();
    await page.waitForTimeout(500);
  }

  // === SECTION 8: First Character Interaction ===
  console.log('\n--- First Character Interaction ---');
  if (charHotspots >= 1) {
    await page.locator('.character-hotspot').first().click({ force: true, timeout: 5000 });
    await page.waitForTimeout(500);
    const charDialogue = await waitForDialogue();
    ok('Character dialogue appears on click', charDialogue);

    if (charDialogue) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
      const text = await page.locator('.dialogue-text').textContent();
      ok('Dialogue has content', text.length > 20);

      const bg = await getBackgroundUrl();
      ok('Background shows talking close-up', bg.includes('talking'));
      await screenshotAs('04_char_talking');
    }

    // Dismiss all chained dialogues
    let chain = 0;
    while (await waitForDialogue(2000)) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(200);
      await dismissDialogue();
      await page.waitForTimeout(300);
      chain++;
      if (chain > 8) break;
    }
  }

  // === SECTION 9: First Interactive Hotspot ===
  console.log('\n--- First Interactive Hotspot ---');
  const interactiveHotspots = page.locator('.hotspot:not(.character-hotspot)');
  const hotspotCount = await interactiveHotspots.count();
  ok(`Interactive hotspots exist (${hotspotCount})`, hotspotCount >= 1);

  if (hotspotCount >= 1) {
    await interactiveHotspots.first().click({ force: true, timeout: 5000 });
    await page.waitForTimeout(3500);
    await screenshotAs('05_first_interaction');

    // Check if zoom happened or popup appeared
    const bg = await getBackgroundUrl();
    const popup = await page.locator('.item-popup-base').isVisible().catch(() => false);
    const overlay = await page.locator('.overlay.center mat-card').isVisible().catch(() => false);
    ok('Interaction produced visual change', bg.includes('zoom') || popup || overlay);
  }

  // === SECTION 10: Image Loading ===
  console.log('\n--- Image Loading ---');
  ok('No image load failures during test', failedImages.length === 0);
  if (failedImages.length > 0) {
    console.log('  Failed images:');
    failedImages.forEach(u => console.log(`    ${u}`));
  }

  // === SECTION 11: Learning Mode ===
  console.log('\n--- Learning Mode ---');
  await page.goto(ROOM_LEARNING_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const scorePanel = await page.locator('.learning-score-panel').isVisible().catch(() => false);
  ok('Learning score panel visible', scorePanel);
  await screenshotAs('06_learning_mode');

  // === SECTION 12: Console Errors ===
  console.log('\n--- Console Errors ---');
  ok('No unexpected console errors', consoleErrors.length === 0);
  if (consoleErrors.length > 0) {
    console.log('  Errors:');
    consoleErrors.forEach(e => console.log(`    ${e}`));
  }

  // === RESULTS ===
  console.log(`\n========================================`);
  console.log(`${roomId}: ${passed} passed, ${failed} failed`);
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
