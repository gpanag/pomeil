import { chromium } from 'playwright';

let passed = 0, failed = 0;
const errs = [];
function assert(name, cond, info='') {
  if (cond) { console.log(`  ✓ ${name}`); passed++; }
  else { console.log(`  ✗ ${name}${info?' → '+info:''}`); failed++; errs.push(name); }
}

async function dismissAny(p) {
  for (let t=0; t<3; t++) {
    if ((await p.locator('.dialogue-panel').count())===0) return;
    await p.locator('.dialogue-panel').click({force:true}).catch(()=>{});
    await p.waitForTimeout(200);
    const c = p.locator('.dialogue-panel button').filter({hasText:/Continue/i}).first();
    if (await c.count()) { await c.click({force:true}); await p.waitForTimeout(400); }
    else await p.waitForTimeout(300);
  }
}

async function testPS() {
  const b = await chromium.launch({headless:true});
  const p = await (await b.newContext({viewport:{width:1680,height:1024}})).newPage();
  p.on('pageerror', e => errs.push('PAGE:'+e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('CON:'+m.text()); });

  console.log('── PS skip test ──');
  await p.goto('http://localhost:4200/escape-rooms/problem-solving',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(800);
  await p.getByRole('button',{name:/Enter the Storage Room/i}).click();
  await p.waitForTimeout(500);

  // Sticky note → dismiss through letter and thought
  await p.locator('.hotspot').first().click();
  await p.waitForTimeout(2500);
  await dismissAny(p); await dismissAny(p); await dismissAny(p);
  await p.waitForTimeout(1500);

  // Should now be in CleanRoom state — floating skip button should be visible
  const cleanSkipCount = await p.locator('.floating-skip-btn').count();
  assert('Floating skip btn visible during clean room', cleanSkipCount > 0);

  // Click skip
  await p.locator('.floating-skip-btn').first().click();
  await p.waitForTimeout(400);
  const confirmCount = await p.locator('.skip-confirm-card').count();
  assert('Skip confirm dialog appears', confirmCount > 0);

  // Confirm skip
  await p.getByRole('button',{name:/Skip Puzzle/i}).last().click();
  await p.waitForTimeout(3000);

  // Should skip to Knut arrival
  await dismissAny(p);
  await p.waitForTimeout(500);
  // Click Knut
  const knut = await p.locator('.character-hotspot').count();
  assert('Knut hotspot appears after skip', knut > 0);
  if (knut > 0) { await p.locator('.character-hotspot').first().click(); await p.waitForTimeout(800); }

  // Now in Knut conversation — should have floating skip
  const knutSkipCount = await p.locator('.floating-skip-btn').count();
  assert('Floating skip btn visible during Knut conversation', knutSkipCount > 0);

  if (knutSkipCount > 0) {
    await p.locator('.floating-skip-btn').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('button',{name:/Skip Puzzle/i}).last().click();
    await p.waitForTimeout(2000);
  }

  // Now investigate intro dialogue
  await dismissAny(p);
  await p.waitForTimeout(500);

  // Skip investigation
  const invSkipCount = await p.locator('.floating-skip-btn').count();
  assert('Floating skip btn visible during investigation', invSkipCount > 0);

  if (invSkipCount > 0) {
    await p.locator('.floating-skip-btn').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('button',{name:/Skip Puzzle/i}).last().click();
    await p.waitForTimeout(1500);
  }

  // Now DefineProblem overlay — should have skip-puzzle-btn inside card
  const defineSkip = await p.locator('.skip-puzzle-btn').count();
  assert('Skip btn inside DefineProblem overlay', defineSkip > 0);

  if (defineSkip > 0) {
    await p.locator('.skip-puzzle-btn').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('button',{name:/Skip Puzzle/i}).last().click();
    await p.waitForTimeout(1500);

    // Should show DefineProblemExplained with Continue
    await p.getByRole('button',{name:/Continue/i}).first().click({force:true});
    await p.waitForTimeout(2500);
    const completion = await p.locator('mat-card-title').filter({hasText:/Problem Solving Complete/i}).count();
    assert('Completion after all skips', completion > 0);
  }

  assert('No runtime errors',
    errs.filter(e => e.startsWith('PAGE:')||e.startsWith('CON:')).length===0,
    errs.filter(e => e.startsWith('PAGE:')||e.startsWith('CON:')).join('; '));

  await b.close();
}

async function testPM() {
  const b = await chromium.launch({headless:true});
  const p = await (await b.newContext({viewport:{width:1680,height:1024}})).newPage();
  p.on('pageerror', e => errs.push('PAGE:'+e.message));
  p.on('console', m => { if (m.type()==='error') errs.push('CON:'+m.text()); });

  console.log('\n── PM skip test ──');
  await p.goto('http://localhost:4200/escape-rooms/project-management',{waitUntil:'domcontentloaded'});
  await p.waitForTimeout(800);
  await p.getByRole('button',{name:/Start Managing/i}).click();
  await p.waitForTimeout(500);

  // Click report → intro dialogues → report overlay
  await p.locator('.hotspot-layer > .hotspot').first().click({force:true});
  await p.waitForTimeout(2600);
  await dismissAny(p); await dismissAny(p);
  await p.waitForTimeout(500);

  const reportSkip = await p.locator('.skip-puzzle-btn').count();
  assert('Skip btn in Progress Report overlay', reportSkip > 0);

  if (reportSkip > 0) {
    await p.locator('.skip-puzzle-btn').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('button',{name:/Skip Puzzle/i}).last().click();
    await p.waitForTimeout(1500);
  }

  // Click notes
  await p.locator('.hotspot-layer > .hotspot').first().click({force:true});
  await p.waitForTimeout(2500);
  await dismissAny(p); await dismissAny(p);
  await p.waitForTimeout(500);

  const objSkip = await p.locator('.skip-puzzle-btn').count();
  assert('Skip btn in Objective overlay', objSkip > 0);

  if (objSkip > 0) {
    await p.locator('.skip-puzzle-btn').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('button',{name:/Skip Puzzle/i}).last().click();
    await p.waitForTimeout(2000);
  }

  // Click laptop
  await p.locator('.hotspot-layer > .hotspot').first().click({force:true});
  await p.waitForTimeout(2500);
  await dismissAny(p);
  await p.waitForTimeout(500);

  const emailSkip = await p.locator('.skip-puzzle-btn').count();
  assert('Skip btn in Email inbox', emailSkip > 0);

  if (emailSkip > 0) {
    await p.locator('.skip-puzzle-btn').first().click();
    await p.waitForTimeout(400);
    await p.getByRole('button',{name:/Skip Puzzle/i}).last().click();
    await p.waitForTimeout(3000);
  }

  // Phone
  await p.locator('.hotspot-layer > .hotspot').first().click({force:true});
  await p.waitForTimeout(2500);
  await dismissAny(p);
  await p.waitForTimeout(500);

  const scopeSkip = await p.locator('.skip-puzzle-btn').count();
  assert('Skip btn in Scope Creep (phone)', scopeSkip > 0);

  assert('No runtime errors PM',
    errs.filter(e => e.startsWith('PAGE:')||e.startsWith('CON:')).length===0);

  await b.close();
}

(async () => {
  await testPS();
  await testPM();
  console.log(`\n── Total: ${passed} passed, ${failed} failed ──`);
  if (failed > 0) process.exit(1);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
