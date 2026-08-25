// Smoke test: load every escape room, click Start, verify no console errors
// (other than known pre-existing 404s).

import { chromium } from 'playwright';

const ROOMS = [
  'cultural-awareness', 'empathy', 'strategic-thinking', 'open-mindedness',
  'financial', 'stress-management', 'trust-building', 'active-listening',
  'adaptability', 'flexibility', 'interpersonal-skills', 'language-skills',
  'resilience', 'self-reliance', 'teamwork', 'tolerance', 'crm',
  'decision-making', 'leadership', 'legal-compliance', 'market-awareness',
  'motivating-others', 'business-planning', 'critical-thinking',
  'digital-skills', 'negotiation-skills', 'networking-skills',
  'risk-management', 'problem-solving', 'project-management'
];

const KNOWN_404S = ['zoom_laptop.png', 'box_under_desk_open.png'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  const page = await ctx.newPage();

  await page.goto('http://127.0.0.1:4200');
  await page.evaluate(() => localStorage.setItem('pomeil_player_name', 'TestPlayer'));

  let pass = 0, fail = 0;
  const failures = [];

  for (const room of ROOMS) {
    const errors = [];
    const handler = msg => { if (msg.type() === 'error') errors.push(msg.text()); };
    const errHandler = e => errors.push('PAGE: ' + e.message);
    page.on('console', handler);
    page.on('pageerror', errHandler);

    try {
      await page.goto(`http://127.0.0.1:4200/escape-rooms/${room}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const startBtn = page.locator('button').filter({ hasText: /^(Start Game|Enter |Go to|Start |Begin )/i }).first();
      if (await startBtn.count()) {
        await startBtn.click();
        await page.waitForTimeout(1500);
      }
      // Filter known 404s
      const meaningful = errors.filter(e => !KNOWN_404S.some(k => e.includes(k)) && !e.includes('Failed to load resource'));
      if (meaningful.length === 0) {
        console.log(`PASS  ${room}`);
        pass++;
      } else {
        console.log(`FAIL  ${room}  →  ${meaningful.slice(0, 2).join('; ')}`);
        fail++;
        failures.push({ room, errors: meaningful });
      }
    } catch (e) {
      console.log(`FAIL  ${room}  →  EXCEPTION: ${e.message}`);
      fail++;
      failures.push({ room, errors: [e.message] });
    }

    page.off('console', handler);
    page.off('pageerror', errHandler);
  }

  console.log(`\n========== Summary ==========`);
  console.log(`Passed: ${pass}    Failed: ${fail}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => {
      console.log(`  ${f.room}:`);
      f.errors.forEach(e => console.log(`    ! ${e}`));
    });
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
