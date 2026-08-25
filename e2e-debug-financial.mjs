import { chromium } from 'playwright';

async function dismissAfterTyping(p) {
  // Click dialogue-content to skip typing if needed
  const dc = p.locator('.dialogue-content').first();
  if (await dc.count()) await dc.click({ force: true });
  await p.waitForTimeout(300);
  const btn = p.locator('.dialogue-panel button').filter({ hasText: /^Continue/i }).first();
  if (await btn.count()) {
    await btn.click({ force: true });
    await p.waitForTimeout(600);
    return true;
  }
  return false;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  const p = await ctx.newPage();
  p.on('console', m => { if (m.type() === 'error') console.log('CON ERR:', m.text()); });

  await p.goto('http://127.0.0.1:4200');
  await p.evaluate(() => localStorage.setItem('pomeil_player_name', 'TestPlayer'));

  await p.goto('http://127.0.0.1:4200/escape-rooms/financial', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1000);
  await p.locator('button').filter({ hasText: /Start Game/i }).first().click();
  await p.waitForTimeout(1000);
  await p.locator('.character-hotspot').first().click();

  for (let step = 1; step <= 8; step++) {
    const advanced = await dismissAfterTyping(p);
    const dpCount = await p.locator('.dialogue-panel').count();
    const txt = dpCount > 0 ? (await p.locator('.dialogue-panel').innerText()).substring(0, 60) : 'none';
    const pulsing = await p.locator('.show-hint-pulse').count();
    console.log(`Step ${step}: advanced=${advanced}, dialog="${txt}", pulsing=${pulsing}`);
    if (!advanced && dpCount === 0) {
      console.log('  → in non-dialogue state');
      break;
    }
  }

  await p.waitForTimeout(500);
  console.log('\nFinal:');
  console.log('  Dialog:', (await p.locator('.dialogue-panel').count()) > 0 ? (await p.locator('.dialogue-panel').innerText()).substring(0, 80) : 'none');
  console.log('  All hotspots:', await p.locator('.hotspot').count());
  console.log('  Pulsing:', await p.locator('.show-hint-pulse').count());

  await browser.close();
})();
