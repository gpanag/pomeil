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

  // ============================================
  // DESKTOP TESTS (1440px wide)
  // ============================================
  console.log('\n=== DESKTOP (1440x900) ===');
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await desktop.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      const t = msg.text();
      if (!t.includes('audio') && !t.includes('Audio') && !t.includes('play()') && !t.includes('NotAllowed') && !t.includes('favicon') && !t.includes('net::') && !t.includes('404') && !t.includes('Failed to load resource'))
        consoleErrors.push(t);
    }
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE_ERROR: ${err.message}`));

  // ---- TEST 1: "Learning" removed from main toolbar ----
  console.log('\n--- TEST 1: Learning removed from main toolbar ---');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const menuHtml = await page.locator('.menu-whole').first().innerHTML();
  ok('No "learning" link in main toolbar', !menuHtml.includes('routerLink="learning"') && !menuHtml.includes('routerlink="learning"'));

  // ---- TEST 2: /learning loads with sidenav visible ----
  console.log('\n--- TEST 2: /learning — sidenav visible on desktop ---');
  await page.goto(`${BASE}/learning`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  ok('URL is /learning', page.url().includes('/learning'));

  const sidenavContainer = page.locator('mat-sidenav-container');
  ok('mat-sidenav-container exists', (await sidenavContainer.count()) > 0);

  const sidenav = page.locator('mat-sidenav');
  ok('mat-sidenav exists', (await sidenav.count()) > 0);

  const sidenavVisible = await sidenav.first().isVisible();
  ok('Sidenav is visible on desktop', sidenavVisible);

  // ---- TEST 3: Sidenav has correct header ----
  console.log('\n--- TEST 3: Sidenav header ---');
  const headerIcon = page.locator('.sidenav-header mat-icon');
  ok('Header icon exists', (await headerIcon.count()) > 0);
  const headerIconText = await headerIcon.first().textContent();
  ok('Header icon is "school"', headerIconText.trim() === 'school');

  const headerTitle = page.locator('.sidenav-header .header-title');
  ok('Header title exists', (await headerTitle.count()) > 0);
  const headerTitleText = await headerTitle.first().textContent();
  ok('Header title is "Learning"', headerTitleText.trim() === 'Learning');

  // ---- TEST 4: Sidenav has 5 nav items ----
  console.log('\n--- TEST 4: Sidenav nav items ---');
  const navItems = page.locator('mat-nav-list a[mat-list-item]');
  const navCount = await navItems.count();
  ok('5 nav items in sidenav', navCount === 5);

  // Check each nav item label
  const expectedLabels = ['Learning', 'Learning Flow', 'Dashboard', 'Modules', 'Self-Assessment'];
  const expectedIcons = ['school', 'play_circle', 'dashboard', 'menu_book', 'quiz'];
  for (let i = 0; i < navCount; i++) {
    const text = await navItems.nth(i).textContent();
    const icon = await navItems.nth(i).locator('mat-icon').textContent();
    ok(`Nav item ${i + 1} label contains "${expectedLabels[i]}"`, text.includes(expectedLabels[i]));
    ok(`Nav item ${i + 1} icon is "${expectedIcons[i]}"`, icon.trim() === expectedIcons[i]);
  }

  // ---- TEST 5: "Overview" is active on /learning ----
  console.log('\n--- TEST 5: Active link highlighting ---');
  const activeLinks = page.locator('mat-nav-list a.active-link');
  const activeLinkCount = await activeLinks.count();
  ok('One active link on /learning', activeLinkCount >= 1);
  if (activeLinkCount >= 1) {
    const activeText = await activeLinks.first().textContent();
    ok('Active link is "Learning" (Overview)', activeText.includes('Learning'));
  }

  // ---- TEST 6: Click each sidenav link — correct page loads ----
  console.log('\n--- TEST 6: Navigation via sidenav links ---');
  const routes = [
    { index: 1, path: '/learning/flow', label: 'Learning Flow' },
    { index: 2, path: '/learning/dashboard', label: 'Dashboard' },
    { index: 3, path: '/learning/modules', label: 'Study Modules' },
    { index: 4, path: '/learning/questionnaire', label: 'Self-Assessment' },
    { index: 0, path: '/learning', label: 'Overview' },
  ];

  for (const route of routes) {
    await navItems.nth(route.index).click();
    await page.waitForTimeout(1500);
    ok(`Click "${route.label}" → URL contains "${route.path}"`, page.url().includes(route.path));
    // Verify sidenav is still visible after navigation
    ok(`Sidenav still visible after navigating to ${route.label}`, await sidenav.first().isVisible());
    // Verify the clicked item has active class
    const itemClass = await navItems.nth(route.index).getAttribute('class');
    ok(`"${route.label}" has active-link class`, itemClass.includes('active-link'));
  }

  // ---- TEST 7: No mobile hamburger on desktop ----
  console.log('\n--- TEST 7: No mobile header on desktop ---');
  const mobileHeader = page.locator('.mobile-header');
  const mobileHeaderCount = await mobileHeader.count();
  const mobileVisible = mobileHeaderCount > 0 ? await mobileHeader.first().isVisible() : false;
  ok('Mobile header hidden on desktop', !mobileVisible);

  // ---- TEST 8: Content renders inside sidenav-content ----
  console.log('\n--- TEST 8: Content renders inside layout ---');
  await page.goto(`${BASE}/learning`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const contentArea = page.locator('mat-sidenav-content .content-area');
  ok('Content area exists', (await contentArea.count()) > 0);
  const heroSection = page.locator('.hero-section');
  const hasHero = (await heroSection.count()) > 0;
  ok('Learning intro content rendered inside layout', hasHero);

  await page.goto(`${BASE}/learning/modules`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const moduleCards = page.locator('.module-card');
  ok('Modules page renders inside sidenav layout', (await moduleCards.count()) === 6);
  ok('Sidenav still present on modules page', await sidenav.first().isVisible());

  // ---- TEST 9: Direct URL navigation with active highlight ----
  console.log('\n--- TEST 9: Direct URL nav + active highlight ---');
  await page.goto(`${BASE}/learning/questionnaire`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  ok('Sidenav visible on direct /learning/questionnaire', await sidenav.first().isVisible());
  const qActiveClass = await navItems.nth(4).getAttribute('class');
  ok('Self-Assessment has active-link on /learning/questionnaire', qActiveClass.includes('active-link'));

  await page.goto(`${BASE}/learning/dashboard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  ok('Sidenav visible on direct /learning/dashboard', await sidenav.first().isVisible());
  const dActiveClass = await navItems.nth(2).getAttribute('class');
  ok('Dashboard has active-link on /learning/dashboard', dActiveClass.includes('active-link'));

  // ---- TEST 10: Escape rooms do NOT have sidenav ----
  console.log('\n--- TEST 10: Escape rooms page has no sidenav ---');
  await page.goto(`${BASE}/escape-rooms`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const sidenavOnEscapeRooms = page.locator('mat-sidenav');
  const sidenavCountOnER = await sidenavOnEscapeRooms.count();
  // If mat-sidenav exists, check it's not visible (or count is 0)
  const sidenavVisibleOnER = sidenavCountOnER > 0 ? await sidenavOnEscapeRooms.first().isVisible() : false;
  ok('No sidenav on /escape-rooms', !sidenavVisibleOnER);

  // ---- TEST 11: Home page has no sidenav ----
  console.log('\n--- TEST 11: Home page has no sidenav ---');
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
  const sidenavOnHome = page.locator('.learning-sidenav-container');
  const sidenavHomeCount = await sidenavOnHome.count();
  ok('No learning sidenav on home page', sidenavHomeCount === 0);

  await desktop.close();

  // ============================================
  // MOBILE TESTS (375px wide)
  // ============================================
  console.log('\n=== MOBILE (375x812) ===');
  const mobile = await browser.newContext({ viewport: { width: 375, height: 812 } });
  const mobilePage = await mobile.newPage();

  // ---- TEST 12: Sidenav hidden on mobile by default ----
  console.log('\n--- TEST 12: Sidenav hidden on mobile ---');
  await mobilePage.goto(`${BASE}/learning`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(1500);

  const mobileSidenav = mobilePage.locator('mat-sidenav');
  // On mobile, the sidenav should exist but not be visible (mode="over", opened=false)
  const mobileSidenavVisible = (await mobileSidenav.count()) > 0 ? await mobileSidenav.first().isVisible() : false;
  ok('Sidenav hidden on mobile', !mobileSidenavVisible);

  // ---- TEST 13: Mobile hamburger button visible ----
  console.log('\n--- TEST 13: Mobile hamburger button ---');
  const mobileHdr = mobilePage.locator('.mobile-header');
  const mobileHdrVisible = (await mobileHdr.count()) > 0 ? await mobileHdr.first().isVisible() : false;
  ok('Mobile header bar visible', mobileHdrVisible);

  const hamburger = mobilePage.locator('.mobile-header button');
  const hamburgerVisible = (await hamburger.count()) > 0 ? await hamburger.first().isVisible() : false;
  ok('Hamburger button visible', hamburgerVisible);

  // ---- TEST 14: Toggle sidenav on mobile ----
  console.log('\n--- TEST 14: Toggle sidenav on mobile ---');
  if (hamburgerVisible) {
    await hamburger.first().click();
    await mobilePage.waitForTimeout(1000);
    const openedSidenav = await mobileSidenav.first().isVisible();
    ok('Sidenav opens on hamburger click', openedSidenav);

    // Check 5 nav items are there
    const mobileNavItems = mobilePage.locator('mat-nav-list a[mat-list-item]');
    const mobileNavCount = await mobileNavItems.count();
    ok('5 nav items in mobile sidenav', mobileNavCount === 5);

    // Click a nav item — sidenav should close
    await mobileNavItems.nth(1).click();
    await mobilePage.waitForTimeout(1500);
    ok('Navigated to /learning/flow on mobile', mobilePage.url().includes('/learning/flow'));
    const closedAfterNav = !(await mobileSidenav.first().isVisible());
    ok('Sidenav auto-closes after navigation on mobile', closedAfterNav);
  } else {
    ok('(skipped — hamburger not found)', false);
    ok('(skipped)', false);
    ok('(skipped)', false);
    ok('(skipped)', false);
  }

  // ---- TEST 15: Mobile — reopen and navigate to another page ----
  console.log('\n--- TEST 15: Mobile sidenav reopen + navigate ---');
  if (hamburgerVisible) {
    await hamburger.first().click();
    await mobilePage.waitForTimeout(1000);
    const mobileNavItems = mobilePage.locator('mat-nav-list a[mat-list-item]');
    await mobileNavItems.nth(3).click(); // Modules
    await mobilePage.waitForTimeout(1500);
    ok('Navigated to /learning/modules on mobile', mobilePage.url().includes('/learning/modules'));
    ok('Sidenav closed after nav on mobile', !(await mobileSidenav.first().isVisible()));
  } else {
    ok('(skipped)', false);
    ok('(skipped)', false);
  }

  await mobile.close();

  // ============================================
  // TABLET TESTS (768px wide)
  // ============================================
  console.log('\n=== TABLET (768x1024) ===');
  const tablet = await browser.newContext({ viewport: { width: 768, height: 1024 } });
  const tabletPage = await tablet.newPage();

  console.log('\n--- TEST 16: Tablet layout (768px < 960px breakpoint) ---');
  await tabletPage.goto(`${BASE}/learning`, { waitUntil: 'networkidle' });
  await tabletPage.waitForTimeout(1500);

  const tabletSidenav = tabletPage.locator('mat-sidenav');
  const tabletSidenavVisible = (await tabletSidenav.count()) > 0 ? await tabletSidenav.first().isVisible() : false;
  ok('Sidenav hidden on tablet (768px)', !tabletSidenavVisible);

  const tabletHamburger = tabletPage.locator('.mobile-header button');
  const tabletHamburgerVisible = (await tabletHamburger.count()) > 0 ? await tabletHamburger.first().isVisible() : false;
  ok('Hamburger button visible on tablet', tabletHamburgerVisible);

  await tablet.close();

  // ============================================
  // CONSOLE ERRORS
  // ============================================
  console.log('\n--- Console errors ---');
  ok(`No critical console errors (${consoleErrors.length} found)`, consoleErrors.length === 0);
  if (consoleErrors.length > 0) consoleErrors.forEach(e => console.log(`    ERROR: ${e}`));

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
