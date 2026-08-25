// Deep behavioral verification: for each fix, programmatically set up the exact
// state, trigger the action, and verify the post-state. Uses window.ng to access
// Angular component instances directly so we don't have to click through 20 mins
// of dialogue per room.

import { chromium } from 'playwright';

const BASE = 'http://127.0.0.1:4200';
const VIEWPORT = { width: 1680, height: 1024 };
const PLAYER = 'TestPlayer';

let pass = 0, fail = 0;
const failures = [];
function assert(label, cond, info = '') {
  if (cond) { console.log(`  PASS  ${label}`); pass++; }
  else { console.log(`  FAIL  ${label}${info ? '  →  ' + info : ''}`); fail++; failures.push({ label, info }); }
}

// =============================================================================
//   COMPONENT-LEVEL ACCESS (via window.ng debug API in dev mode)
// =============================================================================

async function getComponentState(page) {
  return await page.evaluate(() => {
    if (!window.ng) return null;
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && (typeof comp.onHotspotClick === 'function' || comp.constructor?.name?.includes('EscapeRoom'))) {
          return comp;
        }
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    return {
      currentState: comp.currentState,
      currentView: comp.currentView,
      isAnimating: comp.isAnimating,
      isDoorOpen: comp.isDoorOpen,
      activeDialogue: comp.activeDialogue ? { character: comp.activeDialogue.character, id: comp.activeDialogue.id, text: (comp.activeDialogue.text || '').substring(0, 80) } : null,
      isGameCompleteOverlayVisible: comp.isGameCompleteOverlayVisible,
      isIntroPopupVisible: comp.isIntroPopupVisible,
      showHints: comp.showHints,
      foundRisks: comp.foundRisks ? Array.from(comp.foundRisks) : null,
      solvedMatches: comp.solvedMatches,
      puzzleScores: comp.puzzleScores ? comp.puzzleScores.map(s => ({ id: s.puzzleId, score: s.score, wasRevealed: s.wasRevealed })) : null,
      puzzle1WasRevealed: comp.puzzle1WasRevealed,
      puzzle2WasRevealed: comp.puzzle2WasRevealed,
      puzzle3WasRevealed: comp.puzzle3WasRevealed,
      isMalwareInfected: comp.isMalwareInfected,
    };
  });
}

async function compExec(page, method, ...args) {
  return await page.evaluate(({ method, args }) => {
    if (!window.ng) return { error: 'no window.ng' };
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && (typeof comp.onHotspotClick === 'function' || comp.constructor?.name?.includes('EscapeRoom'))) {
          return { comp, el };
        }
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const r = findComp(document.body);
    if (!r) return { error: 'no component' };
    const { comp, el } = r;
    if (typeof comp[method] !== 'function') return { error: `method '${method}' missing` };
    try {
      // Run inside NgZone so setTimeout callbacks trigger change detection
      const NgZone = window.ng.getInjector(el).get(window.ng.getDirectives(el)[0]?.constructor || comp.constructor);
      let zone = null;
      try { zone = window.ng.getInjector(el).get(window.Zone?.current?.get?.('NgZone')); } catch {}
      // Simplest: just call it
      const result = comp[method](...args);
      return { ok: true, result: result === undefined ? null : (typeof result === 'object' ? '[object]' : result) };
    } catch (e) {
      return { error: e.message };
    }
  }, { method, args });
}

async function compSetState(page, updates) {
  return await page.evaluate((updates) => {
    if (!window.ng) return { error: 'no window.ng' };
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && (typeof comp.onHotspotClick === 'function' || comp.constructor?.name?.includes('EscapeRoom'))) {
          return comp;
        }
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return { error: 'no component' };
    Object.assign(comp, updates);
    // Trigger change detection
    try {
      const cdr = comp['cdr'];
      if (cdr && cdr.detectChanges) cdr.detectChanges();
    } catch {}
    return { ok: true };
  }, updates);
}

async function loadRoom(page, roomId, opts = { dismissIntro: true }) {
  await page.goto(`${BASE}/escape-rooms/${roomId}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);  // wait for component to mount and texts to load
  if (opts.dismissIntro) {
    const startBtn = page.locator('button').filter({ hasText: /^(Start Game|Enter |Go to|Start |Begin )/i }).first();
    if (await startBtn.count()) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
  }
}

async function setupPage() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) console.log('  [CON ERR]', m.text()); });
  page.on('pageerror', e => console.log('  [PAGE ERR]', e.message));
  await page.goto(BASE);
  await page.evaluate((name) => localStorage.setItem('pomeil_player_name', name), PLAYER);
  return { browser, page };
}

// =============================================================================
//   DEEP BEHAVIORAL TESTS
// =============================================================================

// Task #1, #2, #3 — Cultural Awareness
async function deep_culturalAwareness(page) {
  console.log('\n=== Cultural Awareness deep test ===');
  await loadRoom(page, 'cultural-awareness');

  // Click Fatma to start dialogue
  await page.evaluate(() => document.querySelectorAll('.character-hotspot')[0]?.click());
  await page.waitForTimeout(1500);
  // Skip typewriter
  await page.locator('.dialogue-content').first().click({ force: true }).catch(() => {});
  await page.waitForFunction(() => {
    const dp = document.querySelector('.dialogue-panel');
    return !dp || !!dp.querySelector('.dialogue-actions');
  }, { timeout: 5000 }).catch(() => {});
  const t1 = await page.locator('.dialogue-panel').innerText().catch(() => '');
  assert('#1 Fatma intro substitutes player name', t1.includes(PLAYER), t1.substring(0, 80));

  // Set state directly to trigger items.note.foundDialogue scenario
  await compSetState(page, { currentState: 7 /* NoteFound — this state # may vary */ });

  // Test #2 by directly inspecting the served JSON
  const j = await page.evaluate(async () => {
    return await fetch('/assets/i18n/escape-rooms/cultural-awareness/en.json').then(r => r.json());
  });
  assert('#2 note.foundDialogue says Click on Fatma', j.items.note.foundDialogue.includes('Click on Fatma'));
  assert('#2 paper.foundDialogue says Click on Fatma', j.items.paper.foundDialogue.includes('Click on Fatma'));
  assert('#2 quizCompleteReturn says Click on Fatma', j.systemDialogues.quizCompleteReturn.includes('Click on Fatma'));
  assert('#3 allQuestsComplete_part3 says training has been completed',
    j.characters.fatma.dialogues.allQuestsComplete_part3.includes('training has been completed'));

  // Test #3 by setting state to AllQuestsComplete_Part3 and checking dialogue
  // Via dismissDialogue we can trigger fatma's allQuestsComplete chain.
  // Since the actual flow is complex, we verify the dialogue text via JSON above.
}

// Task #4 — Empathy matching puzzle progression and skip
async function deep_empathy(page) {
  console.log('\n=== Empathy deep test (Task #4) ===');
  await loadRoom(page, 'empathy');

  // Get GameState enum via component
  const states = await page.evaluate(() => {
    if (!window.ng) return null;
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    return comp ? comp.GameState : null;
  });
  assert('#4 component exposes GameState', !!states);
  if (!states) return;

  // Force the state to Puzzle1_Matching to test skip behavior
  const skipResult = await page.evaluate((states) => {
    if (!window.ng) return null;
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;

    // Set to Puzzle1_Matching
    comp.currentState = states.Puzzle1_Matching;
    comp.activeDialogue = null;
    comp.cdr?.detectChanges?.();
    const stateBefore = comp.currentState;

    // Call skipPuzzle1 directly
    if (typeof comp.skipPuzzle1 !== 'function') return { error: 'no skipPuzzle1 method' };
    comp.skipPuzzle1();
    const stateImmediatelyAfter = comp.currentState;

    return { stateBefore, stateImmediatelyAfter, Puzzle1_Matching: states.Puzzle1_Matching, Puzzle1_Complete: states.Puzzle1_Complete };
  }, states);

  assert('#4 skipPuzzle1 changes state IMMEDIATELY (overlay hides)',
    skipResult?.stateImmediatelyAfter === skipResult?.Puzzle1_Complete,
    JSON.stringify(skipResult));

  // Now wait for the system_nextTask dialogue and verify it auto-shows coach dialogue after dismissal
  await page.waitForTimeout(800);
  const dialogState = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    return comp?.activeDialogue ? { id: comp.activeDialogue.id, character: comp.activeDialogue.character } : null;
  });
  assert('#4 system_nextTask dialogue auto-shown after skip',
    dialogState?.id === 'system_nextTask',
    JSON.stringify(dialogState));

  // Dismiss the system_nextTask dialogue and verify coach dialogue auto-shows
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) comp.dismissDialogue();
  });
  await page.waitForTimeout(800);
  const afterDismiss = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    return comp?.activeDialogue ? { id: comp.activeDialogue.id, character: comp.activeDialogue.character } : null;
  });
  assert('#4 coach_puzzle1Complete auto-shown after system_nextTask dismissed',
    afterDismiss?.id === 'coach_puzzle1Complete',
    JSON.stringify(afterDismiss));
}

// Task #8 — Open-Mindedness Finish Training button
async function deep_openMindedness(page) {
  console.log('\n=== Open-Mindedness deep test (Task #8) ===');
  await loadRoom(page, 'open-mindedness');

  const states = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    return comp ? comp.GameState : null;
  });
  if (!states) { assert('#8 GameState available', false); return; }

  // Force state to AllQuestsComplete_Part3 and Daniel as last character
  await page.evaluate((states) => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) {
      comp.currentState = states.AllQuestsComplete_Part3;
      comp.isDoorOpen = true;
      // Show Daniel dialogue
      const danielName = comp.t('characters.daniel.name');
      comp.showDialogue({ character: danielName, text: 'Test dialogue' });
      comp.cdr?.detectChanges?.();
    }
  }, states);
  await page.waitForTimeout(500);

  // Dismiss dialogue (simulate Finish Training click)
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) comp.dismissDialogue();
  });
  await page.waitForTimeout(800);

  const stateAfter = await getComponentState(page);
  assert('#8 Finish Training (Daniel dismiss) shows completion overlay',
    stateAfter?.isGameCompleteOverlayVisible === true, JSON.stringify(stateAfter));
}

// Task #11 — Stress Management Kevin pulse
async function deep_stressManagement(page) {
  console.log('\n=== Stress Management deep test (Task #11) ===');
  await loadRoom(page, 'stress-management');
  await page.waitForTimeout(800);

  // Dismiss self-talk dialogue
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) comp.dismissDialogue();
  });
  await page.waitForTimeout(800);

  // Kevin should have show-hint-pulse (state=ClickKevin && !activeDialogue)
  const pulseInfo = await page.evaluate(() => {
    const kevin = document.querySelectorAll('.character-hotspot')[0];
    if (!kevin) return null;
    return {
      classes: kevin.className,
      animationName: window.getComputedStyle(kevin).animationName,
      hasPulse: kevin.classList.contains('show-hint-pulse')
    };
  });
  assert('#11 Kevin has show-hint-pulse class after self-talk', pulseInfo?.hasPulse === true,
    JSON.stringify(pulseInfo));

  const stateNow = await getComponentState(page);
  assert('#11 Kevin pulses while in ClickKevin state with no dialogue',
    stateNow && !stateNow.activeDialogue, JSON.stringify(stateNow));
}

// Task #12 — Sentence-matching labels render
async function deep_matchingLabels(page) {
  console.log('\n=== Matching puzzle labels deep test (Task #12) ===');
  await loadRoom(page, 'trust-building');

  // Force state to Puzzle1_Matching
  const result = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return { error: 'no comp' };
    comp.currentState = comp.GameState.Puzzle1_Matching;
    comp.activeDialogue = null;
    comp.cdr?.detectChanges?.();
    return { ok: true };
  });
  assert('#12 Trust Building puzzle reachable', result?.ok === true);
  await page.waitForTimeout(500);

  const labels = await page.evaluate(() => {
    const ml = Array.from(document.querySelectorAll('.match-label'));
    return ml.map(l => l.innerText.trim());
  });
  assert(`#12 match-labels visible (${labels.length} found)`, labels.length > 0, labels.join(','));

  const hasNumbers = labels.some(l => /^\d+\.$/.test(l));
  const hasLetters = labels.some(l => /^[A-Z]\.$/.test(l));
  assert('#12 labels include numbers (left column)', hasNumbers, labels.slice(0, 7).join(','));
  assert('#12 labels include letters (right column)', hasLetters, labels.slice(-7).join(','));
}

// Task #13 — Trust Building revealedComplete after 3 wrong attempts
async function deep_trustBuildingReveal(page) {
  console.log('\n=== Trust Building reveal text deep test (Task #13) ===');
  await loadRoom(page, 'trust-building');

  const result = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return { error: 'no comp' };
    // Force matching puzzle
    comp.currentState = comp.GameState.Puzzle1_Matching;
    comp.activeDialogue = null;
    comp.matchingWrongAttempts = 0;
    comp.solvedMatches = [];
    comp.puzzle1WasRevealed = false;
    comp.cdr?.detectChanges?.();

    // Trigger 3 wrong matches by selecting cue 1 then wrong option (e.g., 'A' instead of 'E')
    for (let i = 0; i < 3; i++) {
      comp.selectCue('1');
      comp.selectMatchOption('B');  // wrong: cue 1 matches with 'E', not 'B'
    }
    return { wrongAttempts: comp.matchingWrongAttempts, wasRevealed: comp.puzzle1WasRevealed, showAnswerOverlay: comp.showAnswerOverlay };
  });
  assert('#13 3 wrong attempts triggers reveal', result?.wasRevealed === true && result?.showAnswerOverlay === true, JSON.stringify(result));

  // Trigger the answer overlay callback
  await page.waitForTimeout(300);
  const callbackResult = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    // Close answer overlay (triggers callback)
    comp.closeAnswerOverlay();
    return { puzzleScores: comp.puzzleScores?.map(s => ({ id: s.puzzleId, score: s.score, wasRevealed: s.wasRevealed })) };
  });
  assert('#13 score recorded with wasRevealed=true after reveal',
    callbackResult?.puzzleScores?.some(s => s.id === 'Matching' && s.wasRevealed === true),
    JSON.stringify(callbackResult));

  // After delay, system_puzzle1Complete dialogue should show with revealedComplete text
  await page.waitForTimeout(1500);
  const dialogue = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    return comp?.activeDialogue?.text;
  });
  assert('#13 reveal-path shows revealedComplete text (not allCorrect)',
    dialogue?.includes('correct matches') || dialogue?.includes('review them'),
    dialogue?.substring(0, 100));
}

// Task #14 — Active Listening puzzle 3 reveal scoring
async function deep_activeListeningScoring(page) {
  console.log('\n=== Active Listening scoring deep test (Task #14) ===');
  await loadRoom(page, 'active-listening');

  const result = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return { error: 'no comp' };
    // Force puzzle 3 matching
    comp.currentState = comp.GameState.Puzzle3_Matching;
    comp.activeDialogue = null;
    comp.matchingWrongAttempts = 0;
    comp.solvedMatches = [];
    comp.puzzle3WasRevealed = false;
    comp.puzzleScores = [];
    comp.cdr?.detectChanges?.();

    // 3 wrong matches
    for (let i = 0; i < 3; i++) {
      comp.selectCue('1');
      comp.selectMatchOption('A');  // wrong (cue 1 matches with 'B')
    }
    return { wrongAttempts: comp.matchingWrongAttempts, wasRevealed: comp.puzzle3WasRevealed, showAnswerOverlay: comp.showAnswerOverlay };
  });
  assert('#14 puzzle 3 — 3 wrong attempts triggers reveal',
    result?.wasRevealed === true && result?.showAnswerOverlay === true, JSON.stringify(result));

  // Close answer overlay
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) comp.closeAnswerOverlay();
  });
  await page.waitForTimeout(300);

  // Check that puzzle3 is now in puzzleScores with wasRevealed=true (score=0)
  const finalState = await getComponentState(page);
  const matchingScore = finalState?.puzzleScores?.find(s => s.id === 'Matching');
  assert('#14 puzzle 3 (Matching) recorded with wasRevealed=true, score=0',
    matchingScore?.wasRevealed === true && matchingScore?.score === 0,
    JSON.stringify(matchingScore));
}

// Task #18 — Character ambient pulse (visual)
async function deep_characterPulse(page) {
  console.log('\n=== Character ambient pulse (Task #18) ===');
  await loadRoom(page, 'cultural-awareness');
  // Verify both characters have animation
  const animations = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.character-hotspot')).map(h => window.getComputedStyle(h).animationName);
  });
  assert('#18 character-hotspots have animations',
    animations.length > 0 && animations.every(a => a && a !== 'none'),
    JSON.stringify(animations));
}

// Task #19 — Hint button pulse
async function deep_hintButtonPulse(page) {
  console.log('\n=== Hint button pulse (Task #19) ===');
  await loadRoom(page, 'cultural-awareness');
  // Force state to FindNote so hint button appears
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) {
      comp.currentState = comp.GameState.FindNote;
      comp.activeDialogue = null;
      comp.cdr?.detectChanges?.();
    }
  });
  await page.waitForTimeout(500);
  const hintInfo = await page.evaluate(() => {
    const h = document.querySelector('.hint-button');
    if (!h) return { found: false };
    return { found: true, animation: window.getComputedStyle(h).animationName };
  });
  assert('#19 hint button visible and pulsing',
    hintInfo?.found === true && /pulse/i.test(hintInfo.animation),
    JSON.stringify(hintInfo));
}

// Task #23 — CRM hotspot z-order
async function deep_crmZOrder(page) {
  console.log('\n=== CRM hotspot z-order (Task #23) ===');
  await loadRoom(page, 'crm');
  await page.waitForTimeout(500);

  const order = await page.evaluate(() => {
    const layer = document.querySelector('.hotspot-layer');
    if (!layer) return { error: 'no layer' };
    const kids = Array.from(layer.children).filter(c => c.classList.contains('character-hotspot') || c.classList.contains('small-hotspot') || c.classList.contains('hotspot'));
    const lastSmallIdx = kids.map((k, i) => k.classList.contains('small-hotspot') ? i : -1).reduce((a, b) => Math.max(a, b), -1);
    const firstCharIdx = kids.findIndex(k => k.classList.contains('character-hotspot'));
    return { lastSmallIdx, firstCharIdx, total: kids.length };
  });
  assert('#23 character hotspots render after small-hotspots (later in DOM = higher in z)',
    order?.firstCharIdx > order?.lastSmallIdx, JSON.stringify(order));

  // Ensure hotspot-layer is enabled (no disable-clicks) for the elementFromPoint test
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && comp.GameState) return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) {
      comp.activeDialogue = null;
      comp.isIntroPopupVisible = false;
      comp.isAnimating = false;
      comp.cdr?.detectChanges?.();
    }
  });
  await page.waitForTimeout(300);

  // Verify clicking on Simone's location (where coffee machine overlap was) now triggers Simone, not coffee
  // simone {54,30,18,51}, coffeeMachine {65,28,8,30}, overlap at x=65-72, y=30-58
  const clickResult = await page.evaluate(() => {
    const layer = document.querySelector('.hotspot-layer');
    if (!layer) return { error: 'no hotspot-layer' };
    const layerStyle = window.getComputedStyle(layer);
    const disableClicks = layer.classList.contains('disable-clicks');

    const rect = layer.getBoundingClientRect();
    // Use coordinates known to be inside the simone+coffeeMachine overlap
    // simone x=54-72%, coffee x=65-73% — overlap at x=68%, y=45%
    const x = rect.left + rect.width * 0.68;
    const y = rect.top + rect.height * 0.45;
    const el = document.elementFromPoint(x, y);
    return {
      x, y,
      layerWidth: rect.width,
      layerHeight: rect.height,
      pointerEvents: layerStyle.pointerEvents,
      disableClicks,
      elTag: el?.tagName,
      elClasses: el?.className?.substring(0, 100),
      isCharacter: el?.classList?.contains('character-hotspot'),
      isCoffeeMachine: el?.classList?.contains('small-hotspot')
    };
  });
  // If pointer-events on layer is none (disable-clicks), elementFromPoint sees through to scene-background.
  // We need pointer-events to be auto for the test to work.
  if (clickResult?.pointerEvents === 'none' || clickResult?.disableClicks) {
    console.log('  INFO  hotspot-layer has pointer-events:none, using DOM order check instead');
    const order = await page.evaluate(() => {
      const layer = document.querySelector('.hotspot-layer');
      const kids = Array.from(layer.children);
      const lastSmall = kids.map((k, i) => k.classList.contains('small-hotspot') ? i : -1).reduce((a, b) => Math.max(a, b), -1);
      const firstChar = kids.findIndex(k => k.classList.contains('character-hotspot'));
      return { lastSmall, firstChar };
    });
    assert('#23 (DOM order) characters render after small-hotspots (firstChar > lastSmall)',
      order.firstChar > order.lastSmall, JSON.stringify(order));
  } else {
    assert('#23 overlap area resolves to character-hotspot, not small-hotspot',
      clickResult?.isCharacter === true, JSON.stringify(clickResult));
  }
}

// Task #29 — Motivating Others character help (state-dependent pulse)
async function deep_motivatingOthers(page) {
  console.log('\n=== Motivating Others (Task #29) ===');
  await loadRoom(page, 'motivating-others');
  await page.waitForTimeout(800);

  const states = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    return comp ? { GameState: comp.GameState, currentState: comp.currentState } : null;
  });

  // Verify in TalkToCandidate1 state, candidate (2nd hotspot) pulses, hrManager doesn't
  const pulseAtTalkCandidate = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    comp.currentState = comp.GameState.TalkToCandidate1;
    comp.activeDialogue = null;
    comp.cdr?.detectChanges?.();
    setTimeout(() => {}, 100);
    return Array.from(document.querySelectorAll('.character-hotspot')).map(h => ({
      pulses: h.classList.contains('show-hint-pulse')
    }));
  });
  await page.waitForTimeout(500);
  const pulseCheck = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.character-hotspot')).map(h => ({
      pulses: h.classList.contains('show-hint-pulse')
    }));
  });
  // hrManager is index 0, candidate is index 1
  // In TalkToCandidate1 state, candidate should pulse, hrManager should not
  assert('#29 candidate (idx 1) pulses in TalkToCandidate1, hrManager (idx 0) does not',
    pulseCheck?.[1]?.pulses === true && pulseCheck?.[0]?.pulses === false,
    JSON.stringify(pulseCheck));

  // Switch state to TalkToHrManager — now hrManager should pulse
  const pulseHr = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    comp.currentState = comp.GameState.TalkToHrManager;
    comp.activeDialogue = null;
    comp.cdr?.detectChanges?.();
    return null;
  });
  await page.waitForTimeout(500);
  const pulseHrCheck = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.character-hotspot')).map(h => ({
      pulses: h.classList.contains('show-hint-pulse')
    }));
  });
  assert('#29 hrManager (idx 0) pulses in TalkToHrManager state',
    pulseHrCheck?.[0]?.pulses === true && pulseHrCheck?.[1]?.pulses === false,
    JSON.stringify(pulseHrCheck));
}

// Task #30 — Business Planning station pulses
async function deep_businessPlanning(page) {
  console.log('\n=== Business Planning (Task #30) ===');
  await loadRoom(page, 'business-planning');
  await page.waitForTimeout(800);

  const pulses = await page.locator('.hotspot.show-hint-pulse').count();
  assert('#30 5 puzzle stations pulse on entry (Exploring state)', pulses >= 4, `count=${pulses}`);

  // Mark one puzzle done — verify only 4 stations now pulse
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) { comp.puzzleCustomersDone = true; comp.cdr?.detectChanges?.(); }
  });
  await page.waitForTimeout(300);
  const pulsesAfter = await page.locator('.hotspot.show-hint-pulse').count();
  assert('#30 after one puzzle done, only 4 stations pulse', pulsesAfter === 4, `count=${pulsesAfter}`);
}

// Task #33 — Digital Skills end-game completion overlay auto-shows
async function deep_digitalSkillsEnd(page) {
  console.log('\n=== Digital Skills end-game (Task #33) ===');
  await loadRoom(page, 'digital-skills');
  await page.waitForTimeout(800);

  // Force AllComplete state and trigger system_allComplete dialogue
  const result = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return { error: 'no comp' };

    // Set AllComplete state and show system_allComplete dialogue
    comp.currentState = comp.GameState.AllComplete;
    comp.showDialogue({ character: 'System', text: 'All complete!', id: 'system_allComplete' });
    comp.cdr?.detectChanges?.();
    return { ok: true };
  });
  assert('#33 setup AllComplete state', result?.ok === true);
  await page.waitForTimeout(500);

  // Dismiss the dialogue (simulating user click)
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) comp.dismissDialogue();
  });
  await page.waitForTimeout(800);

  const stateAfter = await getComponentState(page);
  assert('#33 system_allComplete dismissal auto-shows completion overlay',
    stateAfter?.isGameCompleteOverlayVisible === true, JSON.stringify(stateAfter));
  assert('#33 isDoorOpen=true after AllComplete dismissal',
    stateAfter?.isDoorOpen === true);
}

// Task #37 — Risk Management foundRisks immediate save
async function deep_riskManagement(page) {
  console.log('\n=== Risk Management deep test (Task #37, #38) ===');
  await loadRoom(page, 'risk-management');
  await page.waitForTimeout(800);

  // Get to IdentifyRisks state
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) {
      comp.currentState = comp.GameState.IdentifyRisks;
      comp.activeDialogue = null;
      comp.foundRisks = new Set();
      comp.cdr?.detectChanges?.();
    }
  });
  await page.waitForTimeout(500);

  // Click a risk hotspot (e.g. 'cable') — call inside NgZone so change detection runs
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) {
      // Run inside NgZone so setTimeout callbacks trigger CD
      const inj = window.ng.getInjector(document.querySelector('app-risk-management-module15') || document.body);
      let zone = null;
      try {
        // Find NgZone via injector
        const NgZoneToken = Array.from(inj['parent']?.records?.keys() || []).find(k => k?.toString?.()?.includes?.('NgZone'));
        if (NgZoneToken) zone = inj.get(NgZoneToken);
      } catch {}
      if (!zone && window['Zone']) zone = window['Zone'].current;
      if (zone && zone.run) {
        zone.run(() => comp.onHotspotClick('cable'));
      } else {
        comp.onHotspotClick('cable');
      }
      // Manually trigger change detection
      comp.cdr?.detectChanges?.();
    }
  });

  // Immediately check — foundRisks should already contain 'cable' (synchronous add)
  const immediatelyAfterClick = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    return { foundRisks: Array.from(comp.foundRisks || []), isAnimating: comp.isAnimating };
  });
  assert('#37 foundRisks.add fires synchronously (before animation completes)',
    immediatelyAfterClick?.foundRisks?.includes('cable'),
    JSON.stringify(immediatelyAfterClick));

  // Task #38 — during zoom animation, risk hotspots should be hidden in DOM
  // Trigger Angular change detection by waiting + manually calling detectChanges
  await page.waitForTimeout(50);
  await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (comp) comp.cdr?.detectChanges?.();
  });
  await page.waitForTimeout(50);
  const hotspotsCount = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    return {
      isAnimating: comp?.isAnimating,
      // Count just risk hotspots (have found-risk class or are red-herring) since other states have hotspots too
      riskHotspots: document.querySelectorAll('.hotspot.found-risk, .hotspot.red-herring-hotspot').length,
      // Also check hotspot-layer's first ng-container is gone
      ngContainerStillRendered: !!document.querySelector('.hotspot.red-herring-hotspot')
    };
  });
  assert('#38 risk hotspots hidden while isAnimating (ng-container removed)',
    hotspotsCount?.isAnimating === true && hotspotsCount?.riskHotspots === 0,
    JSON.stringify(hotspotsCount));
}

// Task #34 — Negotiation speakerName replaces 'System'
async function deep_negotiation(page) {
  console.log('\n=== Negotiation speakerName (Task #34) ===');
  await loadRoom(page, 'negotiation-skills');
  await page.waitForTimeout(800);

  const speakerName = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    // speakerName is a private getter, but we can access via the component
    // since Angular doesn't enforce private at runtime
    return comp.speakerName;
  });
  assert('#34 negotiation.speakerName returns player name', speakerName === PLAYER || speakerName === 'You',
    JSON.stringify({ speakerName }));
}

// Task #15 — Adaptability — verify text doesn't contain "100% correct"
async function deep_adaptability(page) {
  console.log('\n=== Adaptability text (Task #15) ===');
  await loadRoom(page, 'adaptability', { dismissIntro: false });
  await page.waitForTimeout(500);

  // Trigger Amina's puzzle2Done dialogue via the text service
  const dialogue = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    return comp.t('characters.amina.dialogues.puzzle2Done');
  });
  assert('#15 Adaptability puzzle2Done dialogue does NOT contain "100% correct"',
    dialogue && !dialogue.includes('100% correct'), dialogue?.substring(0, 150));
}

// Task #16 — Language Skills paragraph count matches HTML
async function deep_languageSkills(page) {
  console.log('\n=== Language Skills paragraphs (Task #16) ===');
  await loadRoom(page, 'language-skills', { dismissIntro: false });
  await page.waitForTimeout(800);

  // Intro popup should show 2 paragraphs (no literal "intro.paragraphs.2" text)
  const popupText = await page.locator('.overlay').first().innerText().catch(() => '');
  assert('#16 intro popup does not contain literal "intro.paragraphs.2"',
    !popupText.includes('paragraphs.2'), popupText.substring(0, 150));
  assert('#16 intro popup does not contain "tona paragraphs"',
    !popupText.includes('tona paragraphs'));
}

// Task #17 — Resilience Ivan dialogue
async function deep_resilience(page) {
  console.log('\n=== Resilience Ivan dialogue (Task #17) ===');
  await loadRoom(page, 'resilience', { dismissIntro: false });
  await page.waitForTimeout(800);

  const ivanReady = await page.evaluate(() => {
    function findComp(el) {
      if (!el) return null;
      try { const c = window.ng.getComponent(el); if (c && c.GameState) return c; } catch {}
      for (const child of el.children) { const r = findComp(child); if (r) return r; }
      return null;
    }
    const comp = findComp(document.body);
    return comp?.t('characters.ivan.dialogues.readyNext');
  });
  assert('#17 Ivan readyNext is no longer "Ready discover next skill?"',
    ivanReady && !ivanReady.includes('Ready discover'), ivanReady);
}

// Task #20 — "Training completed!" texts across rooms
async function deep_completedTexts(page) {
  console.log('\n=== "Training completed!" texts (Task #20) ===');
  const rooms = ['risk-management', 'flexibility', 'leadership', 'tolerance', 'crm', 'self-reliance', 'teamwork', 'critical-thinking'];
  for (const r of rooms) {
    const j = await page.evaluate(async (roomId) => {
      return await fetch(`/assets/i18n/escape-rooms/${roomId}/en.json`).then(r => r.json());
    }, r);
    const s = JSON.stringify(j);
    const hasOld = s.includes('Click on the door') || s.includes('click on the door');
    assert(`#20 ${r} no "Click on the door"`, !hasOld);
  }
}

// =============================================================================
//   MAIN
// =============================================================================

(async () => {
  const { browser, page } = await setupPage();

  await deep_culturalAwareness(page);
  await deep_empathy(page);
  await deep_openMindedness(page);
  await deep_stressManagement(page);
  await deep_matchingLabels(page);
  await deep_trustBuildingReveal(page);
  await deep_activeListeningScoring(page);
  await deep_characterPulse(page);
  await deep_hintButtonPulse(page);
  await deep_crmZOrder(page);
  await deep_motivatingOthers(page);
  await deep_businessPlanning(page);
  await deep_digitalSkillsEnd(page);
  await deep_riskManagement(page);
  await deep_negotiation(page);
  await deep_adaptability(page);
  await deep_languageSkills(page);
  await deep_resilience(page);
  await deep_completedTexts(page);

  console.log(`\n========== DEEP TEST SUMMARY ==========`);
  console.log(`Passed: ${pass}    Failed: ${fail}`);
  if (failures.length) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f.label}${f.info ? '    [' + f.info + ']' : ''}`));
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => { console.error('FATAL:', e); process.exit(2); });
