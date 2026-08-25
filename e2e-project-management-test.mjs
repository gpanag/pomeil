import { chromium } from 'playwright';

const BASE = process.env.TEST_URL || 'http://localhost:4200';
const ROOM_URL = `${BASE}/escape-rooms/project-management`;

let passCount = 0;
let failCount = 0;
const errors = [];

function assert(name, cond, info = '') {
  if (cond) {
    console.log(`  ✓ ${name}`);
    passCount++;
  } else {
    console.log(`  ✗ ${name}${info ? ' → ' + info : ''}`);
    failCount++;
    errors.push(`${name}${info ? ': ' + info : ''}`);
  }
}

async function skipTyping(page) {
  await page.locator('.dialogue-panel').click({ force: true });
  await page.waitForTimeout(250);
}

async function dialogText(page) {
  return page.locator('.dialogue-panel .dialogue-text').textContent().catch(() => '');
}

async function clickContinue(page, label = /Continue/i) {
  const btn = page.locator('.dialogue-panel button').filter({ hasText: label }).first();
  try {
    await btn.waitFor({ state: 'visible', timeout: 5000 });
    await btn.click({ force: true });
    await page.waitForTimeout(400);
  } catch { /* no button */ }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1680, height: 1024 } });
  const page = await ctx.newPage();

  page.on('pageerror', err => { errors.push(`PAGE ERROR: ${err.message}`); failCount++; });
  page.on('console', msg => { if (msg.type() === 'error') errors.push(`CONSOLE ERROR: ${msg.text()}`); });

  console.log('── Project Management e2e ──');
  await page.goto(ROOM_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  const introCard = page.locator('.overlay.center mat-card-title').filter({ hasText: /Project Management/i });
  await introCard.waitFor({ state: 'visible', timeout: 15000 });
  assert('Intro popup visible', await introCard.isVisible());

  await page.getByRole('button', { name: /Start Managing/i }).click();
  await page.waitForTimeout(500);

  // Report hotspot
  const reportSpot = page.locator('.hotspot').first();
  assert('Report hotspot visible', await reportSpot.isVisible().catch(() => false));
  await reportSpot.click();
  await page.waitForTimeout(2500); // zoom animation

  // Two intro thoughts
  await skipTyping(page);
  await clickContinue(page);
  await skipTyping(page);
  await clickContinue(page);

  // Report card should be visible
  const reportCard = page.locator('mat-card-title').filter({ hasText: /Progress Report Summary/i });
  await reportCard.waitFor({ state: 'visible', timeout: 5000 });
  assert('Progress Report Summary card visible', await reportCard.isVisible());

  // Close report
  await page.getByRole('button', { name: /Close Report/i }).click();
  await page.waitForTimeout(2000);

  // Two closed thoughts
  await skipTyping(page);
  await clickContinue(page);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(500);

  // Notes hotspot visible
  await page.waitForTimeout(500);
  const notesSpots = page.locator('.hotspot');
  const notesCount = await notesSpots.count();
  assert('Notes hotspot available after report', notesCount >= 1, `got ${notesCount}`);

  // Click notes
  await notesSpots.first().click({ force: true });
  await page.waitForTimeout(2500);

  // Two intro dialogues (thought + dialogue)
  await skipTyping(page);
  await clickContinue(page);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(500);

  // Objective select overlay
  const objCard = page.locator('mat-card-title').filter({ hasText: /clear objective/i });
  assert('Objective select card visible', await objCard.isVisible({ timeout: 3000 }).catch(() => false));

  // Click correct notes: access cards, cameras in entrance, alarm system
  const correctNotes = ['Access cards', 'Cameras in entrance', 'Alarm system'];
  for (const txt of correctNotes) {
    const n = page.locator('.note-sticky').filter({ hasText: new RegExp(txt, 'i') }).first();
    await n.click({ force: true });
    await page.waitForTimeout(200);
  }
  // Save Objective
  await page.getByRole('button', { name: /Save Objective/i }).click();
  await page.waitForTimeout(500);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(500);

  // Deadline select
  const deadlineCard = page.locator('mat-card-title').filter({ hasText: /deadline/i });
  assert('Deadline select card visible', await deadlineCard.isVisible({ timeout: 3000 }).catch(() => false));

  // Pick "Within 3 months"
  await page.getByRole('button', { name: /Within 3 months/i }).click();
  await page.waitForTimeout(500);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(2000); // zoom out + main view

  // Laptop hotspot
  const laptopSpots = page.locator('.hotspot');
  const laptopCount = await laptopSpots.count();
  assert('Laptop hotspot available after objective', laptopCount >= 1);

  // Click laptop
  await laptopSpots.first().click({ force: true });
  await page.waitForTimeout(2500);

  // Emails intro
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(500);

  // Emails inbox
  const emailRows = page.locator('.email-row');
  const emailCount = await emailRows.count();
  assert(`4 emails in inbox (${emailCount})`, emailCount === 4);

  // Read all 4 emails (iterate by index so each gets clicked once)
  for (let i = 0; i < 4; i++) {
    const row = page.locator('.email-row').nth(i);
    await row.click({ force: true });
    await page.waitForTimeout(300);
    const back = page.getByRole('button', { name: /Back to inbox/i });
    if (await back.count()) await back.click({ force: true });
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(700);

  // Reply prompt should appear
  const replyShortlist = page.locator('.reply-shortlist button');
  const replyCount = await replyShortlist.count();
  assert(`4 reply shortcuts (${replyCount})`, replyCount === 4);

  // Click "Start simple, expand later" (correct)
  await page.getByRole('button', { name: /Start simple/i }).click({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /Send/i }).click({ force: true });
  await page.waitForTimeout(500);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(3000);

  // Phone ringing
  const phoneSpots = page.locator('.hotspot');
  assert('Phone hotspot visible', (await phoneSpots.count()) >= 1);
  await phoneSpots.first().click({ force: true });
  await page.waitForTimeout(2500);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(500);

  // Scope reply — pick correct "Acknowledge but redirect"
  const acknowledgeBtn = page.getByRole('button', { name: /Acknowledge but redirect/i });
  await acknowledgeBtn.waitFor({ state: 'visible', timeout: 5000 });
  await acknowledgeBtn.click({ force: true });
  await page.waitForTimeout(500);
  await skipTyping(page);
  await clickContinue(page);
  await skipTyping(page);
  await clickContinue(page);
  await skipTyping(page);
  await clickContinue(page);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(2000);

  // Calendar hotspot
  const calSpots = page.locator('.hotspot');
  assert('Calendar hotspot visible', (await calSpots.count()) >= 1);
  await calSpots.first().click({ force: true });
  await page.waitForTimeout(2500);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(2000);

  // Caroline knock → click front door
  const doorSpots = page.locator('.hotspot');
  assert('Door hotspot after calendar', (await doorSpots.count()) >= 1);
  await doorSpots.first().click({ force: true });
  await page.waitForTimeout(500);
  await skipTyping(page);
  await clickContinue(page);
  await page.waitForTimeout(500);

  // Click Caroline character
  const caroline = page.locator('.character-hotspot').first();
  await caroline.waitFor({ state: 'visible', timeout: 5000 });
  await caroline.click({ force: true });
  await page.waitForTimeout(500);

  // 7 conversation steps
  for (let i = 0; i < 7; i++) {
    await skipTyping(page);
    const replyBtn = page.locator('.reply-btn');
    try {
      await replyBtn.waitFor({ state: 'visible', timeout: 5000 });
      await replyBtn.click({ force: true });
      await page.waitForTimeout(400);
      await skipTyping(page);
      await clickContinue(page);
      await page.waitForTimeout(400);
    } catch (e) {
      console.log(`   conversation break at ${i}:`, e.message);
      break;
    }
  }

  await page.waitForTimeout(2500);
  // Completion
  const completion = page.locator('mat-card-title').filter({ hasText: /Project Management Complete/i });
  assert('Completion overlay shown', await completion.isVisible({ timeout: 5000 }).catch(() => false));

  // No runtime errors
  assert('No runtime errors', errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).length === 0,
    errors.filter(e => e.startsWith('PAGE ERROR') || e.startsWith('CONSOLE ERROR')).join('; '));

  await browser.close();

  console.log(`\n── Results: ${passCount} passed, ${failCount} failed ──`);
  if (failCount > 0) {
    for (const e of errors) console.log(' - ' + e);
    process.exit(1);
  }
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(2);
});
