/**
 * E2E Full Playthrough Test — All Escape Rooms (except initial 6)
 *
 * Tests complete game flow using skip buttons for puzzles.
 * Verifies that skipping puzzles does NOT break the game state machine.
 *
 * Run:    node e2e-all-rooms-playthrough.mjs [room-id]
 * Example: node e2e-all-rooms-playthrough.mjs flexibility
 * Requires: ng serve running on localhost:4200 (dev mode for window.ng)
 */

import { chromium } from 'playwright';

const BASE = 'http://localhost:4200';
const TIMEOUT_PER_ROOM = 120_000; // 2 minutes max per room
const SINGLE_ROOM = process.argv[2] || null;

let totalPassed = 0, totalFailed = 0, totalSkipped = 0;
const results = {};

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

/** Call a method on the escape room component via Angular debug tools.
 *  Runs inside NgZone so setTimeout callbacks trigger change detection. */
async function componentExec(page, method, ...args) {
  const result = await page.evaluate(({ method, args }) => {
    if (!window.ng) return { error: 'window.ng not available' };
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && typeof comp.onHotspotClick === 'function') return { comp, el };
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const r = findComp(document.body);
    if (!r) return { error: 'Escape room component not found in DOM' };
    const { comp, el } = r;
    if (typeof comp[method] !== 'function') {
      return { error: `Method '${method}' not found on component` };
    }
    try {
      // Run inside NgZone so zone.js-patched setTimeout/setInterval
      // callbacks trigger proper change detection
      const zone = comp.ngZone || comp.zone || comp._zone;
      if (zone && typeof zone.run === 'function') {
        zone.run(() => comp[method](...args));
      } else {
        comp[method](...args);
      }
      try { comp.cdr?.detectChanges(); } catch {}
      try { window.ng.applyChanges(el); } catch {}
      return { ok: true };
    } catch (e) {
      return { error: e.message };
    }
  }, { method, args });
  if (result?.error) throw new Error(`componentExec(${method}): ${result.error}`);
}

/** Read a property from the escape room component */
async function componentGet(page, prop) {
  return page.evaluate((prop) => {
    if (!window.ng) return null;
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && typeof comp.onHotspotClick === 'function') return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    return comp[prop];
  }, prop);
}

/** Get full game state snapshot */
async function getState(page) {
  return page.evaluate(() => {
    if (!window.ng) return null;
    function findComp(el) {
      if (!el) return null;
      try {
        const comp = window.ng.getComponent(el);
        if (comp && typeof comp.onHotspotClick === 'function') return comp;
      } catch {}
      for (const child of el.children) {
        const r = findComp(child);
        if (r) return r;
      }
      return null;
    }
    const comp = findComp(document.body);
    if (!comp) return null;
    let stateName = null;
    if (comp.GameState) {
      for (const [key, value] of Object.entries(comp.GameState)) {
        if (value === comp.currentState && isNaN(Number(key))) { stateName = key; break; }
      }
    }
    return {
      state: comp.currentState,
      stateName,
      view: comp.currentView || 'main',
      doorOpen: !!comp.isDoorOpen,
      gameComplete: !!comp.isGameCompleteOverlayVisible,
      hasDialogue: !!comp.activeDialogue,
      dialogueId: comp.activeDialogue?.id || null,
      isQuizActive: !!comp.isQuizActive,
      bg: comp.currentBackgroundUrl || '',
    };
  });
}

/** Dismiss one dialogue via UI (click panel to skip typing, then click continue) */
async function dismissOne(page) {
  const panel = page.locator('.dialogue-panel');
  if (!await panel.isVisible({ timeout: 1500 }).catch(() => false)) return false;
  // Use force:true to bypass overlay intercept issues
  await panel.click({ force: true, timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(350);
  const btn = page.locator('.dialogue-actions button');
  if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
    await btn.click({ force: true, timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
    return true;
  }
  // Fallback: call dismissDialogue directly via component
  try {
    await componentExec(page, 'skipTyping');
    await page.waitForTimeout(200);
    await componentExec(page, 'handleDialogueDismiss');
    await page.waitForTimeout(400);
    return true;
  } catch {
    try {
      await componentExec(page, 'dismissDialogue');
      await page.waitForTimeout(400);
      return true;
    } catch { return false; }
  }
}

/** Dismiss all pending dialogues (up to max iterations) */
async function dismissAll(page, max = 30) {
  let count = 0;
  for (let i = 0; i < max; i++) {
    const state = await getState(page);
    if (!state?.hasDialogue) break;
    if (!await dismissOne(page)) break;
    count++;
  }
  return count;
}

/** Wait until the view changes from 'main' (for zoom animations, 2150ms). Returns new view or null. */
async function waitForZoom(page, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const state = await getState(page);
    if (state?.view && state.view !== 'main') return state.view;
    await page.waitForTimeout(200);
  }
  return null;
}

/** Close the intro popup via UI click */
async function closeIntro(page) {
  const btn = page.locator('mat-card-actions button').first();
  if (await btn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1000);
    return true;
  }
  return false;
}

/** Check if a close-method's associated popup is visible */
async function isPopupVisible(page, closeMethodName) {
  // closeFoo -> isFooVisible
  const itemName = closeMethodName.replace('close', '');
  const flagName = 'is' + itemName + 'Visible';
  return await componentGet(page, flagName) || false;
}

// ═══════════════════════════════════════════════════════════
// STEP RUNNER
// ═══════════════════════════════════════════════════════════

/**
 * Execute a sequence of steps for a room.
 * Between every step, all pending dialogues are dismissed.
 * Step types:
 *   { click: 'hotspotName' }        — call onHotspotClick(name)
 *   { click: 'name', wait: 2000 }   — click + extra wait (for zoom animation)
 *   { call: 'methodName' }          — call a component method (skip, close, etc.)
 *   { callIf: 'method', flag: 'x' } — call method only if comp[flag] is truthy
 *   { wait: 500 }                   — explicit pause
 */
async function runSteps(page, roomId, steps) {
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Always dismiss pending dialogues first
    await dismissAll(page);

    // Check early completion
    const preState = await getState(page);
    if (preState?.gameComplete) {
      console.log(`    (game complete at step ${i + 1})`);
      return true;
    }

    // Detect a STUCK character/talking background: we are in an interactive
    // main-view state with no dialogue/quiz up, yet the scene is still a
    // "*_talking" close-up (a dialogue transition forgot to call updateBackground()).
    if (preState && preState.view === 'main' && !preState.hasDialogue && !preState.isQuizActive
        && /talking|_talk\.|Talking/.test(preState.bg)) {
      console.log(`    ⚠ STUCK-BG: '${(preState.bg||'').split('/').pop()}' at ${preState.stateName} (main view, no dialogue)`);
    }

    try {
      if (step.click) {
        console.log(`    ${i + 1}. click '${step.click}'  [state=${preState?.stateName}, view=${preState?.view}]`);
        await componentExec(page, 'onHotspotClick', step.click);
        if (step.wait) {
          // This is a zoom action — wait for view to change
          const newView = await waitForZoom(page, step.wait);
          if (newView) console.log(`       → zoomed to '${newView}'`);
          else console.log(`       → zoom wait expired (view still '${(await getState(page))?.view}')`);
        } else {
          await page.waitForTimeout(500);
        }
      } else if (step.call) {
        // For close methods, guard on popup visibility
        if (step.call.startsWith('close')) {
          const visible = await isPopupVisible(page, step.call);
          if (!visible) {
            console.log(`    ${i + 1}. skip '${step.call}' (popup not visible)`);
            continue;
          }
        }
        const callArgs = step.args || [];
        console.log(`    ${i + 1}. call '${step.call}'(${callArgs.join(',')})  [state=${preState?.stateName}]`);
        await componentExec(page, step.call, ...callArgs);
        await page.waitForTimeout(500);
      } else if (step.callIf) {
        const flag = await componentGet(page, step.flag);
        if (flag) {
          console.log(`    ${i + 1}. call '${step.callIf}' (${step.flag}=true)`);
          await componentExec(page, step.callIf);
          await page.waitForTimeout(500);
        } else {
          console.log(`    ${i + 1}. skip '${step.callIf}' (${step.flag}=false)`);
        }
      } else if (step.setAndCall) {
        // Set properties on the component, then call a method
        const { set, method } = step.setAndCall;
        console.log(`    ${i + 1}. set ${JSON.stringify(set)} + call '${method}'  [state=${preState?.stateName}]`);
        await page.evaluate(({ setProps, method }) => {
          function findComp(el) {
            if (!el) return null;
            try {
              const comp = window.ng.getComponent(el);
              if (comp && typeof comp.onHotspotClick === 'function') return { comp, el };
            } catch {}
            for (const child of el.children) {
              const r = findComp(child);
              if (r) return r;
            }
            return null;
          }
          const r = findComp(document.body);
          if (!r) throw new Error('Component not found');
          const { comp, el } = r;
          // Set properties
          for (const [key, value] of Object.entries(setProps)) {
            comp[key] = value;
          }
          // Call method inside NgZone
          const zone = comp.ngZone || comp.zone;
          if (zone) zone.run(() => comp[method]());
          else comp[method]();
          try { comp.cdr?.detectChanges(); } catch {}
          try { window.ng.applyChanges(el); } catch {}
        }, { setProps: set, method });
        await page.waitForTimeout(500);
      } else if (step.wait) {
        await page.waitForTimeout(step.wait);
      }
    } catch (err) {
      console.log(`    ${i + 1}. ERROR: ${err.message}`);
      // Don't abort — try to continue
    }
  }

  // Final dismiss
  await dismissAll(page);

  // If door open but not complete, try clicking exitDoor
  const postState = await getState(page);
  if (postState?.doorOpen && !postState?.gameComplete) {
    console.log(`    → Door open, clicking exitDoor...`);
    try {
      await componentExec(page, 'onHotspotClick', 'exitDoor');
      await page.waitForTimeout(1000);
      await dismissAll(page);
    } catch {}
  }

  const finalState = await getState(page);
  return finalState?.gameComplete || false;
}

// ═══════════════════════════════════════════════════════════
// ROOM DEFINITIONS
// ═══════════════════════════════════════════════════════════
//
// For each room: an ordered list of steps that drive the game
// from intro close → game complete, using skip for all puzzles.
//
// The runner auto-dismisses ALL dialogues between every step.
//
// ═══════════════════════════════════════════════════════════

const ROOMS = {

  // ─── INITIAL 6 (characters use onCharacterClick; have skipPuzzle1/2/3) ───

  'cultural-awareness': {
    steps: [
      { call: 'onCharacterClick', args: ['hrManager'] },  // intro chain → FindNote
      { click: 'rightBoard', wait: 3000 },                // zoom right board
      { click: 'note' },                                  // find note
      { call: 'closeNote' },                              // → NoteFound
      { call: 'goBack' },                                 // back to main view
      { call: 'onCharacterClick', args: ['hrManager'] },  // NoteFound chain → Quiz
      { call: 'skipPuzzle1' },                            // → QuizComplete + overlay
      { call: 'closeQuizCompleteOverlay' },              // close overlay
      { call: 'onCharacterClick', args: ['hrManager'] },  // QuizComplete chain → FindPaper
      { call: 'onCharacterClick', args: ['colleague'] },  // Jun → laptop hint (hasLaptopHint)
      { click: 'laptop' },                                // find paper
      { call: 'closePaper' },                             // → PaperFound
      { call: 'onCharacterClick', args: ['hrManager'] },  // PaperFound chain → PuzzleTwo
      { call: 'skipPuzzle2' },                            // → PuzzleThree
      { call: 'skipPuzzle3' },                            // → AllQuestsComplete + dialogue
      { call: 'onCharacterClick', args: ['hrManager'] },  // AllQuests chain → door opens
      { click: 'exitDoor' },                              // complete
    ]
  },

  'financial': {
    steps: [
      { call: 'onCharacterClick', args: ['amina'] },
      { call: 'skipPuzzle1' }, { call: 'onCharacterClick', args: ['amina'] },
      { call: 'skipPuzzle2' }, { call: 'skipPuzzle3' },
      { call: 'onCharacterClick', args: ['amina'] }, { call: 'onCharacterClick', args: ['amina'] },
      { click: 'exitDoor' },
    ]
  },
  'strategic-thinking': {
    steps: [
      { call: 'onCharacterClick', args: ['jake'] },
      { call: 'skipPuzzle1' }, { call: 'onCharacterClick', args: ['sofia'] },
      { call: 'skipPuzzle2' }, { call: 'skipPuzzle3' },
      { call: 'onCharacterClick', args: ['sofia'] }, { call: 'onCharacterClick', args: ['sofia'] },
      { click: 'exitDoor' },
    ]
  },
  'open-mindedness': {
    steps: [
      { call: 'onCharacterClick', args: ['karina'] },
      { call: 'skipPuzzle1' }, { call: 'onCharacterClick', args: ['karina'] },
      { call: 'skipPuzzle2' }, { call: 'skipPuzzle3' },
      { call: 'onCharacterClick', args: ['karina'] }, { call: 'onCharacterClick', args: ['karina'] },
      { click: 'exitDoor' },
    ]
  },
  'stress-management': {
    steps: [
      { click: 'kevin' },
      { call: 'skipPuzzle1' }, { click: 'kevin' },
      { call: 'skipPuzzle2' }, { call: 'skipPuzzle3' },
      { click: 'kevin' }, { click: 'kevin' },
      { click: 'exitDoor' },
    ]
  },
  'empathy': {
    steps: [
      { click: 'coach' },
      { call: 'skipPuzzle1' }, { click: 'coach' },
      { call: 'skipPuzzle2' }, { call: 'skipPuzzle3' },
      { click: 'coach' }, { click: 'coach' },
      { click: 'exitDoor' },
    ]
  },

  // ─── GROUP 1: Standard 3-puzzle rooms (single guide) ───

  'flexibility': {
    steps: [
      { click: 'elena' },                    // TalkToElena1 → greet chain
      { click: 'table' },                    // FindStickyNote → 1st click sets hasClickedLaptop flag
      { click: 'table', wait: 3000 },        // 2nd click → zoom to table (2150ms zoom)
      { click: 'stickyNote' },               // click item in zoom → foundStickyNote
      { call: 'closeStickyNote' },           // close popup → stickyNoteRead
      { click: 'elena' },                    // TalkToElena2 → stickyNoteFound → quiz1Intro
      { call: 'skipPuzzle1' },               // skip T/F puzzle → Puzzle1Complete
      { click: 'elena' },                    // quiz1Done → findPaper
      { click: 'trashbin', wait: 3000 },     // FindPaper → zoom to trashbin
      { click: 'paper' },                    // click item → foundPaper
      { call: 'closePaper' },               // close popup → paperRead
      { click: 'elena' },                    // TalkToElena3 → paperFound → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip SC → Puzzle3_SequenceOrder
      { call: 'skipPuzzle3' },               // skip Seq → finalWords dialogue
      { click: 'exitDoor' },                // Completion → game complete
    ]
  },

  'interpersonal-skills': {
    steps: [
      { click: 'carlos' },                   // TalkToCarlos1 → greet → findMagazine
      { click: 'coffeeTable', wait: 3000 },  // FindMagazine → zoom
      { click: 'magazine' },                 // found magazine
      { call: 'closeMagazine' },            // close → magazineRead
      { click: 'carlos' },                   // TalkToCarlos2 → quiz1Intro
      { call: 'skipPuzzle1' },               // skip T/F
      { click: 'carlos' },                   // Puzzle1Complete → quiz1Done → findFolder
      { click: 'bookshelf', wait: 3000 },    // FindFolder → zoom
      { click: 'folder' },                   // found folder
      { call: 'closeFolder' },              // close → folderRead
      { click: 'carlos' },                   // TalkToCarlos3 → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip SC → Puzzle3
      { call: 'skipPuzzle3' },               // skip Seq → finalWords
      { click: 'exitDoor' },
    ]
  },

  'language-skills': {
    steps: [
      { click: 'maria' },                    // TalkToMaria1 → greet → findTablet
      { click: 'desk', wait: 3000 },         // FindTablet → zoom to desk
      { click: 'tablet' },                   // found tablet → foundTablet dialogue
      { call: 'closeTablet' },              // close popup → tabletRead
      { click: 'maria' },                    // TalkToMaria2 → tabletFound → quiz1Intro
      { call: 'skipPuzzle1' },               // skip Fill-the-Gap
      { click: 'maria' },                    // Puzzle1Complete → quiz1Done → findFlipchart
      { click: 'flipchartArea', wait: 3000 },// FindFlipchart → zoom
      { click: 'flipchartContent' },         // found flipchart (popup direct)
      { call: 'closeFlipchart' },           // close → goBack + foundFlipchart
      { click: 'maria' },                    // TalkToMaria3 → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip SC → Puzzle3
      { call: 'skipPuzzle3' },               // skip Seq → finalWords
      { click: 'exitDoor' },
    ]
  },

  'legal-compliance': {
    steps: [
      { click: 'sarah' },                    // TalkToSarah1 → greet → findDocument
      { click: 'cabinet', wait: 3000 },      // FindDocument → zoom
      { click: 'document' },                 // found document
      { call: 'closeDocument' },            // close → documentRead
      { click: 'sarah' },                    // TalkToSarah2 → puzzle1Intro
      { call: 'skipPuzzle1' },               // skip Matching
      { click: 'sarah' },                    // Puzzle1Complete → findEmail
      { click: 'bookshelf', wait: 3000 },    // FindEmail → zoom
      { click: 'email' },                    // found email
      { call: 'closeEmail' },              // close → emailRead
      { click: 'sarah' },                    // TalkToSarah3 → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip Seq
      { call: 'skipPuzzle3' },               // skip SC → finalWords
      { click: 'exitDoor' },
    ]
  },

  'market-awareness': {
    steps: [
      { click: 'elena' },                    // TalkToElena1 → greet → findCard
      { click: 'table', wait: 3000 },        // FindCard → zoom to table
      { click: 'personaCard' },              // found persona card
      { call: 'closePersonaCard' },         // close → cardRead
      { click: 'elena' },                    // TalkToElena2 → puzzle1Intro
      { call: 'skipPuzzle1' },               // skip Matching
      { click: 'elena' },                    // Puzzle1Complete → findSwot
      { click: 'davidDesk', wait: 3000 },    // FindSwot → zoom
      { click: 'swotSheet' },               // found SWOT sheet
      { call: 'closeSwotPaper' },           // close → swotRead
      { click: 'elena' },                    // TalkToElena3 → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip SC
      { call: 'skipPuzzle3' },               // skip Seq → finalWords
      { click: 'exitDoor' },
    ]
  },

  // ─── GROUP 2: Standard with dual guide ────────────────

  'self-reliance': {
    steps: [
      { click: 'amina' },                    // TalkToAmina1 → greet → stressful → findStickyNote
      { click: 'table', wait: 3000 },        // FindStickyNote → zoom (skip wrong clicks)
      { click: 'stickyNote' },
      { call: 'closeStickyNote' },
      { click: 'david' },                    // TalkToDavid1 → stickyNoteFound → quiz1Intro
      { call: 'skipPuzzle1' },               // skip T/F (5 questions)
      { click: 'david' },                    // Puzzle1Complete → quiz1Done → findPaper
      // FindPaper: try the area near david
      { click: 'plant', wait: 3000 },        // might zoom to plant area (wrong)
      { click: 'david' },                    // might trigger david area zoom
      // Fallback: try desk area
      { click: 'desk', wait: 3000 },
      { click: 'paper' },
      { call: 'closePaper' },
      { click: 'david' },                    // TalkToDavid2 → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip SC → Puzzle3
      { call: 'skipPuzzle3' },               // skip Seq → finalWords
      { click: 'exitDoor' },
    ]
  },

  'teamwork': {
    steps: [
      { click: 'priya' },                    // TalkToPriya1 → greet
      { click: 'oleh' },                     // TalkToOleh1 → greet → findFolder
      // FindFolder: 3-step search
      { click: 'frontDesk', wait: 3000 },    // correct: zoom to front desk
      { click: 'folder' },                   // found folder
      { call: 'closeFolder' },              // close → folderRead
      { click: 'oleh' },                     // TalkToOleh2 → quiz1Intro
      { call: 'skipPuzzle1' },               // skip T/F (5 questions)
      { click: 'oleh' },                     // Puzzle1Complete post
      { click: 'priya' },                    // findPoster chain
      // FindPoster: search
      { click: 'backTable', wait: 3000 },    // zoom to back table
      { click: 'poster' },                   // found poster (might be 'content')
      { call: 'closePoster' },
      { click: 'priya' },                    // puzzle2Intro
      { call: 'skipPuzzle2' },               // skip SC → Puzzle3
      { call: 'skipPuzzle3' },               // skip Seq → finalWords
      { click: 'exitDoor' },
    ]
  },

  'resilience': {
    steps: [
      { click: 'layla' },                    // TalkToLayla1 → greet → findBox
      // FindBox: search (lowShelf correct)
      { click: 'lowShelf', wait: 3000 },     // zoom
      { click: 'box' },                      // found box
      { call: 'closeBox' },                 // close → foundBox
      { click: 'layla' },                    // TalkToLayla2 → explanation chain → puzzle1
      { call: 'skipPuzzle1' },               // skip Matching
      { click: 'layla' },                    // Puzzle1Complete → findDrawer
      // FindDrawer: search (drawer correct)
      { click: 'drawer', wait: 3000 },       // zoom
      { click: 'note' },                     // found note
      { call: 'closeNote' },                // close → foundNote
      { click: 'ivan' },                     // TalkToIvan → puzzle2
      { call: 'skipPuzzle2' },               // skip Fill-the-Gap
      { call: 'skipPuzzle3' },               // skip Pattern → finalWords
      { click: 'exitDoor' },
    ]
  },

  'tolerance': {
    steps: [
      { click: 'amelia' },                   // TalkToAmelia1 → greet → findFolder
      // FindFolder: marcoFolder area
      { click: 'marcoFolder', wait: 3000 },  // zoom to marco's table area
      { click: 'folder' },                   // found folder
      { call: 'closeFolder' },              // close → foundFolder
      { click: 'marco' },                    // TalkToMarco → 5-dialogue chain
      { call: 'skipPuzzle1' },               // skip Matching
      { click: 'amelia' },                   // Puzzle1Complete → findFrame
      // FindFrame: frames area
      { click: 'frames', wait: 3000 },       // zoom
      { click: 'frame' },                    // found frame
      { call: 'closeFrame' },               // close → foundFrame
      { click: 'amelia' },                   // TalkToAmelia2 → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip Fill-the-Gap
      { call: 'skipPuzzle3' },               // skip Pattern → finalWords
      { click: 'exitDoor' },
    ]
  },

  // ─── GROUP 3: 4-puzzle rooms ──────────────────────────

  'trust-building': {
    steps: [
      { click: 'kate' },                     // TalkToKate1 → greet → proposeExercise → findPhone
      // FindPhone: bag area
      { click: 'bag', wait: 3000 },          // zoom to bag
      { click: 'phone' },                    // found phone
      { call: 'closePhone' },               // close → emailRead
      // TalkToKate2
      { click: 'kate' },                     // goToWhiteboard chain
      // GoToWhiteboard: click whiteboard
      { click: 'whiteboard', wait: 3000 },   // zoom to whiteboard
      { click: 'content' },                  // triggers puzzle 1
      { call: 'skipPuzzle1' },               // skip Matching (7 pairs)
      // Puzzle1Complete
      { click: 'kate' },                     // puzzle1Complete → KateStory
      { click: 'kate' },                     // personalStory → reactToStory → Puzzle2
      { call: 'skipPuzzle2' },               // skip Single Choice 1
      // After puzzle 2: noticePaper → table
      { click: 'table', wait: 3000 },        // zoom to table
      { click: 'paper' },                    // found paper
      { call: 'closePaper' },               // close → paperRead → Puzzle3
      { call: 'skipPuzzle3' },               // skip Fill-the-Gap
      // After puzzle 3: thanks → clickLaptop
      { click: 'laptop', wait: 3000 },       // zoom to laptop
      { click: 'stickyNote' },              // found sticky note
      { call: 'closeStickyNote' },           // close → stickyNoteRead → Puzzle4
      { call: 'skipPuzzle4' },               // skip Single Choice 2 → Reveal
      // Reveal: need Hiroshi → Kate dialogue chain for door to open
      { click: 'hiroshi' },                  // hiroshi_reveal → kate_finalWords → Completion + door
      { click: 'exitDoor' },
    ]
  },

  'leadership': {
    steps: [
      { click: 'hrManager' },               // TalkToHRManager1 → greet → enterOffice chain
      // FindWhiteboard
      { click: 'whiteboard', wait: 3000 },   // zoom to whiteboard
      { click: 'observation' },              // found observation/whiteboard content
      { call: 'closeWhiteboard' },           // close → whiteboardRead
      { click: 'hrManager' },               // TalkToHRManager2 → puzzle1Intro
      { call: 'skipPuzzle1' },               // skip Matching (4 pairs)
      { click: 'hrManager' },               // puzzle1Done → puzzle2Intro
      { call: 'skipPuzzle2' },               // skip Single Choice
      // Puzzle2Complete → findCard
      { click: 'hrManager' },               // puzzle2Done → findCard
      { click: 'wallFrame', wait: 3000 },    // zoom to wall frame
      { click: 'card' },                     // found reflection card
      { call: 'closeReflectionCard' },       // close → cardRead
      { click: 'hrManager' },               // TalkToHRManager4 → puzzle3Intro
      { call: 'skipPuzzle3' },               // skip Fill-the-Gap
      { click: 'hrManager' },               // puzzle3Done → puzzle4Intro
      { call: 'skipPuzzle4' },               // skip T/F → final words
      { click: 'exitDoor' },
    ]
  },

  // ─── GROUP 4: Complex multi-phase rooms ───────────────

  'active-listening': {
    steps: [
      { click: 'mateo' },                    // TalkToMateo1 → greet → clue
      // FindPaper: plants area
      { click: 'plants', wait: 3000 },       // zoom to plants
      { click: 'paper' },                    // found paper
      { call: 'closePaper' },               // close → paperRead
      { click: 'mateo' },                    // TalkToMateo2 → fastLearner
      // ClickLaptop1: click laptop → puzzle 1
      { click: 'laptop', wait: 3000 },       // zoom to laptop
      { click: 'content' },                  // trigger puzzle 1
      { call: 'skipPuzzle1' },               // skip Multiple Choice
      // Puzzle1Complete → 10-step conversation
      { click: 'mateo' },                    // puzzle1Done → noticeCues → Conversation
      // 10-step conversation chain will be auto-dismissed
      // After conv: backToYou → ClickLaptop2
      { click: 'laptop', wait: 3000 },       // zoom to laptop
      { click: 'content' },                  // trigger puzzle 2
      { call: 'skipPuzzle2' },               // skip Fill-the-Gap
      // Puzzle2Complete
      { click: 'zainabu' },                 // pendriveTask → FindPendrive
      // FindPendrive: floor area
      { click: 'floor', wait: 3000 },        // zoom to floor
      { click: 'pendrive' },                // found pendrive → foundPendrive
      // ClickLaptop3: text file
      { click: 'laptop', wait: 3000 },
      { click: 'content' },                  // text file popup
      { call: 'closeTextFile' },             // close → textFileRead
      // TalkToZainabu
      { click: 'zainabu' },                 // readyForFinal → ClickLaptop4
      { click: 'laptop', wait: 3000 },
      { click: 'content' },                  // trigger puzzle 3
      { call: 'skipPuzzle3' },               // skip Matching
      // Final congratulations chain → Completion
      { click: 'exitDoor' },
    ]
  },

  'adaptability': {
    steps: [
      // Floor 1: Anastasia
      { click: 'anastasia' },               // TalkToAnastasia → greet → findPoster
      { click: 'wall', wait: 3000 },         // zoom to wall
      { click: 'poster' },                   // found poster
      { call: 'closePoster' },              // close → posterRead
      { click: 'anastasia' },               // TalkToAnastasia2 → puzzle1Intro
      { call: 'skipPuzzle1' },               // skip Multiple Choice
      // MoveToFloor2
      { click: 'anastasia' },               // puzzle1Done → floor transition
      { call: 'continueFloorTransition' },   // dismiss transition → Floor 2
      // Floor 2: Amina
      { click: 'amina' },                    // TalkToAmina → greet → findTabletIcon
      { click: 'tablet', wait: 3000 },       // zoom to tablet
      { click: 'tabletIcon' },              // found icon → foundTabletIcon
      // Read file
      { click: 'tablet', wait: 3000 },
      { click: 'content' },                  // text file
      { call: 'closeTextFile' },             // close → textFileRead
      { click: 'amina' },                    // TalkToAmina2 → puzzle2Intro
      // ClickTablet → Puzzle2
      { click: 'tablet', wait: 3000 },
      { click: 'content' },
      { call: 'skipPuzzle2' },               // skip Fill-the-Gap
      // MoveToFloor3
      { click: 'amina' },                    // puzzle2Done → floor transition
      { call: 'continueFloorTransition' },   // → Floor 3
      // Floor 3: Wei
      { click: 'wei' },                      // TalkToWei → greet → findStickyNote
      { click: 'weiArea', wait: 3000 },      // zoom to wei's area
      { click: 'stickyNote' },              // found sticky note
      { call: 'closeStickyNote' },           // close → stickyNoteRead
      { click: 'wei' },                      // TalkToWei2 → puzzle3Intro
      { call: 'skipPuzzle3' },               // skip Sequence Order
      // Completion → door opens
      { click: 'exitDoor' },
    ]
  },

  'motivating-others': {
    steps: [
      { click: 'candidate' },               // TalkToCandidate1 → greet → greet2
      // Puzzle1 starts from dialogue chain
      { call: 'skipPuzzle1' },               // skip Single Choice
      { click: 'candidate' },               // afterTask1 → TalkToHrManager
      { click: 'hrManager' },               // observe → FindFolder
      // FindFolder
      { click: 'folder', wait: 3000 },       // zoom to folder
      { click: 'folder_item' },             // found folder item
      { call: 'closeFolder' },              // close folder popup
      // StrengthRecognition: must select correct answers then submit
      { setAndCall: { set: { selectedStrengths: ['language', 'volunteering'] }, method: 'submitStrengths' } },
      { click: 'candidate' },               // afterStrengths
      { call: 'skipPuzzle2' },               // skip Sequence Order
      { call: 'skipPuzzle3' },               // skip Matching → BodyLanguage
      // BodyLanguage: must select correct answers then submit (no skip method)
      { setAndCall: { set: { selectedBodyLanguage: ['clenched', 'eyeContact'] }, method: 'submitBodyLanguage' } },
      // CandidateThankYou → Reveal → finalWords → Completion
      { click: 'candidate' },               // thankYou → Reveal → hrManager_finalWords
      { click: 'exitDoor' },
    ]
  },

  // ─── GROUP 5: Non-linear / No characters ──────────────

  'crm': {
    steps: [
      // Puzzle 1: Complaint Call (via Peter)
      { click: 'peter' },                    // intro1 → intro2 → intro3 → startCall
      { call: 'skipPuzzle1' },               // skip complaint call
      // Puzzle 2: Customer Registry (via Cabinet)
      { click: 'cabinet' },                  // cabinetBurst → cabinetSort → guidelinesPrompt
      // After guidelines prompt, need to start the registry
      { call: 'skipPuzzle2' },               // skip customer registry
      // Puzzle 3: Feedback Survey (via Simone)
      { click: 'simone' },                   // intro1 → intro2 → intro3 → startSurvey
      { call: 'skipPuzzle3' },               // skip feedback survey
      // All puzzles done → allComplete → Completion
      { click: 'exitDoor' },
    ]
  },

  'decision-making': {
    steps: [
      // Elevator room: unique flow
      // Outside: click call button → enter elevator
      { click: 'callButton' },              // outside → enter
      { click: 'elevatorInside' },          // enter elevator
      // Press floor button
      { click: 'buttonPanel' },             // press button → moving → malfunction
      // Wait for malfunction sequence
      { wait: 3000 },
      // Skip the entire decision process
      { call: 'skipDecisionProcess' },       // → near completion
      { click: 'exitDoor' },
    ]
  },

  'business-planning': {
    steps: [
      // 5 puzzles, any order — skip all. Each skip shows dialogue if allPuzzlesDone.
      { call: 'skipPuzzleCustomers' },
      { call: 'skipPuzzleValueProp' },
      { call: 'skipPuzzleChannels' },
      { call: 'skipPuzzleRevenue' },
      { call: 'skipPuzzleCosts' },            // 5th skip triggers allPuzzlesComplete dialogue
      // After dismissing allPuzzlesComplete, click whiteboard to enter canvas view
      { click: 'whiteboard', wait: 3000 },   // zoom to whiteboard
      { click: 'whiteboardContent' },        // open canvas view
      { call: 'finishEscapeRoom' },          // close canvas → system_canvasViewed → Completion
      { click: 'exitDoor' },
    ]
  },

  'digital-skills': {
    steps: [
      // Linear progression, no characters. 4 main + 5 mini puzzles.
      { call: 'skipPasswordAudit' },          // → PasswordAuditDone → OpenMonitor
      { call: 'skipPhishing' },               // → PhishingDone → OpenPhone
      { call: 'skipSocialPost' },             // → SocialPostDone → Comments
      { call: 'skipComments' },               // → CommentsDone → StickyNote
      // 5 mini-puzzles (no skip methods) — must interact with each
      { click: 'stickyNote' },               // StickyNote → found dialogue
      { call: 'handleStickyNote', args: ['yes'] },  // shred → MiniUSB
      { click: 'drawer', wait: 3000 },       // zoom to drawer
      { click: 'drawerContent' },            // USB found dialogue
      { call: 'handleUSB', args: ['leave'] },// leave USB → MiniAd
      // MiniAd auto-shows dialogue, then overlay
      { call: 'handleAd', args: ['close'] }, // close ad → MiniUpdate
      // MiniUpdate auto-shows dialogue, then overlay
      { call: 'handleSystemUpdate', args: ['install'] }, // install → MiniWifi
      // MiniWifi auto-shows dialogue, then overlay
      { call: 'handleWifi', args: ['company'] }, // use company wifi → AllComplete → Completion
      { click: 'exitDoor' },
    ]
  },

  'risk-management': {
    steps: [
      // Skip identification + assessment
      { call: 'skipIdentification' },        // → AllRisksFound
      { call: 'skipAssessment' },            // → ReviewAssessment
      { call: 'endAssessment' },             // → congratulations dialogue → Completion + door
      { click: 'exitDoor' },
    ]
  },

  'critical-thinking': {
    // Now has a state-aware skipPuzzle() (added for skip-everywhere parity).
    steps: [
      { call: 'skipPuzzle' }, { call: 'skipPuzzle' },
      { call: 'skipPuzzle' }, { call: 'skipPuzzle' },
      { click: 'exitDoor' },
    ]
  },

  'negotiation-skills': {
    // Now has a state-aware skipPuzzle() (added for skip-everywhere parity).
    steps: [
      { call: 'skipPuzzle' }, { call: 'skipPuzzle' },
      { call: 'skipPuzzle' }, { call: 'skipPuzzle' },
      { click: 'exitDoor' },
    ]
  },

  'networking-skills': {
    steps: [
      // Has skipPuzzle1-4
      { call: 'skipPuzzle1' },               // skip Initiate phase
      { call: 'skipPuzzle2' },               // skip Build phase
      { call: 'skipPuzzle3' },               // skip Maintain phase
      { call: 'skipPuzzle4' },               // skip Leverage phase
      { click: 'exitDoor' },
    ]
  },
};

// ═══════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════

const roomsToTest = SINGLE_ROOM
  ? { [SINGLE_ROOM]: ROOMS[SINGLE_ROOM] }
  : ROOMS;

if (SINGLE_ROOM && !ROOMS[SINGLE_ROOM]) {
  console.error(`Unknown room: ${SINGLE_ROOM}`);
  console.error(`Available: ${Object.keys(ROOMS).join(', ')}`);
  process.exit(1);
}

let browser;
try {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  for (const [roomId, config] of Object.entries(roomsToTest)) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    // Neutralize confounds before any page script runs:
    //  - set a player name so the name-prompt never appears
    //  - mark the anonymous login-warning dialog as already dismissed
    //    (it otherwise opens a modal whose backdrop intercepts all clicks)
    //  - force English so logged output / screenshots are readable
    await context.addInitScript(() => {
      try {
        localStorage.setItem('pomeil_player_name', 'TestPlayer');
        localStorage.setItem('lang', 'en');
        localStorage.setItem('language', 'en');
        sessionStorage.setItem('pomeil_login_warning_dismissed', 'true');
      } catch {}
    });
    const page = await context.newPage();

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const t = msg.text();
        if (!t.includes('audio') && !t.includes('Audio') && !t.includes('play()') &&
            !t.includes('NotAllowed') && !t.includes('favicon') && !t.includes('ERR_FILE_NOT_FOUND') &&
            !t.includes('.wav') && !t.includes('.mp3'))
          consoleErrors.push(t);
      }
    });
    page.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message}`));

    const deadline = Date.now() + TIMEOUT_PER_ROOM;

    try {
      console.log(`\n${'═'.repeat(60)}`);
      console.log(`  ROOM: ${roomId}`);
      console.log('═'.repeat(60));

      // Navigate
      await page.goto(`${BASE}/escape-rooms/${roomId}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(2000);

      // Verify Angular debug tools available
      const ngOk = await page.evaluate(() => typeof window.ng?.getComponent === 'function');
      if (!ngOk) {
        throw new Error('window.ng not available — is ng serve running in dev mode?');
      }

      // Verify component found
      const compOk = await getState(page);
      if (!compOk) {
        throw new Error('Escape room component not found in DOM');
      }

      console.log(`  Initial state: ${compOk.stateName} (${compOk.state})`);

      // Close intro popup
      await closeIntro(page);
      await page.waitForTimeout(500);

      // Dismiss self-talk dialogue
      await dismissAll(page);

      console.log(`  After intro: ${(await getState(page))?.stateName}`);
      console.log(`  Running ${config.steps.length} steps...`);

      // Run steps with timeout
      const completed = await Promise.race([
        runSteps(page, roomId, config.steps),
        new Promise((_, reject) => setTimeout(
          () => reject(new Error('TIMEOUT: room took too long')),
          Math.max(1000, deadline - Date.now())
        )),
      ]);

      const finalState = await getState(page);

      // Rooms without skip methods get a pass for loading successfully
      const noSkipRooms = [];
      const isNoSkip = noSkipRooms.includes(roomId);

      if (completed) {
        totalPassed++;
        results[roomId] = { passed: true };
        console.log(`\n  ✓ PASSED — Game completed successfully`);
      } else if (isNoSkip) {
        totalSkipped++;
        results[roomId] = { passed: null, reason: 'no skip methods' };
        console.log(`\n  ⊘ SKIPPED — No skip methods (loaded OK, state: ${finalState?.stateName})`);
      } else {
        totalFailed++;
        results[roomId] = {
          passed: false,
          finalState: `${finalState?.stateName}(${finalState?.state})`,
          view: finalState?.view,
          doorOpen: finalState?.doorOpen,
          gameComplete: finalState?.gameComplete,
        };
        console.log(`\n  ✗ FAILED — Not complete`);
        console.log(`    State: ${finalState?.stateName} (${finalState?.state})`);
        console.log(`    View: ${finalState?.view}, Door: ${finalState?.doorOpen}`);
        await page.screenshot({ path: `/tmp/e2e-fail-${roomId}.png` });
        console.log(`    Screenshot: /tmp/e2e-fail-${roomId}.png`);
      }

      if (consoleErrors.length) {
        console.log(`  ⚠ Console errors: ${consoleErrors.length}`);
        consoleErrors.slice(0, 3).forEach(e => console.log(`    ${e.substring(0, 120)}`));
      }

    } catch (err) {
      totalFailed++;
      results[roomId] = { passed: false, error: err.message };
      console.log(`\n  ✗ ERROR: ${err.message}`);
      try { await page.screenshot({ path: `/tmp/e2e-error-${roomId}.png` }); } catch {}
    }

    await context.close();
  }

  // ─── SUMMARY ────────────────────────────────────────────

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  RESULTS: ${totalPassed} passed, ${totalFailed} failed, ${totalSkipped} skipped`);
  console.log(`  out of ${Object.keys(roomsToTest).length} rooms`);
  console.log('═'.repeat(60));

  const maxLen = Math.max(...Object.keys(results).map(k => k.length));
  for (const [roomId, result] of Object.entries(results)) {
    const icon = result.passed === true ? '✓' : result.passed === null ? '⊘' : '✗';
    const detail = result.error
      ? `ERROR: ${result.error}`
      : result.passed === null
        ? result.reason
        : result.passed
          ? ''
          : `state=${result.finalState} view=${result.view} door=${result.doorOpen}`;
    console.log(`  ${icon} ${roomId.padEnd(maxLen)}  ${detail}`);
  }

  if (totalFailed > 0) {
    console.log(`\nFailed room screenshots saved to /tmp/e2e-fail-*.png and /tmp/e2e-error-*.png`);
  }

  process.exit(totalFailed > 0 ? 1 : 0);

} catch (err) {
  console.error(`\nFatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
} finally {
  if (browser) await browser.close();
}
