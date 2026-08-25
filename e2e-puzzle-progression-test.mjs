/**
 * E2E Puzzle Progression Test — Tests the critical path:
 *   puzzle appears → wrong answer 3x → answer revealed → continue → game advances
 *
 * This test verifies that skipping puzzles (via 3-wrong-attempt reveal)
 * properly progresses the game state for all escape rooms.
 *
 * Usage: node e2e-puzzle-progression-test.mjs [room-id]
 *        node e2e-puzzle-progression-test.mjs           (all rooms)
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';

const ROOMS = [
  'trust-building', 'active-listening', 'adaptability', 'flexibility',
  'interpersonal-skills', 'language-skills', 'leadership', 'legal-compliance',
  'market-awareness', 'motivating-others', 'negotiation-skills', 'networking-skills',
  'resilience', 'self-reliance', 'teamwork', 'tolerance',
  'crm', 'decision-making', 'business-planning', 'critical-thinking',
  'digital-skills', 'risk-management'
];

const roomsToTest = process.argv[2] ? [process.argv[2]] : ROOMS;

let totalPassed = 0, totalFailed = 0;
const allErrors = {};

async function dismissAllDialogues(page, maxAttempts = 15) {
  for (let i = 0; i < maxAttempts; i++) {
    const panel = page.locator('.dialogue-panel');
    if (!await panel.isVisible({ timeout: 800 }).catch(() => false)) break;

    // Click panel to skip typewriter
    await panel.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);

    // Click continue/dismiss button if visible
    const btn = page.locator('.dialogue-actions button');
    if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
      await btn.click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(400);
  }
}

async function dismissIntro(page) {
  const introBtn = page.locator('mat-card-actions button').first();
  if (await introBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await introBtn.click();
    await page.waitForTimeout(1000);
  }
  await dismissAllDialogues(page);
}

async function getGameState(page) {
  return await page.evaluate(() => {
    const el = document.querySelector('[class*="cinematic-container"]') ||
               document.querySelector('.game-container')?.parentElement;
    if (!el) return null;
    const comp = window.ng?.getComponent(el);
    if (!comp) return null;
    return {
      currentState: comp.currentState,
      stateName: comp.GameState ?
        Object.entries(comp.GameState).find(([k, v]) => v === comp.currentState)?.[0] :
        String(comp.currentState),
      isDoorOpen: comp.isDoorOpen || false,
      puzzleScores: comp.puzzleScores || [],
      puzzle1TotalWrong: comp.puzzle1TotalWrong,
      puzzle2TotalWrong: comp.puzzle2TotalWrong,
      puzzle3TotalWrong: comp.puzzle3TotalWrong,
    };
  });
}

async function findAndClickWrongAnswer(page) {
  // Try various puzzle UI patterns

  // 1. Multiple choice options (most common)
  const mcOptions = page.locator('.quiz-card .option-button, .quiz-card button, .wide-card .option-button, .wide-card button, .puzzle-option, .answer-option');
  const mcCount = await mcOptions.count().catch(() => 0);
  if (mcCount > 0) {
    // Click the LAST option (likely wrong)
    await mcOptions.nth(mcCount - 1).click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
    return 'multiple-choice';
  }

  // 2. True/False buttons
  const tfBtn = page.locator('button:has-text("False"), button:has-text("TRUE"), button:has-text("false")');
  if (await tfBtn.first().isVisible().catch(() => false)) {
    await tfBtn.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
    return 'true-false';
  }

  // 3. Generic buttons in quiz overlay
  const quizBtns = page.locator('.overlay.center button:not(.close-button):not(.hint-button)');
  const qbCount = await quizBtns.count().catch(() => 0);
  if (qbCount > 0) {
    await quizBtns.last().click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
    return 'generic-button';
  }

  // 4. Mat-radio buttons
  const radio = page.locator('mat-radio-button');
  if (await radio.first().isVisible().catch(() => false)) {
    await radio.last().click({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    // Then click submit/check
    const submit = page.locator('button:has-text("Submit"), button:has-text("Check"), button:has-text("Confirm")');
    if (await submit.first().isVisible().catch(() => false)) {
      await submit.first().click({ force: true }).catch(() => {});
    }
    await page.waitForTimeout(800);
    return 'radio';
  }

  // 5. Drag-and-drop / ordering — just click submit with wrong order
  const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Check"), button:has-text("Confirm"), button:has-text("Done")');
  if (await submitBtn.first().isVisible().catch(() => false)) {
    await submitBtn.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
    return 'submit-button';
  }

  return null;
}

async function checkRevealAndContinue(page) {
  // Check for answer reveal overlay
  const reveal = page.locator('.show-answer-overlay, .answer-overlay, .answer-revealed');
  const revealVisible = await reveal.isVisible({ timeout: 2000 }).catch(() => false);

  // Check for any continue/OK button after reveal
  const continueBtn = page.locator(
    'button:has-text("Continue"), button:has-text("OK"), button:has-text("Next"), ' +
    'button:has-text("Got it"), button:has-text("Proceed"), .answer-overlay button, ' +
    '.show-answer-overlay button'
  );

  if (await continueBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    await continueBtn.first().click({ force: true }).catch(() => {});
    await page.waitForTimeout(1000);
    return true;
  }

  // Some rooms auto-advance after showing reveal
  await page.waitForTimeout(2000);
  return revealVisible;
}

async function isPuzzleActive(page) {
  // Check if a puzzle/quiz overlay is currently visible
  const quizCard = page.locator('.quiz-card, .wide-card, .puzzle-container');
  const overlay = page.locator('.overlay.center:not(.intro-overlay)');

  const qVisible = await quizCard.isVisible().catch(() => false);
  const oVisible = await overlay.isVisible().catch(() => false);

  // Also check for puzzle-specific elements
  const hasOptions = await page.locator('.option-button, .puzzle-option, .answer-option, mat-radio-button').count().catch(() => 0);

  return qVisible || (oVisible && hasOptions > 0);
}

async function testRoom(roomId) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  let passed = 0, failed = 0;
  const errors = [];
  const consoleErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('audio') && !t.includes('play()') && !t.includes('NotAllowed') &&
          !t.includes('favicon') && !t.includes('.wav') && !t.includes('.mp3'))
        consoleErrors.push(t.substring(0, 120));
    }
  });

  function ok(name, condition) {
    if (condition) { passed++; }
    else { failed++; errors.push(name); console.log(`    ✗ ${name}`); }
  }

  try {
    // === PHASE 1: Load and get past intro ===
    await page.goto(`${BASE}/escape-rooms/${roomId}?mode=learning`, {
      waitUntil: 'networkidle', timeout: 30000
    });
    await page.waitForTimeout(2000);

    ok('Page loads', page.url().includes(roomId));
    await dismissIntro(page);

    const initialState = await getGameState(page);
    ok('Angular component accessible', initialState !== null);

    if (!initialState) {
      console.log(`    Cannot access component — skipping puzzle tests`);
      await browser.close();
      return { passed, failed, errors };
    }

    console.log(`    Initial state: ${initialState.stateName} (${initialState.currentState})`);

    // === PHASE 2: Navigate to first character and trigger dialogue chain ===
    // Click first character hotspot to start the game flow
    const charHotspot = page.locator('.character-hotspot').first();
    if (await charHotspot.isVisible({ timeout: 3000 }).catch(() => false)) {
      await charHotspot.click({ force: true });
      await page.waitForTimeout(1000);
      await dismissAllDialogues(page);
    }

    // === PHASE 3: Try to find and trigger puzzles ===
    // Use hint button to navigate, then look for puzzles
    let puzzlesFound = 0;
    let puzzlesCompleted = 0;
    let statesVisited = new Set();

    for (let attempt = 0; attempt < 50; attempt++) {
      const state = await getGameState(page);
      if (!state) break;

      const stateKey = `${state.currentState}`;
      if (statesVisited.has(stateKey) && statesVisited.size > 3) {
        // We're looping — try clicking hint
      }
      statesVisited.add(stateKey);

      // Check if we reached completion
      if (state.isDoorOpen ||
          (state.stateName && (state.stateName.includes('Completion') ||
           state.stateName.includes('Complete') || state.stateName.includes('Reveal') ||
           state.stateName.includes('AllQuests')))) {
        console.log(`    Reached end state: ${state.stateName}`);
        break;
      }

      // Check if a puzzle is active
      if (await isPuzzleActive(page)) {
        puzzlesFound++;
        console.log(`    Puzzle ${puzzlesFound} found at state: ${state.stateName}`);

        const stateBefore = state.currentState;

        // Try wrong answers 3 times
        for (let wrongAttempt = 0; wrongAttempt < 4; wrongAttempt++) {
          const puzzleStillActive = await isPuzzleActive(page);
          if (!puzzleStillActive) break;

          const clickResult = await findAndClickWrongAnswer(page);
          if (!clickResult) {
            // Can't find clickable answers — might be matching/ordering
            // Try clicking submit with current (wrong) state
            break;
          }
          await page.waitForTimeout(500);
        }

        // Check for reveal and continue
        const continued = await checkRevealAndContinue(page);
        await dismissAllDialogues(page);
        await page.waitForTimeout(1000);

        const stateAfter = await getGameState(page);
        if (stateAfter) {
          const advanced = stateAfter.currentState !== stateBefore;
          ok(`Puzzle ${puzzlesFound} advances game state (${state.stateName} → ${stateAfter.stateName})`, advanced);
          if (advanced) puzzlesCompleted++;
        }

        continue;
      }

      // Not a puzzle — try to advance the game
      // 1. Dismiss any dialogues
      await dismissAllDialogues(page, 5);

      // 2. Try clicking hint to get guidance
      const hintBtn = page.locator('.hint-button');
      if (await hintBtn.isVisible().catch(() => false)) {
        await hintBtn.click().catch(() => {});
        await page.waitForTimeout(500);
        await dismissAllDialogues(page, 3);
      }

      // 3. Click pulsing hotspots (hint-highlighted)
      const pulsingHotspot = page.locator('.show-hint-pulse, .hotspot.pulse, [class*="pulse"]');
      if (await pulsingHotspot.first().isVisible().catch(() => false)) {
        await pulsingHotspot.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(1500);
        await dismissAllDialogues(page);
        continue;
      }

      // 4. Click character hotspots
      const chars = page.locator('.character-hotspot');
      const charCount = await chars.count().catch(() => 0);
      for (let c = 0; c < charCount; c++) {
        if (await chars.nth(c).isVisible().catch(() => false)) {
          await chars.nth(c).click({ force: true }).catch(() => {});
          await page.waitForTimeout(1000);
          await dismissAllDialogues(page);
          break;
        }
      }

      // 5. Click interactive hotspots
      const hotspots = page.locator('.hotspot:not(.character-hotspot)');
      const hsCount = await hotspots.count().catch(() => 0);
      if (hsCount > 0) {
        const hsIndex = attempt % hsCount;
        if (await hotspots.nth(hsIndex).isVisible().catch(() => false)) {
          await hotspots.nth(hsIndex).click({ force: true }).catch(() => {});
          await page.waitForTimeout(1500);
          await dismissAllDialogues(page);
        }
      }

      // 6. Check for item popups and close them
      const closeBtn = page.locator('.item-popup-base .close-button, .popup-close, button:has-text("Close")');
      if (await closeBtn.first().isVisible().catch(() => false)) {
        await closeBtn.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
      }

      // 7. Check for zoom back button
      const backBtn = page.locator('.zoom-back-button, button:has-text("Back")');
      if (await backBtn.first().isVisible().catch(() => false)) {
        await backBtn.first().click({ force: true }).catch(() => {});
        await page.waitForTimeout(500);
      }

      await page.waitForTimeout(300);
    }

    // === PHASE 4: Final state check ===
    const finalState = await getGameState(page);
    if (finalState) {
      console.log(`    Final state: ${finalState.stateName} (${finalState.currentState})`);
      console.log(`    Door open: ${finalState.isDoorOpen}`);
      console.log(`    Puzzle scores: ${JSON.stringify(finalState.puzzleScores)}`);
      console.log(`    Puzzles found: ${puzzlesFound}, completed: ${puzzlesCompleted}`);

      ok('At least 1 puzzle was found and tested', puzzlesFound >= 1);
    }

    // Check for completion overlay
    const completionOverlay = page.locator('.completion-overlay, .game-complete, [class*="completion"]');
    const completionVisible = await completionOverlay.isVisible().catch(() => false);

    // Check learning score panel
    const scorePanel = page.locator('.learning-score-panel, .score-display, [class*="score"]');
    const scoreVisible = await scorePanel.isVisible().catch(() => false);

  } catch (err) {
    failed++;
    errors.push(`TEST_CRASH: ${err.message.substring(0, 100)}`);
  }

  await browser.close();
  return { passed, failed, errors, consoleErrors };
}

// === MAIN ===
console.log(`\nPuzzle Progression Test — ${roomsToTest.length} rooms\n`);

for (const roomId of roomsToTest) {
  process.stdout.write(`${roomId.padEnd(24)}`);

  try {
    const result = await testRoom(roomId);
    const status = result.failed === 0 ? '✓ PASS' : `✗ FAIL (${result.failed})`;
    console.log(`  ${status}${result.errors.length > 0 ? ' — ' + result.errors.join(', ') : ''}`);

    totalPassed += result.passed;
    totalFailed += result.failed;
    if (result.errors.length > 0) allErrors[roomId] = result.errors;
  } catch (err) {
    console.log(`  ✗ CRASH: ${err.message.substring(0, 80)}`);
    totalFailed++;
    allErrors[roomId] = [`CRASH: ${err.message.substring(0, 80)}`];
  }
}

console.log(`\n${'='.repeat(60)}`);
console.log(`TOTAL: ${totalPassed} passed, ${totalFailed} failed`);
if (Object.keys(allErrors).length > 0) {
  console.log(`\nFailed rooms:`);
  for (const [room, errs] of Object.entries(allErrors)) {
    console.log(`  ${room}: ${errs.join(', ')}`);
  }
}
console.log(`${'='.repeat(60)}`);
