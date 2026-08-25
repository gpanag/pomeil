import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  const p = await ctx.newPage();

  await p.goto('http://127.0.0.1:4200');
  await p.evaluate(() => localStorage.setItem('pomeil_player_name', 'TestPlayer'));

  // Test cultural-awareness
  await p.goto('http://127.0.0.1:4200/escape-rooms/cultural-awareness', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
  await p.locator('button').filter({ hasText: /Start Game/i }).click();
  await p.waitForTimeout(800);
  await p.locator('.character-hotspot').first().click();

  for (let step = 1; step <= 6; step++) {
    // Wait for typing to finish
    await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
    await p.waitForFunction(() => {
      const dp = document.querySelector('.dialogue-panel');
      return !dp || !!dp.querySelector('.dialogue-actions');
    }, { timeout: 8000 }).catch(() => {});

    const dpCount = await p.locator('.dialogue-panel').count();
    const txt = dpCount ? (await p.locator('.dialogue-panel').innerText()).substring(0, 60) : 'none';
    const hintBtn = await p.evaluate(() => {
      const h = document.querySelector('.hint-button');
      return h ? { animation: window.getComputedStyle(h).animationName, visible: h.offsetHeight > 0 } : null;
    });
    console.log(`Step ${step}: dpCount=${dpCount}, dialog="${txt}", hint=${JSON.stringify(hintBtn)}`);

    if (dpCount === 0) {
      console.log('  → No dialogue, end of advance loop');
      break;
    }
    const btn = p.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
    if (await btn.count() === 0) {
      console.log('  → No Continue button');
      break;
    }
    await btn.click({ force: true });
    await p.waitForTimeout(700);
  }

  await browser.close();
})();
