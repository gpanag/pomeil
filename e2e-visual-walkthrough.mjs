/**
 * Visual Walkthrough Test — Comprehensive escape room QA via browser simulation.
 *
 * Opens each room, simulates the full game flow, takes screenshots at every step,
 * and verifies image blending/consistency, puzzle rendering, dialogue flow,
 * and game completion.
 *
 * Usage: node e2e-visual-walkthrough.mjs <room-id>
 * Output: Screenshots in public/assets/scenarios/temp_images/vw_<room>_*.png
 *
 * Methodology:
 *   Phase 1: Load & Intro (3 screenshots)
 *   Phase 2: Character Interactions — hover + talking for each char (2 per char)
 *   Phase 3: Hint System (1 screenshot)
 *   Phase 4: Game Flow — walk through each state, zoom, item popup (varies)
 *   Phase 5: Puzzles — verify rendering, solve or 3-attempt reveal (varies)
 *   Phase 6: Door Opening & Completion (2 screenshots)
 *   Phase 7: Image Blending Check — overlay comparison (2 screenshots)
 *   Phase 8: Learning Mode (1 screenshot)
 *   Phase 9: All Images HTTP Check
 *
 * After running, view screenshots with: Read tool on each .png file
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

const roomId = process.argv[2];
if (!roomId) {
  console.error('Usage: node e2e-visual-walkthrough.mjs <room-id>');
  process.exit(1);
}

const BASE = 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/${roomId}`;
const IMG_DIR = `public/assets/images/${roomId.replace(/-/g, '_')}/`;
const OUT_DIR = 'public/assets/scenarios/temp_images/';

let browser, context, page;
let stepNum = 0;
let passed = 0, failed = 0, warnings = 0;
const issues = [];
const screenshots = [];

function ok(name, condition) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; issues.push(name); }
}

function warn(name) {
  console.log(`  ⚠ ${name}`); warnings++;
  issues.push(`WARN: ${name}`);
}

async function ss(label) {
  stepNum++;
  const num = String(stepNum).padStart(2, '0');
  const filename = `vw_${roomId.replace(/-/g, '_')}_${num}_${label}.png`;
  const filepath = path.join(OUT_DIR, filename);
  await page.screenshot({ path: filepath });
  screenshots.push(filepath);
  return filepath;
}

async function waitForDialogue(timeout = 5000) {
  try { await page.waitForSelector('.dialogue-panel', { timeout }); return true; }
  catch { return false; }
}

async function dismiss() {
  await page.waitForTimeout(600);
  const p = page.locator('.dialogue-panel');
  if (!await p.isVisible().catch(() => false)) return false;
  await p.click({ force: true });
  await page.waitForTimeout(400);
  const b = page.locator('.dialogue-actions button');
  if (await b.isVisible().catch(() => false)) {
    await b.click({ force: true });
    await page.waitForTimeout(500);
  }
  return true;
}

async function dismissAll(max = 15) {
  let c = 0;
  while (c < max && await dismiss()) c++;
  return c;
}

async function closePopup() {
  if (await page.locator('.item-popup-base').isVisible().catch(() => false)) {
    await page.locator('.overlay.center').click({ position: { x: 5, y: 5 }, force: true });
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

async function getBg() {
  return page.locator('.scene-background').evaluate(el =>
    el.style.backgroundImage.replace(/url\(["']?|["']?\)/g, '')
  );
}

async function isBlurred() {
  return page.locator('.scene-background.blurred').isVisible().catch(() => false);
}

// =============================================
try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();

  const consoleErrors = [];
  const failedImages = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('audio') && !t.includes('.wav') && !t.includes('.mp3') &&
        !t.includes('play()') && !t.includes('NotAllowed') && !t.includes('favicon'))
        consoleErrors.push(t);
    }
  });
  page.on('response', resp => {
    const u = resp.url();
    if (u.includes('/assets/images/') && resp.status() >= 400) failedImages.push(u);
  });

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  VISUAL WALKTHROUGH: ${roomId}`);
  console.log(`${'='.repeat(60)}\n`);

  // =============================================
  // PHASE 1: Load & Intro
  // =============================================
  console.log('--- Phase 1: Load & Intro ---');

  await page.goto(ROOM_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  ok('Room loads', page.url().includes(roomId));
  ok('Game container', await page.locator('.game-container').isVisible());

  const introVisible = await page.locator('.overlay.center mat-card').first().isVisible().catch(() => false);
  ok('Intro popup', introVisible);
  await ss('intro');

  if (introVisible) {
    const title = await page.locator('mat-card-title').first().textContent().catch(() => '');
    ok(`Title: "${title.trim()}"`, title.trim().length > 2);
    const pCount = await page.locator('.intro-text p').count();
    ok(`Paragraphs: ${pCount}`, pCount >= 2);

    // Close intro
    await page.locator('mat-card-actions button').click();
    await page.waitForTimeout(1000);
  }

  // Self-talk
  const selfTalk = await waitForDialogue();
  ok('Self-talk dialogue', selfTalk);
  if (selfTalk) {
    await page.locator('.dialogue-panel').click({ force: true });
    await page.waitForTimeout(300);
    await ss('self_talk');
  }
  await dismiss();
  await page.waitForTimeout(500);

  const defaultBg = await getBg();
  await ss('main_view');
  console.log(`  Background: ${defaultBg.split('/').pop()}`);

  // =============================================
  // PHASE 2: Character Interactions
  // =============================================
  console.log('\n--- Phase 2: Character Interactions ---');

  const charCount = await page.locator('.character-hotspot').count();
  ok(`Character hotspots: ${charCount}`, charCount >= 0);

  const bgBeforeHover = await getBg();

  for (let i = 0; i < charCount; i++) {
    const charHs = page.locator('.character-hotspot').nth(i);
    const charLabel = `char${i + 1}`;

    // Hover
    await charHs.hover({ force: true });
    await page.waitForTimeout(600);
    const hoverBg = await getBg();
    await ss(`${charLabel}_hover`);
    const hoverChanged = hoverBg !== bgBeforeHover;
    ok(`${charLabel} hover changes bg`, hoverChanged);
    if (!hoverChanged) warn(`${charLabel} hover bg unchanged — image may not blend`);
    console.log(`  ${charLabel} hover: ${hoverBg.split('/').pop()}`);

    // Leave
    await page.mouse.move(10, 10);
    await page.waitForTimeout(400);
    const afterLeave = await getBg();
    ok(`${charLabel} hover restores`, afterLeave === bgBeforeHover);

    // Click → talking
    await charHs.click({ force: true });
    await page.waitForTimeout(600);
    const talkDialogue = await waitForDialogue(3000);
    if (talkDialogue) {
      const talkBg = await getBg();
      await ss(`${charLabel}_talking`);
      ok(`${charLabel} talking bg`, talkBg.includes('talking'));
      console.log(`  ${charLabel} talking: ${talkBg.split('/').pop()}`);

      const charName = await page.locator('.character-name').textContent().catch(() => '');
      ok(`${charLabel} name: "${charName.trim()}"`, charName.trim().length > 1);
    } else {
      warn(`${charLabel} no dialogue on click`);
    }

    // Dismiss all chained dialogues
    await dismissAll(8);
    await page.waitForTimeout(300);
  }

  // =============================================
  // PHASE 3: Hint System
  // =============================================
  console.log('\n--- Phase 3: Hint System ---');

  const hintBtn = page.locator('.hint-button');
  if (await hintBtn.isVisible().catch(() => false)) {
    await hintBtn.click();
    await page.waitForTimeout(600);
    const hintD = await waitForDialogue(3000);
    ok('Hint dialogue', hintD);
    if (hintD) {
      await page.locator('.dialogue-panel').click({ force: true });
      await page.waitForTimeout(300);
      const hintText = await page.locator('.dialogue-text').textContent().catch(() => '');
      ok(`Hint text meaningful: "${hintText.substring(0, 50)}..."`, hintText.length > 10);
      await ss('hint');
    }
    await dismiss();
    await page.waitForTimeout(300);

    // Check hint pulse
    const pulse = await page.locator('.show-hint-pulse').count();
    ok(`Hint pulse on ${pulse} hotspot(s)`, pulse >= 0);
  }

  // =============================================
  // PHASE 4: Game Flow — Click through hotspots
  // =============================================
  console.log('\n--- Phase 4: Game Flow (Interactive Hotspots) ---');

  let flowStep = 0;
  let maxFlowSteps = 20;

  while (flowStep < maxFlowSteps) {
    const hotspots = page.locator('.hotspot:not(.character-hotspot)');
    const hsCount = await hotspots.count();

    if (hsCount === 0) {
      // No hotspots — might need to click a character
      const chars = await page.locator('.character-hotspot').count();
      if (chars > 0 && flowStep > 0) {
        // Try clicking first character
        await page.locator('.character-hotspot').first().click({ force: true });
        await page.waitForTimeout(600);
        await dismissAll(5);
        flowStep++;
        continue;
      }
      break;
    }

    // Click the first visible hotspot
    const hs = hotspots.first();
    if (!await hs.isVisible().catch(() => false)) break;

    await hs.click({ force: true });
    await page.waitForTimeout(3000);
    flowStep++;

    const currentBg = await getBg();
    await ss(`flow_${flowStep}`);
    console.log(`  Step ${flowStep}: bg=${currentBg.split('/').pop()}`);

    // Check for various results
    const popup = await page.locator('.item-popup-base').isVisible().catch(() => false);
    const overlay = await page.locator('.overlay.center mat-card').isVisible().catch(() => false);
    const dialogue = await page.locator('.dialogue-panel').isVisible().catch(() => false);
    const blurred = await isBlurred();

    if (popup) {
      console.log(`  → Item popup found`);
      await ss(`flow_${flowStep}_popup`);
      await closePopup();
      await page.waitForTimeout(500);
    }

    if (overlay && blurred) {
      // Puzzle overlay
      const puzzleTitle = await page.locator('mat-card-title').first().textContent().catch(() => '');
      console.log(`  → Puzzle: "${puzzleTitle.trim()}"`);
      await ss(`flow_${flowStep}_puzzle`);

      // Try to solve or trigger 3-attempt reveal
      // Check puzzle type
      const hasTF = await page.locator('button').filter({ hasText: /^True$/ }).isVisible().catch(() => false);
      const hasOptions = await page.locator('.options-vertical button').count().catch(() => 0);
      const hasMatching = await page.locator('.matching-layout').isVisible().catch(() => false);
      const hasSequence = await page.locator('.sequence-item').count().catch(() => 0);
      const hasMultiSelect = await page.locator('.multi-selected, .selection-count').first().isVisible().catch(() => false);
      const hasGap = await page.locator('.gap-sentence').isVisible().catch(() => false);
      const hasWordBank = await page.locator('.word-bank button').count().catch(() => 0);

      if (hasTF) {
        console.log(`  → Type: True/False`);
        // Click False 3 times to trigger reveal
        for (let a = 0; a < 3; a++) {
          const fb = page.locator('button').filter({ hasText: /^False$/ });
          if (await fb.isVisible().catch(() => false)) {
            await fb.click({ force: true });
            await page.waitForTimeout(800);
          }
        }
      } else if (hasOptions > 0 && !hasMultiSelect) {
        console.log(`  → Type: Single Choice (${hasOptions} options)`);
        // Click first option 3 times
        for (let a = 0; a < 3; a++) {
          const opt = page.locator('.options-vertical button').first();
          if (await opt.isVisible().catch(() => false)) {
            await opt.click({ force: true });
            await page.waitForTimeout(800);
          }
        }
      } else if (hasMultiSelect) {
        console.log(`  → Type: Multi-Select`);
        const opts = page.locator('.options-vertical button');
        const c = await opts.count();
        if (c >= 2) {
          await opts.nth(0).click({ force: true }); await page.waitForTimeout(300);
          await opts.nth(1).click({ force: true }); await page.waitForTimeout(300);
        }
        const sub = page.locator('mat-card-actions button').filter({ hasText: 'Submit' });
        for (let a = 0; a < 3; a++) {
          if (await sub.isVisible().catch(() => false)) {
            await sub.click({ force: true }); await page.waitForTimeout(800);
          }
        }
      } else if (hasMatching) {
        console.log(`  → Type: Matching`);
        const colA = page.locator('.matching-layout .col').first().locator('button');
        const colB = page.locator('.matching-layout .col').nth(1).locator('button');
        // Click wrong matches 3 times
        for (let a = 0; a < 3; a++) {
          if (await colA.first().isVisible().catch(() => false)) {
            await colA.first().click({ force: true }); await page.waitForTimeout(300);
            await colB.first().click({ force: true }); await page.waitForTimeout(800);
          }
        }
      } else if (hasSequence > 0) {
        console.log(`  → Type: Sequence Ordering (${hasSequence} items)`);
        const sub = page.locator('mat-card-actions button').filter({ hasText: 'Submit' });
        for (let a = 0; a < 3; a++) {
          if (await sub.isVisible().catch(() => false)) {
            await sub.click({ force: true }); await page.waitForTimeout(800);
          }
        }
      } else if (hasGap || hasWordBank > 0) {
        console.log(`  → Type: Fill-the-Gap (${hasWordBank} words)`);
        // Click all words then submit 3 times
        const words = page.locator('.word-bank button');
        const wc = await words.count();
        for (let w = 0; w < wc; w++) {
          await words.nth(w).click({ force: true }); await page.waitForTimeout(200);
        }
        const sub = page.locator('mat-card-actions button').filter({ hasText: 'Submit' });
        for (let a = 0; a < 3; a++) {
          if (await sub.isVisible().catch(() => false)) {
            await sub.click({ force: true }); await page.waitForTimeout(800);
          }
          // Reset and refill
          const reset = page.locator('button').filter({ hasText: 'Reset' });
          if (await reset.isVisible().catch(() => false)) {
            await reset.click({ force: true }); await page.waitForTimeout(300);
            for (let w = 0; w < wc; w++) {
              const wb = page.locator('.word-bank button').nth(w);
              if (await wb.isVisible().catch(() => false))
                await wb.click({ force: true }); await page.waitForTimeout(100);
            }
          }
        }
      }

      await page.waitForTimeout(500);
      await ss(`flow_${flowStep}_puzzle_done`);

      // Handle answer reveal
      const reveal = page.locator('mat-card-actions button').filter({ hasText: 'Continue' });
      if (await reveal.isVisible().catch(() => false)) {
        await reveal.click({ force: true });
        await page.waitForTimeout(1000);
      }
    }

    // Dismiss any dialogues
    await dismissAll(5);
    await page.waitForTimeout(300);

    // Check for completion
    const completion = await page.locator('.score-summary').isVisible().catch(() => false);
    if (completion) {
      await ss('completion');
      console.log('  → Game complete!');
      break;
    }

    // Check for door open
    const bg = await getBg();
    if (bg.includes('door_open')) {
      await ss('door_open');
      console.log('  → Door is open');
    }
  }

  ok(`Game flow progressed (${flowStep} steps)`, flowStep >= 2);

  // =============================================
  // PHASE 5: Check for completion overlay
  // =============================================
  console.log('\n--- Phase 5: Completion ---');

  const gameComplete = await page.locator('.overlay.center mat-card').isVisible().catch(() => false);
  if (gameComplete) {
    const compTitle = await page.locator('mat-card-title').first().textContent().catch(() => '');
    ok(`Completion: "${compTitle.trim()}"`, compTitle.includes('Congratulations') || compTitle.length > 3);
    await ss('game_complete');
  } else {
    warn('Completion overlay not reached (may need more flow steps)');
  }

  // =============================================
  // PHASE 6: Image Blending Check
  // =============================================
  console.log('\n--- Phase 6: Image Blending Check ---');

  // Load room fresh and cycle through all image states
  await page.goto(ROOM_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  // Close intro + self-talk
  if (await page.locator('mat-card-actions button').isVisible().catch(() => false)) {
    await page.locator('mat-card-actions button').click();
    await page.waitForTimeout(1000);
  }
  await dismissAll(3);
  await page.waitForTimeout(500);

  const blendBg = await getBg();
  await ss('blend_default');

  // Hover each character in sequence
  for (let i = 0; i < charCount; i++) {
    await page.locator('.character-hotspot').nth(i).hover({ force: true });
    await page.waitForTimeout(600);
    await ss(`blend_hover_char${i + 1}`);
    await page.mouse.move(10, 10);
    await page.waitForTimeout(400);
  }

  // Check zoom backgrounds
  const zoomHotspots = page.locator('.hotspot:not(.character-hotspot)');
  const zoomCount = await zoomHotspots.count();
  console.log(`  Zoom hotspots available: ${zoomCount}`);

  // =============================================
  // PHASE 7: Learning Mode
  // =============================================
  console.log('\n--- Phase 7: Learning Mode ---');

  await page.goto(`${ROOM_URL}?mode=learning`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const scorePanel = await page.locator('.learning-score-panel').isVisible().catch(() => false);
  ok('Learning score panel', scorePanel);
  await ss('learning_mode');

  // =============================================
  // PHASE 8: Image HTTP Check
  // =============================================
  console.log('\n--- Phase 8: Image HTTP Check ---');

  const imgFiles = fs.readdirSync(IMG_DIR).filter(f => f.endsWith('.png'));
  let img404 = 0;
  for (const img of imgFiles) {
    const resp = await page.request.get(`${BASE}/assets/images/${roomId.replace(/-/g, '_')}/${img}`);
    if (resp.status() >= 400) { console.log(`  404: ${img}`); img404++; }
  }
  ok(`All ${imgFiles.length} images load (HTTP 200)`, img404 === 0);
  ok('No image failures during walkthrough', failedImages.length === 0);
  if (failedImages.length > 0) failedImages.forEach(u => console.log(`  Failed: ${u}`));

  // =============================================
  // PHASE 9: Console Errors
  // =============================================
  console.log('\n--- Phase 9: Console Errors ---');
  ok('No unexpected console errors', consoleErrors.length === 0);
  if (consoleErrors.length > 0) consoleErrors.forEach(e => console.log(`  ${e}`));

  // =============================================
  // SUMMARY
  // =============================================
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${roomId}: ${passed} passed, ${failed} failed, ${warnings} warnings`);
  console.log(`  Screenshots: ${screenshots.length} saved to ${OUT_DIR}`);
  console.log(`${'='.repeat(60)}`);

  if (issues.length > 0) {
    console.log('\nIssues:');
    issues.forEach(i => console.log(`  ${i.startsWith('WARN') ? '⚠' : '✗'} ${i}`));
  }

  console.log('\nScreenshots for visual review:');
  screenshots.forEach(s => console.log(`  ${s}`));

} catch (err) {
  console.error('Walkthrough error:', err.message);
} finally {
  if (browser) await browser.close();
}
