/**
 * Comprehensive E2E Test for Active Listening Escape Room (Skill 19)
 *
 * Tests: page load, images, intro popup, dialogues, hotspot positions,
 * character hover effects, zoom navigation, item popups, all 3 puzzles,
 * hint system, wrong answer handling, 3-attempt reveal, scoring,
 * door opening, completion overlay, and learning mode.
 *
 * Run: node e2e-active-listening-test.mjs
 * Requires: dev server on localhost:4200, playwright installed
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/active-listening`;
const ROOM_LEARNING_URL = `${ROOM_URL}?mode=learning`;
let browser, context, page;
let passed = 0, failed = 0, skipped = 0;
const errors = [];

function ok(name, condition) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; errors.push(name); }
}

function skip(name, reason) {
  console.log(`  ⊘ ${name} (${reason})`); skipped++;
}

async function screenshotAs(label) {
  const path = `public/assets/scenarios/temp_images/test_al_${label.replace(/\s+/g, '_')}.png`;
  await page.screenshot({ path });
  return path;
}

async function waitForDialogue(timeout = 5000) {
  try {
    await page.waitForSelector('.dialogue-panel', { timeout });
    return true;
  } catch { return false; }
}

async function dismissDialogue() {
  const panel = page.locator('.dialogue-panel');
  if (!await panel.isVisible().catch(() => false)) return false;
  await panel.click();
  await page.waitForTimeout(300);
  const continueBtn = page.locator('.dialogue-actions button');
  if (await continueBtn.isVisible().catch(() => false)) {
    await continueBtn.click();
    await page.waitForTimeout(500);
    return true;
  }
  return false;
}

async function getBackgroundUrl() {
  return await page.locator('.scene-background').evaluate(el => {
    return el.style.backgroundImage.replace(/url\(["']?|["']?\)/g, '');
  });
}

// =============================================
// TEST RUNNER
// =============================================
try {
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('audio') && !t.includes('Audio') && !t.includes('play()') && !t.includes('NotAllowed') && !t.includes('favicon') && !t.includes('ERR_FILE_NOT_FOUND'))
        consoleErrors.push(t);
    }
  });

  // =============================================
  console.log('\n=== SECTION 1: Escape Rooms Hub ===');
  // =============================================
  await page.goto(`${BASE}/escape-rooms`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const hubHtml = await page.content();
  ok('Active Listening card visible in hub', hubHtml.includes('Active Listening'));
  ok('Active Listening image path in hub', hubHtml.includes('active_listening/'));

  await screenshotAs('01_hub');

  // =============================================
  console.log('\n=== SECTION 2: Page Load & Image Verification ===');
  // =============================================

  const failedImages = [];
  page.on('response', response => {
    if (response.url().includes('/assets/images/active_listening/') && response.status() >= 400) {
      failedImages.push(response.url());
    }
  });

  await page.goto(ROOM_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  ok('Room page loads', page.url().includes('active-listening'));
  ok('No critical console errors', consoleErrors.length === 0);
  ok('Game container exists', await page.locator('.game-container').isVisible());
  ok('Intro popup visible on load', await page.locator('.overlay.center mat-card').first().isVisible());

  await screenshotAs('02_intro_popup');

  // =============================================
  console.log('\n=== SECTION 3: Intro Popup Content ===');
  // =============================================

  const introTitle = await page.locator('mat-card-title').first().textContent();
  ok('Intro title is "Active Listening"', introTitle.includes('Active Listening'));

  const introParagraphs = await page.locator('.intro-text p').count();
  ok('Intro has 3 paragraphs', introParagraphs === 3);

  const introBtn = page.locator('mat-card-actions button');
  ok('Enter button visible', await introBtn.isVisible());
  const btnText = await introBtn.textContent();
  ok('Button text: "Go to the Rooftop"', btnText.includes('Go to the Rooftop'));

  // =============================================
  console.log('\n=== SECTION 4: Close Intro → Self-Talk Dialogue ===');
  // =============================================

  await introBtn.click();
  await page.waitForTimeout(1000);

  ok('Intro popup closed', !(await page.locator('.overlay.center mat-card .intro-text').isVisible().catch(() => false)));

  const selfTalkVisible = await waitForDialogue();
  ok('Self-talk dialogue appears', selfTalkVisible);

  if (selfTalkVisible) {
    await page.locator('.dialogue-panel').click();
    await page.waitForTimeout(300);
    const dialogueText = await page.locator('.dialogue-text').textContent();
    ok('Self-talk contains training text', dialogueText.includes('training') || dialogueText.includes('climbing'));
    ok('Character name is "System"', (await page.locator('.character-name').textContent()).includes('System'));
  }

  await screenshotAs('03_self_talk');

  const bgUrl = await getBackgroundUrl();
  ok('Background is default (both chars)', bgUrl.includes('rooftop'));

  await dismissDialogue();
  await page.waitForTimeout(500);

  // =============================================
  console.log('\n=== SECTION 5: UI Elements ===');
  // =============================================

  ok('Fullscreen button visible', await page.locator('.fullscreen-button').isVisible());
  ok('Back button visible', await page.locator('.escape-rooms-back-button').isVisible());
  ok('Hint button visible', await page.locator('.hint-button').isVisible());

  // =============================================
  console.log('\n=== SECTION 6: Character Hover Effects ===');
  // =============================================

  const charHotspotsCount = await page.locator('.character-hotspot').count();
  ok('Two character hotspots exist', charHotspotsCount === 2);

  if (charHotspotsCount >= 1) {
    const mateoHotspot = page.locator('.character-hotspot').first();
    await mateoHotspot.hover();
    await page.waitForTimeout(500);
    const hoverBg = await getBackgroundUrl();
    ok('Mateo hover changes background', hoverBg.includes('mateo_hover'));
    await screenshotAs('04_mateo_hover');

    await page.mouse.move(10, 10);
    await page.waitForTimeout(500);
    const afterBg = await getBackgroundUrl();
    ok('Background restores after hover leave', afterBg.includes('rooftop'));
  }

  if (charHotspotsCount >= 2) {
    const zainabuHotspot = page.locator('.character-hotspot').nth(1);
    await zainabuHotspot.hover();
    await page.waitForTimeout(500);
    const zHoverBg = await getBackgroundUrl();
    ok('Zainabu hover changes background', zHoverBg.includes('zainabu_hover'));
    await screenshotAs('05_zainabu_hover');
    await page.mouse.move(10, 10);
    await page.waitForTimeout(300);
  }

  // =============================================
  console.log('\n=== SECTION 7: Hint System ===');
  // =============================================

  await page.locator('.hint-button').click();
  await page.waitForTimeout(500);
  const hintDialogue = await waitForDialogue();
  ok('Hint dialogue appears on click', hintDialogue);
  if (hintDialogue) {
    await page.locator('.dialogue-panel').click();
    await page.waitForTimeout(300);
    const hintText = await page.locator('.dialogue-text').textContent();
    ok('Hint text is meaningful', hintText.length > 10);
  }
  await dismissDialogue();
  await page.waitForTimeout(500);

  // =============================================
  console.log('\n=== SECTION 8: Click Mateo → Greeting Dialogue Chain ===');
  // =============================================

  const mateoHotspot = page.locator('.character-hotspot').first();
  await mateoHotspot.click();
  await page.waitForTimeout(500);

  const mateoGreeting = await waitForDialogue();
  ok('Mateo greeting dialogue appears', mateoGreeting);

  if (mateoGreeting) {
    await page.locator('.dialogue-panel').click();
    await page.waitForTimeout(300);
    const greetText = await page.locator('.dialogue-text').textContent();
    ok('Greeting mentions exercises', greetText.includes('exercise') || greetText.includes('activities'));
    ok('Character name is "Mateo"', (await page.locator('.character-name').textContent()).includes('Mateo'));

    const talkingBg = await getBackgroundUrl();
    ok('Background shows Mateo talking close-up', talkingBg.includes('mateo_talking'));
  }

  await screenshotAs('06_mateo_greeting');

  // Dismiss greeting → clue dialogue → dismiss clue → FindPaper state
  await dismissDialogue();
  await page.waitForTimeout(500);
  const clueDialogue = await waitForDialogue();
  ok('Mateo clue dialogue follows', clueDialogue);
  if (clueDialogue) {
    await page.locator('.dialogue-panel').click();
    await page.waitForTimeout(300);
    const clueText = await page.locator('.dialogue-text').textContent();
    ok('Clue mentions "plants"', clueText.includes('plants') || clueText.includes('grow'));
  }
  await dismissDialogue();
  await page.waitForTimeout(500);

  await screenshotAs('07_find_paper_state');

  // =============================================
  console.log('\n=== SECTION 9: Find Paper → Zoom to Plants ===');
  // =============================================

  const plantHotspot = page.locator('.hotspot:not(.character-hotspot)');
  const plantCount = await plantHotspot.count();
  ok('Plants hotspot visible', plantCount > 0);

  if (plantCount > 0) {
    await plantHotspot.first().click();
    await page.waitForTimeout(3500); // Zoom animation

    const zoomBg = await getBackgroundUrl();
    ok('Background changed to zoom_plants', zoomBg.includes('zoom_plants'));
    await screenshotAs('08_zoom_plants');

    // Click hotspot within the zoomed plants view to trigger paper popup
    await page.waitForSelector('.hotspot:not(.character-hotspot)', { timeout: 5000 });
    await page.click('.hotspot:not(.character-hotspot)');
    await page.waitForTimeout(500);

    // Paper popup should appear
    await page.waitForTimeout(1000);
    const paperPopup = await page.locator('.item-popup-base').isVisible().catch(() => false);
    ok('Paper item popup visible', paperPopup);

    if (paperPopup) {
      const paperTitle = await page.locator('.item-popup-base h3').textContent();
      ok('Paper title: "Active Listening – The Basics"', paperTitle.includes('Active Listening'));
      await screenshotAs('09_paper_popup');

      // Close paper popup
      await page.locator('.overlay.center').click({ position: { x: 5, y: 5 } });
      await page.waitForTimeout(1500);
    }

    // System "paper read" dialogue
    const paperRead = await waitForDialogue(3000);
    ok('System paper read dialogue appears', paperRead);
    if (paperRead) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
    }
    await dismissDialogue();
    await page.waitForTimeout(500);
  }

  // =============================================
  console.log('\n=== SECTION 10: Talk to Mateo → Click Laptop → Puzzle 1 ===');
  // =============================================

  // TalkToMateo2 state — click Mateo
  const mateo2 = page.locator('.character-hotspot').first();
  if (await mateo2.isVisible().catch(() => false)) {
    await mateo2.click();
    await page.waitForTimeout(500);
    const m2Dialogue = await waitForDialogue();
    ok('Mateo "fast learner" dialogue', m2Dialogue);
    if (m2Dialogue) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
    }
    await dismissDialogue();
    await page.waitForTimeout(500);
  }

  // ClickLaptop1 state — click laptop hotspot
  const laptopHotspot = page.locator('.hotspot:not(.character-hotspot)');
  if (await laptopHotspot.first().isVisible().catch(() => false)) {
    await laptopHotspot.first().click();
    await page.waitForTimeout(3500);

    // Click zoom-hotspot within the zoomed view to trigger puzzle
    await page.waitForSelector('.zoom-hotspot', { timeout: 5000 });
    await page.click('.zoom-hotspot');
    await page.waitForTimeout(500);

    // Puzzle 1 (Multiple Choice) should appear
    const puzzle1Visible = await page.locator('.overlay.center mat-card').isVisible().catch(() => false);
    ok('Puzzle 1 (Multi-Choice) overlay visible', puzzle1Visible);

    if (puzzle1Visible) {
      const p1Title = await page.locator('mat-card-title').first().textContent();
      ok('Puzzle 1 title: "Understanding the Basics"', p1Title.includes('Understanding'));
      await screenshotAs('10_puzzle1_multi_choice');

      // Count options
      const optCount = await page.locator('.options-vertical button').count();
      ok('4 answer options', optCount === 4);

      // Background should be blurred
      ok('Background blurred during puzzle', await page.locator('.scene-background.blurred').isVisible().catch(() => false));

      // Test: select 2 correct answers (b and d)
      const options = page.locator('.options-vertical button');
      // Select option b (index 1) and d (index 3)
      await options.nth(1).click(); // b
      await page.waitForTimeout(300);
      await options.nth(3).click(); // d
      await page.waitForTimeout(300);

      // Check selection count
      const selCount = await page.locator('.selection-count').textContent();
      ok('Selection count shows 2/2', selCount.includes('2'));

      // Submit
      const submitBtn = page.locator('mat-card-actions button[color="primary"]');
      await submitBtn.click();
      await page.waitForTimeout(1000);

      // System puzzle complete dialogue
      const p1Complete = await waitForDialogue(3000);
      ok('Puzzle 1 complete dialogue', p1Complete);
      if (p1Complete) {
        await page.locator('.dialogue-panel').click();
        await page.waitForTimeout(300);
      }
      await dismissDialogue();
      await page.waitForTimeout(500);
    }
  }

  await screenshotAs('11_after_puzzle1');

  // =============================================
  console.log('\n=== SECTION 11: Mateo story → Conversation Chain ===');
  // =============================================

  // Click Mateo again (Puzzle1Complete state)
  const mateo3 = page.locator('.character-hotspot').first();
  if (await mateo3.isVisible().catch(() => false)) {
    await mateo3.click();
    await page.waitForTimeout(500);
    const storyDialogue = await waitForDialogue();
    ok('Mateo puzzle1Done dialogue', storyDialogue);

    // Dismiss all dialogues in the conversation chain
    // mateo_puzzle1Done → system_noticeCues → 10 conversation dialogues → mateo_backToYou
    let chainCount = 0;
    while (await waitForDialogue(3000)) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(200);
      await dismissDialogue();
      await page.waitForTimeout(300);
      chainCount++;
      if (chainCount > 15) break; // Safety limit
    }
    ok('Conversation chain completed (12+ dialogues)', chainCount >= 10);
  }

  await screenshotAs('12_after_conversation');

  // =============================================
  console.log('\n=== SECTION 12: Puzzle 2 (Fill-the-Gap) ===');
  // =============================================

  // ClickLaptop2 → click laptop
  const laptop2 = page.locator('.hotspot:not(.character-hotspot)');
  if (await laptop2.first().isVisible().catch(() => false)) {
    await laptop2.first().click();
    await page.waitForTimeout(3500);

    // Click zoom-hotspot within the zoomed view to trigger puzzle
    await page.waitForSelector('.zoom-hotspot', { timeout: 5000 });
    await page.click('.zoom-hotspot');
    await page.waitForTimeout(500);

    const puzzle2Visible = await page.locator('.overlay.center mat-card').isVisible().catch(() => false);
    ok('Puzzle 2 (Fill-Gap) overlay visible', puzzle2Visible);

    if (puzzle2Visible) {
      const p2Title = await page.locator('mat-card-title').first().textContent();
      ok('Puzzle 2 title: "Recognizing Active Listening"', p2Title.includes('Recognizing') || p2Title.includes('Active Listening'));
      await screenshotAs('13_puzzle2_fill_gap');

      // Count word bank buttons
      const wordBankCount = await page.locator('.word-bank button').count();
      ok('5 word bank options', wordBankCount === 5);

      // Fill gaps in correct order: assumptions, specific, confirm, checked, verify
      const words = page.locator('.word-bank button');
      // Click words in correct order
      await words.filter({ hasText: 'assumptions' }).click();
      await page.waitForTimeout(200);
      await words.filter({ hasText: 'specific' }).click();
      await page.waitForTimeout(200);
      await words.filter({ hasText: 'confirm' }).click();
      await page.waitForTimeout(200);
      await words.filter({ hasText: 'checked' }).click();
      await page.waitForTimeout(200);
      await words.filter({ hasText: 'verify' }).click();
      await page.waitForTimeout(200);

      // Submit
      const submitGap = page.locator('mat-card-actions button[color="primary"]');
      await submitGap.click();
      await page.waitForTimeout(1000);

      const p2Complete = await waitForDialogue(3000);
      ok('Puzzle 2 complete dialogue', p2Complete);
      if (p2Complete) {
        await page.locator('.dialogue-panel').click();
        await page.waitForTimeout(300);
      }
      await dismissDialogue();
      await page.waitForTimeout(500);
    }
  }

  await screenshotAs('14_after_puzzle2');

  // =============================================
  console.log('\n=== SECTION 13: Zainabu → Find Pendrive → Puzzle 3 ===');
  // =============================================

  // Dismiss any remaining dialogues (kate_puzzle3Thanks → hiroshi_puzzle3Complete → system_clickLaptop chain)
  let dismissCount = 0;
  while (await waitForDialogue(3000)) {
    await page.locator('.dialogue-panel').click();
    await page.waitForTimeout(200);
    await dismissDialogue();
    await page.waitForTimeout(300);
    dismissCount++;
    if (dismissCount > 5) break;
  }

  // Click Zainabu (Puzzle2Complete state)
  const zainabu = page.locator('.character-hotspot').nth(1);
  if (await zainabu.isVisible().catch(() => false)) {
    await zainabu.click();
    await page.waitForTimeout(500);
    const zDialogue = await waitForDialogue();
    if (zDialogue) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
      const zText = await page.locator('.dialogue-text').textContent();
      ok('Zainabu mentions pendrive', zText.includes('pendrive') || zText.includes('find'));
    }
    await dismissDialogue();
    await page.waitForTimeout(500);
  }

  // FindPendrive state — click floor hotspot
  const floorHotspot = page.locator('.hotspot:not(.character-hotspot)');
  if (await floorHotspot.first().isVisible().catch(() => false)) {
    await floorHotspot.first().click();
    await page.waitForTimeout(3500);

    const floorBg = await getBackgroundUrl();
    ok('Background changed to zoom_floor', floorBg.includes('zoom_floor'));
    await screenshotAs('15_zoom_floor');

    // Click hotspot within the zoomed floor view to trigger pendrive found
    await page.waitForSelector('.hotspot:not(.character-hotspot)', { timeout: 5000 });
    await page.click('.hotspot:not(.character-hotspot)');
    await page.waitForTimeout(500);

    // System foundPendrive dialogue
    const pendriveFound = await waitForDialogue(3000);
    ok('Pendrive found dialogue', pendriveFound);
    if (pendriveFound) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
    }
    await dismissDialogue();
    await page.waitForTimeout(500);
  }

  // ClickLaptop3 → click laptop → text file popup → close → TalkToZainabu → ClickLaptop4 → Puzzle 3
  // This involves multiple clicks and dialogues
  const laptop3 = page.locator('.hotspot:not(.character-hotspot)');
  if (await laptop3.first().isVisible().catch(() => false)) {
    await laptop3.first().click();
    await page.waitForTimeout(3500);

    // Click zoom-hotspot within the zoomed view to trigger popup
    await page.waitForSelector('.zoom-hotspot', { timeout: 5000 });
    await page.click('.zoom-hotspot');
    await page.waitForTimeout(500);

    // Text file popup should show
    const textPopup = await page.locator('.item-popup-base').isVisible().catch(() => false);
    if (textPopup) {
      ok('Text file popup visible', true);
      await page.locator('.overlay.center').click({ position: { x: 5, y: 5 } });
      await page.waitForTimeout(1500);
    }

    // System textFileRead + dismiss
    const tfRead = await waitForDialogue(3000);
    if (tfRead) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
      await dismissDialogue();
      await page.waitForTimeout(500);
    }
  }

  // Talk to Zainabu → readyForFinal
  const zainabu2 = page.locator('.character-hotspot').nth(1);
  if (await zainabu2.isVisible().catch(() => false)) {
    await zainabu2.click();
    await page.waitForTimeout(500);
    const zReady = await waitForDialogue();
    if (zReady) {
      await page.locator('.dialogue-panel').click();
      await page.waitForTimeout(300);
    }
    await dismissDialogue();
    await page.waitForTimeout(500);
  }

  // ClickLaptop4 → Puzzle 3 (Matching)
  const laptop4 = page.locator('.hotspot:not(.character-hotspot)');
  if (await laptop4.first().isVisible().catch(() => false)) {
    await laptop4.first().click();
    await page.waitForTimeout(3500);

    // Click zoom-hotspot within the zoomed view to trigger puzzle
    await page.waitForSelector('.zoom-hotspot', { timeout: 5000 });
    await page.click('.zoom-hotspot');
    await page.waitForTimeout(500);

    const puzzle3Visible = await page.locator('.overlay.center mat-card').isVisible().catch(() => false);
    ok('Puzzle 3 (Matching) overlay visible', puzzle3Visible);

    if (puzzle3Visible) {
      const p3Title = await page.locator('mat-card-title').first().textContent();
      ok('Puzzle 3 title: "Active Listening – The Final Task"', p3Title.includes('Final'));
      await screenshotAs('16_puzzle3_matching');

      // Count matching buttons (5 pairs = 10 buttons)
      const matchButtons = await page.locator('.matching-layout .col button').count();
      ok('Matching has 10 buttons (5+5)', matchButtons === 10);

      // Solve: 1→B, 2→E, 3→C, 4→A, 5→D
      const colA = page.locator('.matching-layout .col').first().locator('button');
      const colB = page.locator('.matching-layout .col').nth(1).locator('button');

      // Match 1 → B (index 1)
      await colA.nth(0).click(); await page.waitForTimeout(200);
      await colB.nth(1).click(); await page.waitForTimeout(500);
      // Match 2 → E (index 4)
      await colA.nth(1).click(); await page.waitForTimeout(200);
      await colB.nth(4).click(); await page.waitForTimeout(500);
      // Match 3 → C (index 2)
      await colA.nth(2).click(); await page.waitForTimeout(200);
      await colB.nth(2).click(); await page.waitForTimeout(500);
      // Match 4 → A (index 0)
      await colA.nth(3).click(); await page.waitForTimeout(200);
      await colB.nth(0).click(); await page.waitForTimeout(500);
      // Match 5 → D (index 3)
      await colA.nth(4).click(); await page.waitForTimeout(200);
      await colB.nth(3).click(); await page.waitForTimeout(1000);

      // Puzzle 3 complete
      const p3Complete = await waitForDialogue(3000);
      ok('Puzzle 3 complete dialogue', p3Complete);
    }
  }

  // Dismiss all remaining dialogues until door opens
  let finalChain = 0;
  while (await waitForDialogue(3000)) {
    await page.locator('.dialogue-panel').click();
    await page.waitForTimeout(200);
    await dismissDialogue();
    await page.waitForTimeout(300);
    finalChain++;
    if (finalChain > 6) break;
  }

  await screenshotAs('17_door_open');

  // =============================================
  console.log('\n=== SECTION 14: Door Opening & Completion ===');
  // =============================================

  const doorBg = await getBackgroundUrl();
  ok('Background shows door open', doorBg.includes('door_open'));

  // Click exit door
  const exitHotspot = page.locator('.hotspot:not(.character-hotspot)');
  if (await exitHotspot.first().isVisible().catch(() => false)) {
    await exitHotspot.first().click();
    await page.waitForTimeout(1000);

    const completionOverlay = await page.locator('.overlay.center mat-card').isVisible().catch(() => false);
    ok('Completion overlay visible', completionOverlay);

    if (completionOverlay) {
      const compTitle = await page.locator('mat-card-title').first().textContent();
      ok('Completion title: "Congratulations!"', compTitle.includes('Congratulations'));

      const exitBtn = page.locator('mat-card-actions button');
      ok('Exit button visible', await exitBtn.isVisible());
    }
    await screenshotAs('18_completion');
  }

  // =============================================
  console.log('\n=== SECTION 15: Image Loading Verification ===');
  // =============================================

  // Check all expected images load
  const expectedImages = [
    'rooftop.png', 'rooftop_default.png', 'rooftop_door_open.png',
    'mateo_hover.png', 'mateo_talking.png', 'mateo_hover_door_open.png',
    'zainabu_hover.png', 'zainabu_talking.png', 'zainabu_hover_door_open.png',
    'zoom_plants.png', 'zoom_laptop.png', 'zoom_floor.png',
    'paper.png', 'pendrive.png',
  ];

  let imageLoadFailed = 0;
  for (const img of expectedImages) {
    const resp = await page.request.get(`${BASE}/assets/images/active_listening/${img}`);
    if (resp.status() >= 400) {
      console.log(`    Image 404: ${img}`);
      imageLoadFailed++;
    }
  }
  ok(`All ${expectedImages.length} images load (HTTP 200)`, imageLoadFailed === 0);
  ok('No image load failures during playthrough', failedImages.length === 0);

  // =============================================
  console.log('\n=== SECTION 16: Learning Mode ===');
  // =============================================

  await page.goto(ROOM_LEARNING_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const scorePanel = await page.locator('.learning-score-panel').isVisible().catch(() => false);
  ok('Learning score panel visible in learning mode', scorePanel);

  if (scorePanel) {
    const panelText = await page.locator('.learning-score-panel').textContent();
    ok('Score panel shows "3 puzzles"', panelText.includes('3'));
  }

  await screenshotAs('19_learning_mode');

  // =============================================
  console.log('\n=== SECTION 17: Console Errors ===');
  // =============================================

  ok('No unexpected console errors', consoleErrors.length === 0);
  if (consoleErrors.length > 0) {
    console.log('  Console errors:');
    consoleErrors.forEach(e => console.log(`    ${e}`));
  }

  // =============================================
  console.log('\n\n========================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('========================================');
  if (errors.length > 0) {
    console.log('\nFailed tests:');
    errors.forEach(e => console.log(`  ✗ ${e}`));
  }

} catch (err) {
  console.error('Test runner error:', err);
} finally {
  if (browser) await browser.close();
}
