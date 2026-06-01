import { chromium } from 'playwright';
import fs from 'fs';

const BASE = process.env.TEST_URL || 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/project-management`;
const OUT_DIR = '/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/e2e-screenshots/pm';

let passCount = 0, failCount = 0;
const errors = [];

function assert(name, cond, info = '') {
  if (cond) { console.log(`  ✓ ${name}`); passCount++; }
  else { console.log(`  ✗ ${name}${info ? ' → ' + info : ''}`); failCount++; errors.push(`${name}${info ? ': ' + info : ''}`); }
}

async function shot(page, name) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  await page.screenshot({ path: `${OUT_DIR}/${name}.png`, fullPage: false });
}

async function dismissAnyDialogue(p, maxTries = 3) {
  for (let t = 0; t < maxTries; t++) {
    const panel = p.locator('.dialogue-panel');
    if ((await panel.count()) === 0) return;
    await panel.click({ force: true }).catch(() => {});
    await p.waitForTimeout(200);
    const cont = p.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
    if ((await cont.count()) > 0) {
      await cont.click({ force: true }).catch(() => {});
      await p.waitForTimeout(450);
    } else {
      await p.waitForTimeout(300);
    }
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('pomeil_player_name','TestPlayer'); sessionStorage.setItem('pomeil_login_warning_dismissed','true'); } catch(e){} });
  const page = await ctx.newPage();
  page.on('pageerror', err => { errors.push(`PAGE ERROR: ${err.message}`); failCount++; });
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`); });

  console.log('── Project Management visual playthrough ──');
  await page.goto(ROOM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(800);
  await shot(page, '01_intro');

  await page.getByRole('button', { name: /Start Managing/i }).click();
  await page.waitForTimeout(600);
  await shot(page, '02_main');

  // Click report
  await page.locator('.hotspot-layer > .hotspot').first().click({ force: true });
  await page.waitForTimeout(2600);
  await shot(page, '03_report_zoom');
  await dismissAnyDialogue(page); await dismissAnyDialogue(page);
  await page.waitForTimeout(500);
  await shot(page, '04_report_open_card');

  const reportCard = page.locator('mat-card-title').filter({ hasText: /Progress Report Summary/i });
  assert('Progress report card visible', await reportCard.isVisible({ timeout: 3000 }).catch(() => false));

  await page.getByRole('button', { name: /Close Report/i }).click();
  await page.waitForTimeout(2000);
  await dismissAnyDialogue(page); await dismissAnyDialogue(page);
  await page.waitForTimeout(400);
  await shot(page, '05_after_report');

  // Click notes
  await page.locator('.hotspot-layer > .hotspot').first().click({ force: true });
  await page.waitForTimeout(2600);
  await shot(page, '06_notes_zoom');
  await dismissAnyDialogue(page); await dismissAnyDialogue(page);
  await page.waitForTimeout(400);
  await shot(page, '07_objective_select');

  const objCard = page.locator('mat-card-title').filter({ hasText: /clear objective/i });
  assert('Objective select visible', await objCard.isVisible({ timeout: 3000 }).catch(() => false));

  for (const txt of ['Access cards', 'Cameras in entrance', 'Alarm system']) {
    await page.locator('.note-sticky').filter({ hasText: new RegExp(txt, 'i') }).first().click({ force: true });
    await page.waitForTimeout(250);
  }
  await page.getByRole('button', { name: /Save Objective/i }).click();
  await page.waitForTimeout(500);
  await dismissAnyDialogue(page);
  await shot(page, '08_deadline_select');

  // Click wrong deadline first (ASAP) to verify tooltip
  await page.getByRole('button', { name: /As soon as possible/i }).click({ force: true });
  await page.waitForTimeout(400);
  await shot(page, '09_deadline_wrong_tooltip');

  await page.getByRole('button', { name: /Within 3 months/i }).click({ force: true });
  await page.waitForTimeout(500);
  await dismissAnyDialogue(page);
  await page.waitForTimeout(1500);
  await shot(page, '10_after_objective');

  // Click laptop
  await page.locator('.hotspot-layer > .hotspot').first().click({ force: true });
  await page.waitForTimeout(2500);
  await shot(page, '11_laptop_zoom');
  await dismissAnyDialogue(page);
  await page.waitForTimeout(500);
  await shot(page, '12_emails_inbox');

  // Read all 4 emails
  for (let i = 0; i < 4; i++) {
    const row = page.locator('.email-row').nth(i);
    await row.click({ force: true });
    await page.waitForTimeout(300);
    await shot(page, `13_email_${i + 1}`);
    const back = page.getByRole('button', { name: /Back to inbox/i });
    if (await back.count()) await back.click({ force: true });
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(600);
  await shot(page, '14_email_compose');

  // Pick wrong reply first
  await page.getByRole('button', { name: /Try to keep everyone/i }).click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Send$/i }).click({ force: true });
  await page.waitForTimeout(500);
  await shot(page, '15_wrong_reply_feedback');

  // Correct reply
  await page.getByRole('button', { name: /Start simple/i }).click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Send$/i }).click({ force: true });
  await page.waitForTimeout(500);
  await dismissAnyDialogue(page);
  await page.waitForTimeout(3000); // phone call zoom out + ring
  await shot(page, '16_after_emails');

  // Click phone
  await page.locator('.hotspot-layer > .hotspot').first().click({ force: true });
  await page.waitForTimeout(2800);
  await shot(page, '17_phone_zoom');
  await dismissAnyDialogue(page);
  await page.waitForTimeout(500);
  await shot(page, '18_scope_reply');

  // Try wrong answer to verify it hides
  await page.getByRole('button', { name: /Reject it directly/i }).click({ force: true });
  await page.waitForTimeout(400);
  await shot(page, '19_scope_wrong');

  // Correct answer
  await page.getByRole('button', { name: /Acknowledge but redirect/i }).click({ force: true });
  await page.waitForTimeout(500);
  await dismissAnyDialogue(page);
  await dismissAnyDialogue(page);
  await dismissAnyDialogue(page);
  await dismissAnyDialogue(page);
  await page.waitForTimeout(1500);
  await shot(page, '20_after_phone');

  // Calendar
  await page.locator('.hotspot-layer > .hotspot').first().click({ force: true });
  await page.waitForTimeout(2800);
  await shot(page, '21_calendar_zoom');
  await dismissAnyDialogue(page);
  await page.waitForTimeout(2000); // caroline knock trigger
  await shot(page, '22_knock');

  // Click door
  await page.locator('.hotspot-layer > .hotspot').first().click({ force: true });
  await page.waitForTimeout(600);
  await dismissAnyDialogue(page);
  await page.waitForTimeout(500);
  await shot(page, '23_caroline_arrived');

  const carolineCount = await page.locator('.character-hotspot').count();
  assert('Caroline character hotspot visible', carolineCount > 0);

  // Click caroline
  await page.locator('.character-hotspot').first().click({ force: true });
  await page.waitForTimeout(500);

  // Conversation loop (7 steps)
  for (let i = 0; i < 7; i++) {
    const panel = page.locator('.dialogue-panel');
    await panel.click({ force: true }).catch(() => {});
    await page.waitForTimeout(200);
    const replyBtn = page.locator('.reply-btn');
    try {
      await replyBtn.waitFor({ state: 'visible', timeout: 3000 });
      await replyBtn.click({ force: true });
      await page.waitForTimeout(400);
      await panel.click({ force: true }).catch(() => {});
      await page.waitForTimeout(200);
      const cont = page.locator('.dialogue-panel button').filter({ hasText: /Continue/i }).first();
      if (await cont.count()) { await cont.click({ force: true }); await page.waitForTimeout(500); }
    } catch { break; }
  }
  await page.waitForTimeout(2000);
  await shot(page, '24_completion');

  const completion = page.locator('mat-card-title').filter({ hasText: /Project Management Complete/i });
  assert('Completion shown', await completion.isVisible({ timeout: 5000 }).catch(() => false));

  assert('No runtime errors', errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).length === 0,
    errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).join('; '));

  await browser.close();
  console.log(`\n── Results: ${passCount} passed, ${failCount} failed ──`);
  if (failCount > 0) { for (const e of errors) console.log(' - ' + e); process.exit(1); }
}

run().catch(err => { console.error('FATAL:', err); process.exit(2); });
