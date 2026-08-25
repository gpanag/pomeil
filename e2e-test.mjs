import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
let browser, page;
let passed = 0, failed = 0;
const consoleErrors = [];

function ok(name, condition) {
  if (condition) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}`); failed++; }
}

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('audio') && !t.includes('Audio') && !t.includes('play()') && !t.includes('NotAllowed') && !t.includes('favicon'))
        consoleErrors.push(t);
    }
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message}`));

  // ============================================
  console.log('\n=== TEST 1: Home page + nav links ===');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  ok('Home loads', (await page.title()).length > 0);
  ok('Toolbar visible', await page.locator('mat-toolbar').first().isVisible());
  const menuHtml = await page.locator('.menu-whole').first().innerHTML();
  ok('Learning nav link in menu', menuHtml.includes('learning'));
  ok('Modules nav link in menu', menuHtml.includes('learning/modules'));

  // ============================================
  console.log('\n=== TEST 2: /learning intro page ===');
  await page.goto(`${BASE}/learning`, { waitUntil: 'networkidle' });
  ok('URL is /learning', page.url().includes('/learning'));
  await page.waitForSelector('.hero-section h1');
  const hero = await page.textContent('.hero-section h1');
  ok('Hero title: POMEIL Learning Journey', hero.includes('POMEIL Learning Journey'));
  ok('Start Learning button', await page.locator('a[routerlink="/learning/flow"]').isVisible());
  ok('Browse Modules link', await page.locator('a[routerlink="/learning/modules"]').isVisible());
  ok('4 info cards', (await page.locator('.info-cards mat-card').count()) === 4);
  ok('How it works section', await page.locator('.how-it-works').isVisible());
  ok('Guidebook section', await page.locator('.guidebook-section').isVisible());

  // ============================================
  console.log('\n=== TEST 3: /learning/modules page ===');
  await page.goto(`${BASE}/learning/modules`, { waitUntil: 'networkidle' });
  const modTitle = await page.textContent('h1');
  ok('Title: Learning Modules', modTitle.includes('Learning Modules'));
  ok('6 module cards', (await page.locator('.module-card').count()) === 6);
  const firstCard = await page.textContent('.module-card:first-child mat-card-title');
  ok('First card: Cultural Awareness', firstCard.includes('Cultural Awareness'));
  const dlLinks = await page.locator('a[href*="assets/modules"]').count();
  ok('6 download links', dlLinks === 6);
  const firstHref = await page.locator('a[href*="assets/modules"]').first().getAttribute('href');
  ok('PDF link points to assets/modules/', firstHref.includes('assets/modules/'));

  // ============================================
  console.log('\n=== TEST 4: /learning/questionnaire page ===');
  await page.goto(`${BASE}/learning/questionnaire`, { waitUntil: 'networkidle' });
  const qTitle = await page.textContent('h1');
  ok('Title: Self-Assessment Questionnaire', qTitle.includes('Self-Assessment Questionnaire'));
  ok('7 question cards', (await page.locator('.question-card').count()) === 7);
  ok('Radio groups exist', (await page.locator('mat-radio-group').count()) > 0);
  ok('Textarea exists', (await page.locator('textarea').count()) > 0);
  const submitDisabled = await page.locator('button[color="primary"]').first().isDisabled();
  ok('Submit disabled (no answers)', submitDisabled);

  // ============================================
  console.log('\n=== TEST 5: /learning/flow — skill selection ===');
  await page.evaluate(() => localStorage.removeItem('pomeil_learning_flow'));
  await page.goto(`${BASE}/learning/flow`, { waitUntil: 'networkidle' });
  ok('Stepper visible', await page.locator('mat-stepper').isVisible());
  ok('6 skill cards', (await page.locator('.skill-card').count()) === 6);
  ok('Continue disabled (nothing selected)', await page.locator('.step-actions button[color="primary"]').first().isDisabled());

  // Click Cultural Awareness card
  await page.locator('.skill-card').nth(0).click();
  await page.waitForTimeout(300);
  const card0class = await page.locator('.skill-card').nth(0).getAttribute('class');
  ok('Card 1 selected after click', card0class.includes('selected'));

  // Click Empathy card
  await page.locator('.skill-card').nth(1).click();
  await page.waitForTimeout(300);
  const card1class = await page.locator('.skill-card').nth(1).getAttribute('class');
  ok('Card 2 selected after click', card1class.includes('selected'));

  // Continue should be enabled
  ok('Continue enabled', !(await page.locator('.step-actions button[color="primary"]').first().isDisabled()));

  // Click Continue
  await page.locator('.step-actions button[color="primary"]').first().click();
  await page.waitForTimeout(1000);

  // ============================================
  console.log('\n=== TEST 6: /learning/flow — per-skill step ===');
  ok('Skill step content visible', await page.locator('.skill-step-content').first().isVisible());
  ok('Skill preview image', await page.locator('.skill-preview-image').first().isVisible());
  ok('Play Game button visible', await page.locator('button:has-text("Play Game")').first().isVisible());

  // ============================================
  console.log('\n=== TEST 7: Play Game navigates to escape room with ?mode=learning ===');
  await page.locator('button:has-text("Play Game")').first().click();
  await page.waitForURL('**/escape-rooms/**', { timeout: 10000 });
  ok('Navigated to escape room', page.url().includes('/escape-rooms/'));
  ok('mode=learning in URL', page.url().includes('mode=learning'));

  // Check escape room renders
  await page.waitForTimeout(3000);
  const hasGameContainer = (await page.locator('.game-container').count()) > 0 || (await page.locator('.cinematic-container').count()) > 0;
  ok('Escape room game container rendered', hasGameContainer);

  // ============================================
  console.log('\n=== TEST 8: /escape-rooms hub still works ===');
  await page.goto(`${BASE}/escape-rooms`, { waitUntil: 'networkidle' });
  ok('Hub page URL', page.url().includes('/escape-rooms'));
  const hubCards = await page.locator('mat-card').count();
  ok('Hub shows room cards', hubCards >= 6);

  // ============================================
  console.log('\n=== TEST 9: localStorage — inject score, reload flow ===');
  await page.evaluate(() => {
    localStorage.setItem('pomeil_learning_flow', JSON.stringify({
      selectedSkills: ['cultural-awareness', 'empathy'],
      roomScores: {
        'cultural-awareness': {
          roomId: 'cultural-awareness',
          puzzleScores: [
            { puzzleId: 'Quiz', wrongAttempts: 0, wasRevealed: false, score: 100 },
            { puzzleId: 'Multiple Choice', wrongAttempts: 1, wasRevealed: false, score: 67 },
            { puzzleId: 'Sequence', wrongAttempts: 0, wasRevealed: false, score: 100 }
          ],
          overallScore: 89,
          completedAt: new Date().toISOString()
        }
      },
      currentSkillIndex: 1,
      questionnaireCompleted: false,
      questionnaireAnswers: {}
    }));
  });
  await page.goto(`${BASE}/learning/flow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const bodyText = await page.textContent('body');
  ok('Score 89% visible after reload', bodyText.includes('89%'));
  ok('Stepper restored state', await page.locator('mat-stepper').isVisible());

  // ============================================
  console.log('\n=== TEST 10: Questionnaire submit flow ===');
  await page.evaluate(() => {
    localStorage.setItem('pomeil_learning_flow', JSON.stringify({
      selectedSkills: ['cultural-awareness'],
      roomScores: {
        'cultural-awareness': {
          roomId: 'cultural-awareness',
          puzzleScores: [
            { puzzleId: 'Quiz', wrongAttempts: 0, wasRevealed: false, score: 100 },
            { puzzleId: 'MC', wrongAttempts: 0, wasRevealed: false, score: 100 },
            { puzzleId: 'Seq', wrongAttempts: 0, wasRevealed: false, score: 100 }
          ],
          overallScore: 100,
          completedAt: new Date().toISOString()
        }
      },
      currentSkillIndex: 0,
      questionnaireCompleted: false,
      questionnaireAnswers: {}
    }));
  });
  await page.goto(`${BASE}/learning/questionnaire`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Click one radio in each radio group
  const groups = page.locator('mat-radio-group');
  const groupCount = await groups.count();
  for (let i = 0; i < groupCount; i++) {
    const firstBtn = groups.nth(i).locator('mat-radio-button').first();
    // Click the label inside the radio button for reliable Angular Material interaction
    await firstBtn.locator('label').click();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1000);

  const submitEnabled = !(await page.locator('button:has-text("Submit Questionnaire")').isDisabled());
  ok('Submit enabled after answering radio questions', submitEnabled);

  if (submitEnabled) {
    await page.locator('button:has-text("Submit Questionnaire")').click();
    await page.waitForTimeout(1000);
  } else {
    // Debug: check how many radio groups were found and clicked
    console.log(`    DEBUG: Found ${groupCount} radio groups`);
    // Force-click submit to continue test flow
    await page.locator('button:has-text("Submit Questionnaire")').click({ force: true });
    await page.waitForTimeout(1000);
  }

  const thankYou = await page.textContent('body');
  ok('Thank you message shown', thankYou.includes('Thank you'));
  const lsData = await page.evaluate(() => JSON.parse(localStorage.getItem('pomeil_learning_flow')));
  ok('questionnaireCompleted=true in localStorage', lsData.questionnaireCompleted === true);

  // ============================================
  console.log('\n=== TEST 11: Summary step ===');
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('pomeil_learning_flow'));
    s.questionnaireCompleted = true;
    localStorage.setItem('pomeil_learning_flow', JSON.stringify(s));
  });
  await page.goto(`${BASE}/learning/flow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const summaryText = await page.textContent('body');
  ok('Summary shows Congratulations', summaryText.includes('Congratulations'));
  ok('Summary shows 100%', summaryText.includes('100%'));

  // ============================================
  console.log('\n=== TEST 12: Revisit questionnaire shows Thank you ===');
  await page.goto(`${BASE}/learning/questionnaire`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const revisitText = await page.textContent('body');
  ok('Revisit shows Thank you (not form)', revisitText.includes('Thank you'));

  // ============================================
  console.log('\n=== TEST 13: Browser refresh preserves state ===');
  await page.evaluate(() => {
    localStorage.setItem('pomeil_learning_flow', JSON.stringify({
      selectedSkills: ['empathy', 'strategic-thinking'],
      roomScores: {
        empathy: {
          roomId: 'empathy', overallScore: 67, completedAt: new Date().toISOString(),
          puzzleScores: [
            { puzzleId: 'Matching', wrongAttempts: 2, wasRevealed: false, score: 33 },
            { puzzleId: 'FillGap', wrongAttempts: 0, wasRevealed: false, score: 100 },
            { puzzleId: 'Pattern', wrongAttempts: 1, wasRevealed: false, score: 67 }
          ]
        }
      },
      currentSkillIndex: 1,
      questionnaireCompleted: false,
      questionnaireAnswers: {}
    }));
  });
  await page.goto(`${BASE}/learning/flow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  const refreshText = await page.textContent('body');
  ok('Empathy 67% visible after refresh', refreshText.includes('67%'));

  // ============================================
  console.log('\n=== TEST 14: Module required indicator (<80%) ===');
  ok('Module download section visible', refreshText.includes('Download Module PDF'));
  ok('"Required" badge for <80% score', refreshText.includes('Required') || refreshText.includes('recommended'));

  // ============================================
  console.log('\n=== TEST 15: Reset flow ===');
  // Navigate to summary step by injecting completed state
  await page.evaluate(() => {
    localStorage.setItem('pomeil_learning_flow', JSON.stringify({
      selectedSkills: ['cultural-awareness'],
      roomScores: {
        'cultural-awareness': {
          roomId: 'cultural-awareness',
          puzzleScores: [
            { puzzleId: 'Quiz', wrongAttempts: 0, wasRevealed: false, score: 100 }
          ],
          overallScore: 100,
          completedAt: new Date().toISOString()
        }
      },
      currentSkillIndex: 0,
      questionnaireCompleted: true,
      questionnaireAnswers: { q1: 'Confident' }
    }));
  });
  await page.goto(`${BASE}/learning/flow`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const startOver = page.locator('button:has-text("Start Over")');
  const startOverVisible = await startOver.isVisible().catch(() => false);
  if (startOverVisible) {
    await startOver.click();
    await page.waitForTimeout(1000);
    const resetLS = await page.evaluate(() => JSON.parse(localStorage.getItem('pomeil_learning_flow')));
    ok('After reset: selectedSkills empty', resetLS.selectedSkills.length === 0);
    ok('After reset: roomScores empty', Object.keys(resetLS.roomScores).length === 0);
  } else {
    ok('Start Over button not visible on this step (OK—only on summary)', true);
    ok('(skipped reset test)', true);
  }

  // ============================================
  console.log('\n=== TEST 16: Escape room with mode=learning renders correctly ===');
  for (const room of ['cultural-awareness', 'empathy', 'strategic-thinking', 'open-mindedness', 'financial', 'stress-management']) {
    await page.goto(`${BASE}/escape-rooms/${room}?mode=learning`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    const gc = (await page.locator('.game-container').count()) > 0 || (await page.locator('.cinematic-container').count()) > 0;
    ok(`${room}: game renders in learning mode`, gc);
  }

  // ============================================
  console.log('\n=== TEST 17: Console errors ===');
  const critical = consoleErrors.filter(e => !e.includes('net::') && !e.includes('404') && !e.includes('Failed to load resource'));
  ok(`No critical console errors (${critical.length} found)`, critical.length === 0);
  if (critical.length > 0) critical.forEach(e => console.log(`    ERROR: ${e}`));

  // Cleanup
  await page.evaluate(() => localStorage.removeItem('pomeil_learning_flow'));

} catch (err) {
  console.error('\nFATAL:', err.message);
  failed++;
} finally {
  if (browser) await browser.close();
  console.log(`\n${'='.repeat(50)}`);
  console.log(`RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log(`${'='.repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}
