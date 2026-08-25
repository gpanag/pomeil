// Comprehensive verification of all 38 feedback fixes against a running dev server.

import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4200';
const VIEWPORT = { width: 1680, height: 1024 };
const PLAYER = 'TestPlayer';

let pass = 0, fail = 0;
const failures = [];
function assert(label, cond, info = '') {
  if (cond) { console.log(`  PASS  ${label}`); pass++; }
  else { console.log(`  FAIL  ${label}${info ? '  →  ' + info : ''}`); fail++; failures.push(label); }
}

async function fetchJson(p, path) {
  return await p.evaluate(async (url) => {
    const r = await fetch(url);
    return await r.json();
  }, path);
}

async function fetchText(p, path) {
  // For HTTP-served paths, use page fetch
  if (path.startsWith('/assets/')) {
    return await p.evaluate(async (url) => {
      const r = await fetch(url);
      if (!r.ok) return null;
      return await r.text();
    }, path);
  }
  // For source-file paths, read directly via Node fs
  if (path.startsWith('/@fs/')) {
    const fs = await import('fs/promises');
    const realPath = path.replace('/@fs/', '/');
    try { return await fs.readFile(realPath, 'utf8'); }
    catch { return null; }
  }
  return null;
}

async function loadRoom(p, roomId) {
  await p.goto(`${BASE}/escape-rooms/${roomId}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(800);
}

async function clickStartButton(p) {
  const b = p.locator('button').filter({ hasText: /^(Start Game|Enter |Go to|Start |Begin )/i }).first();
  if (await b.count()) { await b.click(); await p.waitForTimeout(800); return true; }
  return false;
}

async function dialogueText(p) {
  const dp = p.locator('.dialogue-panel').first();
  if (await dp.count() === 0) return null;
  return (await dp.innerText()).trim();
}

// Skip typewriter (click on dialogue-content), wait until !isTyping, then click Continue.
async function advanceDialogue(p) {
  const dpCount = await p.locator('.dialogue-panel').count();
  if (dpCount === 0) return false;
  // Click dialogue-content to skip typing
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  // Wait until a button is visible inside the dialogue (typing complete OR no button needed)
  await p.waitForFunction(() => {
    const dp = document.querySelector('.dialogue-panel');
    if (!dp) return true;
    const actions = dp.querySelector('.dialogue-actions');
    return actions !== null;
  }, { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(150);
  const btn = p.locator('.dialogue-panel button').filter({ hasText: /^(Continue|Start Quiz|Finish Training|Open Door)/i }).first();
  if (await btn.count()) { await btn.click({ force: true }); await p.waitForTimeout(500); return true; }
  return false;
}

// Wait until typing finished and read full text.
async function readDialogueText(p) {
  const dpCount = await p.locator('.dialogue-panel').count();
  if (dpCount === 0) return null;
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  // Wait for the Continue/action button to appear (means !isTyping)
  await p.waitForFunction(() => {
    const dp = document.querySelector('.dialogue-panel');
    if (!dp) return true;
    return !!dp.querySelector('.dialogue-actions');
  }, { timeout: 10000 }).catch(() => {});
  await p.waitForTimeout(150);
  return (await p.locator('.dialogue-panel').innerText()).trim();
}

// =============================================================================
//   PER-ROOM TEST FUNCTIONS
// =============================================================================

async function test_culturalAwareness(p) {
  console.log('\n=== Cultural Awareness (Tasks #1, #2, #3) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/cultural-awareness/en.json');
  assert('#1 intro uses (username)', j.characters.fatma.dialogues.introduction.includes('(username)'));
  assert('#1 no "Alma" anywhere', JSON.stringify(j).indexOf('Alma') === -1);
  assert('#2 quizCompleteReturn says "Click on Fatma"', j.systemDialogues.quizCompleteReturn.includes('Click on Fatma'));
  assert('#2 note.foundDialogue says "Click on Fatma"', j.items.note.foundDialogue.includes('Click on Fatma'));
  assert('#2 paper.foundDialogue says "Click on Fatma"', j.items.paper.foundDialogue.includes('Click on Fatma'));
  assert('#3 allQuestsComplete_part3 mentions "training has been completed"',
    j.characters.fatma.dialogues.allQuestsComplete_part3.includes('training has been completed'));

  await loadRoom(p, 'cultural-awareness');
  await clickStartButton(p);
  await p.locator('.character-hotspot').first().click();
  // Wait for typewriter to finish (dialogue-actions appears once isTyping=false)
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  await p.waitForFunction(() => {
    const dp = document.querySelector('.dialogue-panel');
    return !dp || !!dp.querySelector('.dialogue-actions');
  }, { timeout: 8000 }).catch(() => {});
  const text = (await p.locator('.dialogue-panel').innerText()).trim();
  assert('#1 Fatma greets player by name', text.includes(PLAYER), text.substring(0, 100));
}

async function test_empathy(p) {
  console.log('\n=== Empathy (Task #4) ===');
  await loadRoom(p, 'empathy');
  await clickStartButton(p);
  await p.locator('.character-hotspot').first().click();
  await p.waitForTimeout(800);
  // Skip typewriter
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(300);
  const text = await readDialogueText(p);
  assert('#4 (proxy) Empathy intro greets player by name', !!text && text.includes(PLAYER), text?.substring(0, 80));

  const j = await fetchJson(p, '/assets/i18n/escape-rooms/empathy/en.json');
  assert('#4 matching puzzle still has feedback.allCorrect', !!j.puzzles.matching.feedback.allCorrect);

  // Source-level: verify the state-set-before-setTimeout fix
  const tsTxt = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/empathy-skill22/empathy-skill22.component.ts');
  if (tsTxt) {
    // After my fix, selectMatchOption sets state immediately when all matched
    assert('#4 selectMatchOption sets state Puzzle1_Complete before setTimeout',
      /this\.solvedMatches\.length === this\.matchingPairs\.length\)\s*\{\s*this\.recordPuzzleScore\([^)]*\);\s*this\.currentState = GameState\.Puzzle1_Complete;/m.test(tsTxt));
    assert('#4 system_nextTask handler auto-shows coach_puzzle1Complete',
      /id === 'system_nextTask'\)[\s\S]{0,300}coach_puzzle1Complete/m.test(tsTxt));
  } else {
    console.log('  SKIP  #4 source-level checks (source serving disabled)');
  }
}

async function test_strategicThinking(p) {
  console.log('\n=== Strategic Thinking (Tasks #5, #6) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/strategic-thinking/en.json');
  assert('#5 intro paragraph 0 uses <username>', j.intro.paragraphs[0].includes('<username>'));
  assert('#5 no hardcoded "Alex"', JSON.stringify(j).indexOf('"Alex"') === -1 && !j.intro.paragraphs[0].includes('Alex'));
  assert('#6 sofia.allQuestsComplete contains "training has been completed"',
    j.characters.sofia.dialogues.allQuestsComplete.includes('training has been completed'));
  assert('#6 no "Click on the open doors" in sofia.allQuestsComplete',
    !j.characters.sofia.dialogues.allQuestsComplete.includes('Click on the open doors'));

  // Live test: load and click Start, see <username> resolves
  await loadRoom(p, 'strategic-thinking');
  await p.waitForTimeout(500);
  const popupText = await p.locator('.overlay').first().innerText().catch(() => '');
  assert('#5 intro popup substitutes <username>', popupText.includes(PLAYER), popupText.substring(0, 80));
}

async function test_openMindedness(p) {
  console.log('\n=== Open-Mindedness (Tasks #7, #8) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/open-mindedness/en.json');
  assert('#7 Karina intro uses (username)', j.characters.karina.dialogues.introduction.includes('(username)'));
  assert('#7 no "Hey X," literal', !j.characters.karina.dialogues.introduction.startsWith('Hey X,'));

  await loadRoom(p, 'open-mindedness');
  await clickStartButton(p);
  await p.locator('.character-hotspot').first().click();
  await p.waitForTimeout(800);
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(300);
  const text = await readDialogueText(p);
  assert('#7 Karina greets player by name', !!text && text.includes(PLAYER), text?.substring(0, 80));

  // #8 source-level check
  const tsTxt = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/open-mindness-skill-skill26/open-mindness-skill-skill26.component.ts');
  if (tsTxt) {
    assert('#8 dismissDialogue handles AllQuestsComplete_Part3 + Daniel',
      /AllQuestsComplete_Part3\s*&&\s*lastCharacter === this\.t\('characters\.daniel\.name'\)\)[\s\S]{0,200}finalizeAndReportScore/m.test(tsTxt));
  } else {
    console.log('  SKIP  #8 source check');
  }
}

async function test_financial(p) {
  console.log('\n=== Financial Literacy (Tasks #9, #10) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/financial/en.json');
  assert('#9 Amina intro uses (username)', j.characters.amina.dialogues.introduction.includes('(username)'));
  assert('#9 no {{playerName}} tokens', JSON.stringify(j).indexOf('{{playerName}}') === -1);

  await loadRoom(p, 'financial');
  await clickStartButton(p);
  await p.locator('.character-hotspot').first().click();
  await p.waitForTimeout(800);
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(300);
  const text = await readDialogueText(p);
  assert('#9 Amina greets player by name', !!text && text.includes(PLAYER), text?.substring(0, 80));

  // Now advance through Amina's 3 dialogues to reach FindCard
  for (let i = 0; i < 5; i++) {
    const advanced = await advanceDialogue(p);
    if (!advanced) break;
  }
  await p.waitForTimeout(500);
  const pulsing = await p.locator('.hotspot.show-hint-pulse').count();
  assert('#10 desk hotspot auto-pulses on FindCard entry', pulsing > 0, `count=${pulsing}`);
}

async function test_stressManagement(p) {
  console.log('\n=== Stress Management (Task #11) ===');
  await loadRoom(p, 'stress-management');
  await clickStartButton(p);
  await p.waitForTimeout(800);
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(300);
  await advanceDialogue(p);
  await p.waitForTimeout(800);
  const noDialog = (await p.locator('.dialogue-panel').count()) === 0;
  const pulsingChars = await p.locator('.character-hotspot.show-hint-pulse').count();
  assert('#11 Kevin pulses after self-talk dismissed', noDialog && pulsingChars > 0,
    `noDialog=${noDialog}, pulsingChars=${pulsingChars}`);
}

async function test_trustBuilding(p) {
  console.log('\n=== Trust Building (Tasks #12, #13) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/trust-building/en.json');
  assert('#13 revealedComplete key exists', !!j.puzzles.matching.feedback.revealedComplete);

  await loadRoom(p, 'trust-building');
  const labelStyles = await p.evaluate(() => {
    const div = document.createElement('div');
    div.innerHTML = '<button><strong class="match-label">1.</strong> X</button>';
    document.body.appendChild(div);
    const cs = window.getComputedStyle(div.querySelector('.match-label'));
    const result = { color: cs.color, fontWeight: cs.fontWeight, marginRight: cs.marginRight };
    div.remove();
    return result;
  });
  assert('#12 match-label has bold weight', labelStyles.fontWeight === '700' || labelStyles.fontWeight === 'bold');
  assert('#12 match-label has primary color', labelStyles.color === 'rgb(0, 104, 116)');

  // Verify all 9 affected room HTMLs contain match-label
  const rooms = ['active-listening-skill19', 'empathy-skill22', 'leadership-skill19', 'tolerance-skill30',
    'resilience-skill27', 'market-awareness-skill21', 'financial-skill10-b', 'trust-building-skill18'];
  for (const r of rooms) {
    const html = await fetchText(p, `/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/${r}/${r}.component.html`);
    if (html) {
      assert(`#12 [${r}] template contains match-label`, html.includes('match-label'));
    }
  }
}

async function test_activeListening(p) {
  console.log('\n=== Active Listening (Task #14) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/active-listening/en.json');
  assert('#14 matching feedback.revealedComplete exists', !!j.puzzles.matching.feedback.revealedComplete);

  // Source check: puzzle 3 reveal callback now calls recordPuzzleScore
  const tsTxt = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/active-listening-skill19/active-listening-skill19.component.ts');
  if (tsTxt) {
    // The callback should call recordPuzzleScore('Matching', ...)
    assert('#14 matching reveal callback records score',
      /this\.matchingWrongAttempts = 0;\s*this\.solvedMatches = \[[\s'\d,]+\];\s*this\.recordPuzzleScore\('Matching'/m.test(tsTxt));
  } else {
    console.log('  SKIP  #14 source check');
  }
}

async function test_adaptability(p) {
  console.log('\n=== Adaptability (Task #15) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/adaptability/en.json');
  const txt = j.characters.amina.dialogues.puzzle2Done;
  assert('#15 hardcoded "100% correct" removed from Amina puzzle2Done', !txt.includes('100% correct'));
}

async function test_languageSkills(p) {
  console.log('\n=== Language Skills (Task #16) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/language-skills/en.json');
  const paraCount = j.intro.paragraphs.length;
  assert('#16 intro has at most 2 paragraphs (matches HTML refs)', paraCount === 2, `count=${paraCount}`);

  await loadRoom(p, 'language-skills');
  const html = await p.locator('.intro-text, mat-card-content').first().innerHTML().catch(() => '');
  assert('#16 no literal "intro.paragraphs.2" text in intro', html.indexOf('paragraphs.2') === -1 && html.indexOf('tona paragraphs') === -1);
}

async function test_resilience(p) {
  console.log('\n=== Resilience (Task #17) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/resilience/en.json');
  const ivanReady = j.characters.ivan.dialogues.readyNext;
  assert('#17 "Ready discover next skill?" replaced', !ivanReady.includes('Ready discover'));
  assert('#17 readyNext contains "training has been completed"', ivanReady.includes('training has been completed'));
}

async function test_charPulse(p) {
  console.log('\n=== Character ambient pulse (Task #18, applied globally) ===');
  await loadRoom(p, 'cultural-awareness');
  await clickStartButton(p);
  const animation = await p.evaluate(() => {
    const h = document.querySelector('.character-hotspot');
    return h ? window.getComputedStyle(h).animationName : 'none';
  });
  assert('#18 character-hotspot has ambient pulse animation',
    animation && (animation.includes('character-ambient-pulse') || animation.includes('pulse')));
}

async function test_hintBtnPulse(p) {
  console.log('\n=== Hint button pulse (Task #19) ===');
  await loadRoom(p, 'cultural-awareness');
  await clickStartButton(p);
  await p.locator('.character-hotspot').first().click();
  await p.waitForTimeout(800);  // wait for dialogue to start showing
  // Advance through 2-3 dialogues until hint button is visible
  for (let i = 0; i < 8; i++) {
    const advanced = await advanceDialogue(p);
    await p.waitForTimeout(400);
    const hintCount = await p.locator('.hint-button').count();
    if (hintCount > 0) break;
    if (!advanced) {
      // No more dialogues. Wait briefly in case the hint button is rendering.
      await p.waitForTimeout(500);
      if (await p.locator('.hint-button').count() > 0) break;
      // Still no hint? Try clicking the character again to trigger a state-shift
      const ch = p.locator('.character-hotspot').first();
      if (await ch.count()) await ch.click();
      await p.waitForTimeout(500);
    }
  }
  await p.waitForTimeout(300);
  // Check if hint-button is in DOM
  const hintBtnInfo = await p.evaluate(() => {
    const h = document.querySelector('.hint-button');
    if (!h) return { found: false };
    const cs = window.getComputedStyle(h);
    return {
      found: true,
      animation: cs.animationName,
      display: cs.display,
      visible: h.offsetHeight > 0
    };
  });
  if (!hintBtnInfo.found) {
    console.log('  INFO  no hint-button in cultural-awareness; trying financial');
    // Fall back to financial
    await loadRoom(p, 'financial');
    await clickStartButton(p);
    await p.locator('.character-hotspot').first().click();
    for (let i = 0; i < 5; i++) {
      if (!(await advanceDialogue(p))) break;
    }
    await p.waitForTimeout(500);
    const fallback = await p.evaluate(() => {
      const h = document.querySelector('.hint-button');
      return h ? { found: true, animation: window.getComputedStyle(h).animationName } : { found: false };
    });
    assert('#19 hint-button has pulse animation (financial)',
      fallback.found && fallback.animation && (fallback.animation.includes('hint-button-pulse') || fallback.animation.includes('pulse')),
      JSON.stringify(fallback));
  } else {
    assert('#19 hint-button has pulse animation (cultural-awareness)',
      hintBtnInfo.animation && (hintBtnInfo.animation.includes('hint-button-pulse') || hintBtnInfo.animation.includes('pulse')),
      JSON.stringify(hintBtnInfo));
  }
}

async function test_completedTexts(p) {
  console.log('\n=== "Training completed!" replacements (Task #20) ===');
  const rooms = ['critical-thinking', 'flexibility', 'risk-management', 'leadership', 'tolerance', 'crm', 'self-reliance', 'teamwork'];
  for (const r of rooms) {
    const j = await fetchJson(p, `/assets/i18n/escape-rooms/${r}/en.json`);
    const s = JSON.stringify(j);
    const hasOld = s.includes('Click on the door') || s.includes('click on the door') || s.includes('Click on the open door');
    assert(`#20 [${r}] no "Click on the door" text`, !hasOld);
  }
}

async function test_reViewableInstructions(p) {
  console.log('\n=== Re-viewable instructions (Task #21) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/trust-building/en.json');
  const def = j.characters.kate.dialogues.default;
  assert('#21 Kate.default mentions hint button', def.includes('hint button') || def.includes('lightbulb'));
}

async function test_teamworkSounds(p) {
  console.log('\n=== Teamwork sound durations (Task #22) ===');
  const tsTxt = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/teamwork-skill29/teamwork-skill29.component.ts');
  if (tsTxt) {
    assert('#22 teamwork uses paper-rustle.wav with 700ms cap', tsTxt.includes("'paper-rustle.wav', 700"));
    // Also verify base playSound supports the maxDurationMs parameter
    const baseTxt = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/shared/escape-room/escape-room-base.component.ts');
    assert('#22 base playSound has maxDurationMs param', baseTxt && baseTxt.includes('maxDurationMs'));
  } else {
    console.log('  SKIP  #22 (source serving disabled)');
  }
}

async function test_crmHotspotZOrder(p) {
  console.log('\n=== CRM hotspot z-order (Task #23) ===');
  await loadRoom(p, 'crm');
  await clickStartButton(p);
  await p.waitForTimeout(800);
  const order = await p.evaluate(() => {
    const layer = document.querySelector('.hotspot-layer');
    if (!layer) return null;
    const kids = Array.from(layer.children).map(c => ({
      isChar: c.classList.contains('character-hotspot'),
      isSmall: c.classList.contains('small-hotspot')
    }));
    const lastSmall = kids.map((k, i) => k.isSmall ? i : -1).reduce((a, b) => Math.max(a, b), -1);
    const firstChar = kids.findIndex(k => k.isChar);
    return { lastSmall, firstChar, total: kids.length };
  });
  if (order && order.lastSmall !== -1 && order.firstChar !== -1) {
    assert('#23 CRM character hotspots render AFTER small interactive objects',
      order.firstChar > order.lastSmall, JSON.stringify(order));
  } else {
    console.log('  SKIP  #23 (could not inspect hotspot order)');
  }
}

async function test_decisionMaking(p) {
  console.log('\n=== Decision Making elevator text (Task #24) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/decision-making/en.json');
  const dlg = j.items.floorIndicator.dialogue;
  assert('#24 floorIndicator no longer says "Floor 5 ½"', !dlg.includes('5 ½') && !dlg.includes('5½') && !dlg.includes('5 1/2'));
  assert('#24 floorIndicator mentions "between floors 4 and 5"', dlg.includes('between floors 4 and 5') || dlg.includes('4 and 5'));
}

async function test_legalCompliance(p) {
  console.log('\n=== Leadership/Legal Compliance Document Classification (Task #25) ===');
  await loadRoom(p, 'legal-compliance');
  await clickStartButton(p);
  await p.waitForTimeout(800);
  const r = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/legal-compliance-skill20/legal-compliance-skill20.component.html');
  if (r) {
    assert('#25 legal-compliance has Reset button', r.includes('matchingPairs = {}; selectedMatchLeft = null;'));
    assert('#25 legal-compliance shows paired category text', r.includes('getCategoryText'));
    assert('#25 legal-compliance left items have match-label', r.includes('match-label'));
  } else {
    console.log('  SKIP  #25 (source serving disabled)');
  }
}

async function test_marketAwareness(p) {
  console.log('\n=== Market Awareness (Tasks #26, #27) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/market-awareness/en.json');
  assert('#26 elena.goodbye does not mention "next skill"', !j.characters.elena.dialogues.goodbye.includes('next skill'));

  // #27: exit door hotspot widened
  const tsTxt = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/market-awareness-skill21/market-awareness-skill21.component.ts');
  if (tsTxt) {
    const m = tsTxt.match(/exitDoor:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+),\s*width:\s*(\d+),\s*height:\s*(\d+)/);
    if (m) {
      const w = +m[3], h = +m[4];
      assert('#27 exitDoor hotspot widened (>10 width)', w > 10, `width=${w}`);
    }
  } else {
    console.log('  SKIP  #27 source check');
  }
}

async function test_motivatingOthers(p) {
  console.log('\n=== Motivating Others (Tasks #28, #29) ===');
  await loadRoom(p, 'motivating-others');
  await clickStartButton(p);
  await p.waitForTimeout(800);
  // dismiss any selfTalk dialogue first
  await p.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  await p.waitForTimeout(300);
  await advanceDialogue(p);
  await p.waitForTimeout(800);
  // The candidate should now be pulsing in TalkToCandidate1 state
  const pulsing = await p.locator('.character-hotspot.show-hint-pulse').count();
  assert('#29 candidate hotspot pulses in TalkToCandidate1', pulsing > 0, `count=${pulsing}`);

  // #28: paper-rustle.wav has 700ms cap in this room too
  const tsTxt = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/motivating-others/motivating-others.component.ts');
  if (tsTxt) {
    assert('#28 motivating-others uses paper-rustle.wav with 700ms cap', tsTxt.includes("'paper-rustle.wav', 700"));
  }
}

async function test_businessPlanning(p) {
  console.log('\n=== Business Planning (Task #30) ===');
  await loadRoom(p, 'business-planning');
  await clickStartButton(p);
  await p.waitForTimeout(800);
  const pulsing = await p.locator('.hotspot.show-hint-pulse').count();
  assert('#30 business-planning stations pulse in Exploring state', pulsing >= 4, `count=${pulsing}`);
}

async function test_criticalThinking(p) {
  console.log('\n=== Critical Thinking (Task #31) ===');
  const html = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/critical-thinking-module2/critical-thinking-module2.component.html');
  if (html) {
    assert('#31 laptop pulse no longer requires showHints',
      html.includes('[class.show-hint-pulse]="mariaDone && !emailDone"'));
    assert('#31 TV pulse no longer requires showHints',
      html.includes('[class.show-hint-pulse]="emailDone && !reviewsDone"'));
  } else {
    console.log('  SKIP  #31 source serving disabled');
  }
}

async function test_digitalSkills(p) {
  console.log('\n=== Digital Skills (Tasks #32, #33) ===');
  const scss = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/digital-skills-module5/digital-skills-module5.component.scss');
  if (scss) {
    assert('#32 red-herring border:none',
      /\.hotspot\.red-herring\s*\{[^}]*border:\s*none/.test(scss));
    assert('#32 red-herring background:transparent',
      /\.hotspot\.red-herring\s*\{[^}]*background:\s*transparent/.test(scss));
  } else {
    console.log('  SKIP  #32 source serving disabled');
  }

  const ts = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/digital-skills-module5/digital-skills-module5.component.ts');
  if (ts) {
    assert('#33 system_allComplete auto-shows completion overlay',
      /'system_allComplete'\)\s*\{[\s\S]{0,500}isGameCompleteOverlayVisible\s*=\s*true/m.test(ts));
  }
}

async function test_negotiation(p) {
  console.log('\n=== Negotiation (Task #34) ===');
  const ts = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/negotiation-skills-module11/negotiation-skills-module11.component.ts');
  if (ts) {
    assert('#34 speakerName getter exists', ts.includes('private get speakerName()'));
    assert('#34 no remaining "character: \'System\'" literals', !/character:\s*'System'/.test(ts));
  } else {
    console.log('  SKIP  #34 source serving disabled');
  }
}

async function test_networkingSkills(p) {
  console.log('\n=== Networking Skills (Tasks #35, #36) ===');
  const j = await fetchJson(p, '/assets/i18n/escape-rooms/networking-skills/en.json');
  assert('#35 npc1.name no longer "Man on couch"', j.characters.npc1.name !== 'Man on couch');
  assert('#35 npc2.name no longer "Man in wheelchair"', j.characters.npc2.name !== 'Man in wheelchair');
  assert('#35 npc1.name has actual name', j.characters.npc1.name.length > 0 && /^[A-Z]/.test(j.characters.npc1.name));
  assert('#35 npc2.name has actual name', j.characters.npc2.name.length > 0 && /^[A-Z]/.test(j.characters.npc2.name));

  const ts = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/networking-skills-module12/networking-skills-module12.component.ts');
  if (ts) {
    const m = ts.match(/exitDoor:\s*\{\s*x:\s*(\d+),\s*y:\s*(\d+),\s*width:\s*(\d+),\s*height:\s*(\d+)/);
    if (m) {
      const w = +m[3];
      assert('#36 exitDoor hotspot moved/widened (>6 width)', w > 6, `width=${w}`);
    }
  }
}

async function test_riskManagement(p) {
  console.log('\n=== Risk Management (Tasks #37, #38) ===');
  const ts = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/risk-management-module15/risk-management-module15.component.ts');
  if (ts) {
    assert('#37 foundRisks.add fires synchronously on click',
      /private handleRiskClick\(riskId: string\): void \{\s*[^}]*?this\.foundRisks\.add\(riskId\);\s*const zoomView/m.test(ts));
  }
  const html = await fetchText(p, '/@fs/media/george-panagiotopoulos/SAMSUNG_4TB/angular/pomeil/src/app/risk-management-module15/risk-management-module15.component.html');
  if (html) {
    assert('#38 risk hotspots hidden during isAnimating', html.includes('!isAnimating'));
  }
}

// =============================================================================
//   MAIN
// =============================================================================

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const p = await ctx.newPage();
  const consoleErrors = [];
  p.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  p.on('pageerror', e => consoleErrors.push('PAGE: ' + e.message));

  await p.goto(BASE);
  await p.evaluate(name => localStorage.setItem('pomeil_player_name', name), PLAYER);

  await test_culturalAwareness(p);
  await test_empathy(p);
  await test_strategicThinking(p);
  await test_openMindedness(p);
  await test_financial(p);
  await test_stressManagement(p);
  await test_trustBuilding(p);
  await test_activeListening(p);
  await test_adaptability(p);
  await test_languageSkills(p);
  await test_resilience(p);
  await test_charPulse(p);
  await test_hintBtnPulse(p);
  await test_completedTexts(p);
  await test_reViewableInstructions(p);
  await test_teamworkSounds(p);
  await test_crmHotspotZOrder(p);
  await test_decisionMaking(p);
  await test_legalCompliance(p);
  await test_marketAwareness(p);
  await test_motivatingOthers(p);
  await test_businessPlanning(p);
  await test_criticalThinking(p);
  await test_digitalSkills(p);
  await test_negotiation(p);
  await test_networkingSkills(p);
  await test_riskManagement(p);

  console.log(`\n========== Summary ==========`);
  console.log(`Passed: ${pass}    Failed: ${fail}`);
  if (failures.length) {
    console.log(`\nFailed tests:`);
    failures.forEach(f => console.log(`  - ${f}`));
  }
  const meaningfulErrors = consoleErrors.filter(e =>
    !e.includes('zoom_laptop.png') &&
    !e.includes('box_under_desk_open.png') &&
    !e.includes('Failed to load resource')
  );
  if (meaningfulErrors.length) {
    console.log(`\nConsole errors (excluding known pre-existing 404s):`);
    meaningfulErrors.forEach(e => console.log(`  ! ${e}`));
  } else {
    console.log(`\nNo unexpected console errors.`);
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
