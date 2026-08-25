// End-to-end test: reach the matching puzzle in Trust Building and verify:
//  1. The puzzle UI renders with "1./2./3./..." and "A./B./C./..." labels
//  2. Clicking Skip dismisses the puzzle overlay AND triggers the next dialogue
// This exercises the same code path that fixes Empathy (Task #4) since both rooms
// use the same matching-puzzle pattern.

import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  p.on('pageerror', e => errors.push('PAGE: ' + e.message));

  await p.goto('http://127.0.0.1:4200');
  await p.evaluate(() => localStorage.setItem('pomeil_player_name', 'TestPlayer'));

  // Use Trust Building — flow is well-documented and skip path leads to the matching puzzle quickly.
  await p.goto('http://127.0.0.1:4200/escape-rooms/trust-building');
  await p.waitForTimeout(800);
  await p.locator('button').filter({ hasText: /Enter the HR/i }).click();
  await p.waitForTimeout(800);

  async function adv() {
    const dpCount = await p.locator('.dialogue-panel').count();
    if (dpCount === 0) return false;
    await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
    await p.waitForFunction(() => {
      const dp = document.querySelector('.dialogue-panel');
      return !dp || !!dp.querySelector('.dialogue-actions');
    }, { timeout: 10000 }).catch(() => {});
    await p.waitForTimeout(150);
    const btn = p.locator('.dialogue-panel button').filter({ hasText: /^(Continue|Start)/i }).first();
    if (await btn.count()) { await btn.click({ force: true }); await p.waitForTimeout(500); return true; }
    return false;
  }

  // Click Kate to start dialogue chain (use direct DOM click to bypass interceptors)
  await p.evaluate(() => { const h = document.querySelectorAll('.character-hotspot')[0]; if (h) h.click(); });
  await p.waitForTimeout(1500);

  // Advance through Kate's intro dialogues until we see something else
  let steps = 0;
  while (steps < 30) {
    const matching = await p.locator('.matching-layout').count();
    if (matching > 0) break;
    const advanced = await adv();
    steps++;
    if (!advanced) {
      // Try clicking Kate again to trigger next dialogue (DOM click)
      await p.evaluate(() => { const h = document.querySelectorAll('.character-hotspot')[0]; if (h) h.click(); });
      await p.waitForTimeout(800);
    }
  }

  const matchingFound = await p.locator('.matching-layout').count() > 0;
  console.log(`[1] Matching puzzle reached after ${steps} dialogue advances: ${matchingFound ? 'YES' : 'NO'}`);

  if (matchingFound) {
    // Read the labels
    const labels = await p.evaluate(() => {
      const ml = Array.from(document.querySelectorAll('.match-label'));
      return ml.map(l => l.innerText.trim());
    });
    console.log(`[2] Match labels visible: [${labels.join(', ')}]`);

    // Verify labels are number-based on left and letter-based on right
    const hasNumbers = labels.some(l => /^\d+\.$/.test(l));
    const hasLetters = labels.some(l => /^[A-Z]\.$/.test(l));
    console.log(`[3] Has numeric labels: ${hasNumbers}    Has letter labels: ${hasLetters}`);

    // Click Skip to verify the puzzle dismissal flow works
    const skipBtn = p.locator('.skip-puzzle-btn').first();
    if (await skipBtn.count()) {
      await skipBtn.click({ force: true });
      await p.waitForTimeout(500);
      // Confirm skip
      const confirmBtn = p.locator('button').filter({ hasText: /^Skip Puzzle$/i }).last();
      if (await confirmBtn.count()) {
        await confirmBtn.click();
        await p.waitForTimeout(2500);
        // Verify the matching overlay is gone
        const stillVisible = await p.locator('.matching-layout').count();
        console.log(`[4] Matching overlay after skip: ${stillVisible === 0 ? 'GONE (correct)' : 'STILL VISIBLE (BUG!)'}`);
        // A dialogue should appear (system message)
        const dpCount = await p.locator('.dialogue-panel').count();
        console.log(`[5] Dialog after skip: ${dpCount > 0 ? 'visible' : 'none'}`);
      }
    }
  }

  console.log('\n--- Errors ---');
  if (errors.length === 0) console.log('  (none)');
  else errors.forEach(e => console.log(`  ! ${e}`));

  await browser.close();
})();
