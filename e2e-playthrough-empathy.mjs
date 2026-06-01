// Live playthrough of Empathy room to verify Task #4 — matching puzzle
// progression and skip behavior — actually works at runtime.

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGE: ' + e.message));

  await p.goto('http://127.0.0.1:4200');
  await p.evaluate(() => { localStorage.setItem('pomeil_player_name', 'TestPlayer'); sessionStorage.setItem('pomeil_login_warning_dismissed','true'); });

  await p.goto('http://127.0.0.1:4200/escape-rooms/empathy');
  await p.waitForTimeout(800);
  await p.locator('button').filter({ hasText: /Start Game/i }).click();
  await p.waitForTimeout(800);

  async function adv() {
    const dpCount = await p.locator('.dialogue-panel').count();
    if (dpCount === 0) return false;
    await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
    await p.waitForFunction(() => {
      const dp = document.querySelector('.dialogue-panel');
      return !dp || !!dp.querySelector('.dialogue-actions');
    }, { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(150);
    const btn = p.locator('.dialogue-panel button').filter({ hasText: /^(Continue|Start Quiz)/i }).first();
    if (await btn.count()) { await btn.click({ force: true }); await p.waitForTimeout(500); return true; }
    return false;
  }

  // Click coach (Dr. Elena) to start intro dialogues
  await p.locator('.character-hotspot').first().click();
  console.log('[1] Clicked coach. Advancing intro dialogues...');
  // Advance through coach intro (multiple dialogues)
  for (let i = 0; i < 5; i++) {
    if (!(await adv())) break;
  }
  await p.waitForTimeout(800);

  // Now should be in FindStones state. Find the stones hotspots.
  const hotspots = await p.locator('.hotspot').count();
  console.log(`[2] After intro: ${hotspots} non-character hotspots visible`);
  console.log(`    Dialog panel: ${(await p.locator('.dialogue-panel').count()) > 0 ? 'visible' : 'gone'}`);

  // Try clicking the coach to find next instruction
  await p.locator('.character-hotspot').first().click();
  await p.waitForTimeout(800);
  await adv();
  await p.waitForTimeout(500);

  // Look for the matching puzzle skip button approach.
  // First, we need to get to the matching puzzle. The flow is complex.
  // Easier: verify by directly checking if the matching puzzle UI has match-label
  // when triggered. But getting to that state requires playing the room.
  //
  // Alternative: navigate progressively, using the skip button on the puzzle.

  // Click hotspots in sequence to find stones (3 locations)
  for (let i = 0; i < 5; i++) {
    const hs = p.locator('.hotspot').first();
    if (await hs.count()) {
      await hs.click({ force: true });
      await p.waitForTimeout(2500); // wait for zoom animation
      // Dismiss any dialogue
      while (await p.locator('.dialogue-panel').count()) { if (!(await adv())) break; }
      // Click coach again
      const ch = p.locator('.character-hotspot').first();
      if (await ch.count()) await ch.click();
      await p.waitForTimeout(800);
      while (await p.locator('.dialogue-panel').count()) { if (!(await adv())) break; }
    }
    if (await p.locator('.matching-layout').count() > 0) {
      console.log(`[3] Reached matching puzzle at step ${i}`);
      break;
    }
  }

  // Check if matching puzzle visible
  const matchingVisible = await p.locator('.matching-layout').count();
  if (matchingVisible > 0) {
    console.log('[4] Matching puzzle IS rendered with match-label labels:');
    const labels = await p.evaluate(() => {
      const ml = Array.from(document.querySelectorAll('.match-label'));
      return ml.map(l => l.innerText.trim());
    });
    console.log('    labels:', labels);

    // Click skip button on matching puzzle
    const skipBtn = p.locator('.skip-puzzle-btn').first();
    if (await skipBtn.count()) {
      await skipBtn.click({ force: true });
      await p.waitForTimeout(500);
      // Confirm skip
      const confirm = p.locator('button').filter({ hasText: /^Skip Puzzle$/i }).last();
      if (await confirm.count()) {
        await confirm.click();
        console.log('[5] Confirmed skip');
        await p.waitForTimeout(1500);
        // Verify the puzzle overlay is gone immediately (Task #4 main fix)
        const overlayStill = await p.locator('.matching-layout').count();
        console.log(`[6] Matching puzzle overlay after skip: ${overlayStill === 0 ? 'GONE (correct)' : 'STILL VISIBLE (BUG)'}`);
        // Verify dialog appears (system_nextTask)
        const dpCount = await p.locator('.dialogue-panel').count();
        console.log(`[7] Dialog panel after skip: ${dpCount > 0 ? 'visible' : 'none'}`);
        // Click Continue on system_nextTask
        if (dpCount > 0) await adv();
        await p.waitForTimeout(800);
        // Should now show coach's puzzle1Complete dialogue automatically (Task #4 fix)
        const coachDialog = await p.locator('.dialogue-panel').count();
        if (coachDialog > 0) {
          const txt = (await p.locator('.dialogue-panel').innerText()).substring(0, 80);
          console.log(`[8] After dismissing system_nextTask, dialog: "${txt}"`);
          console.log('    → Coach dialogue auto-shown? ' + (txt.includes('Coach') || txt.includes('Elena') ? 'YES' : 'NO'));
        }
      }
    }
  } else {
    console.log('[4] Could not reach matching puzzle in this playthrough run');
  }

  if (errors.length) {
    console.log('\nConsole/page errors:');
    errors.filter(e => !e.includes('Failed to load resource')).forEach(e => console.log('  ! ' + e));
  }

  await browser.close();
})();
