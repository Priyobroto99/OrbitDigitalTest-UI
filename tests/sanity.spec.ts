import { test, expect } from '../src/fixtures/test-fixtures';
import { creds } from '../src/utils/session';
import { StudioDashboardPage } from '../src/pages/StudioDashboardPage';
import { AdminConsolePage } from '../src/pages/AdminConsolePage';
import { GalleryViewerPage } from '../src/pages/GalleryViewerPage';
import { extractPdfText } from '../src/utils/pdf';
import os from 'os';
import path from 'path';

/**
 * SANITY SUITE (@sanity) — blocking post-deploy gate.
 * "Is the deployment alive and are the money/critical paths working?"
 * Keep it fast and deterministic. See POST_DEPLOYMENT_TEST_PLAN.md §1.
 */
test.describe('@sanity Post-Deployment Sanity', () => {

  // S1 — Gateway & services up.
  // Only the user- and product-services expose a gateway-reachable health route
  // (`/api/<svc>/health`). order-service health sits at `/api/health` and the
  // gallery-service has none, so they are exercised indirectly by later cases
  // rather than asserted here. This still proves the nginx gateway + core
  // services are alive.
  test('S1 — Users & Products backend services healthy', async ({ api }) => {
    for (const svc of ['users', 'products']) {
      const res = await api.get(`/api/${svc}/health`);
      expect(res.status(), `${svc} health status`).toBe(200);
      const body = await res.json();
      expect(body.status).toBe('healthy');
    }
  });

  // S2 — SPA loads, logo is visible.
  test('S2 — App Orbit Digital is live and running', async ({ page, homePage }) => {
    await homePage.launchApp();
    await expect(page.getByRole('img', { name: 'Orbit Digital' }).first()).toBeVisible();
  });

  // S3 — Admin login via the real form with stability wait.
  test('S3 — Admin can log in and remain stable', async ({ homePage, loginPage, page }) => {
    const c = creds('ADMIN');
    test.skip(!c, 'ADMIN credentials not configured');

    await homePage.launchApp();
    await homePage.clickSignIn();
    await loginPage.login(c!.username, c!.password);

    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();

    // Protected admin route is reachable.
    await page.goto('/admin');
    await expect(page).toHaveURL(/.*admin/);

    // Stability verification check
    await page.waitForTimeout(10000);
  });

  // S4 — Studio login lands on the 4-tab dashboard with stability wait.
  test('S4 — Studio dashboard loads and remains stable', async ({ authedPage }) => {
    const page = await authedPage('STUDIO');
    test.skip(!page, 'STUDIO credentials not configured');

    const studio = new StudioDashboardPage(page!);
    await studio.open();
    await expect(studio.header).toBeVisible();
    for (const tab of ['Analytics', 'Lab Orders', 'Customer Orders', 'AI Studio'] as const) {
      await expect(studio.tab(tab)).toBeVisible();
    }

    // Stability verification check
    await page.waitForTimeout(10000);
  });

  // S5 — Dealer login via the real form with stability wait.
  test('S5 — Dealer can log in and remain stable', async ({ homePage, loginPage, page }) => {
    const c = creds('DEALER');
    test.skip(!c, 'DEALER credentials not configured');

    await homePage.launchApp();
    await homePage.clickSignIn();
    await loginPage.login(c!.username, c!.password);

    await page.waitForLoadState('networkidle');
    await expect(page).not.toHaveURL(/.*login/);
    await expect(page.locator('button:has-text("Logout")')).toBeVisible();

    // Protected dealer route is reachable.
    await page.goto('/dealer');
    await expect(page).toHaveURL(/.*dealer/);

    // Stability verification check
    await page.waitForTimeout(10000);
  });

  // S6 — Unauthenticated guard. The ProtectedRoute redirects to /login for all restricted paths.
  test('S6 — Unauthenticated routes are guarded', async ({ page }) => {
    for (const route of ['/studio', '/admin', '/dealer']) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page, `Route ${route} should redirect to login`).toHaveURL(/.*login/);
    }
  });

  // S7 — Admin console dashboard tabs render, load content on click, and remain stable.
  test('S7 — Admin console tabs load and remain stable', async ({ authedPage }) => {
    const page = await authedPage('ADMIN');
    test.skip(!page, 'ADMIN credentials not configured');

    const admin = new AdminConsolePage(page!);
    await admin.open();

    // Map each tab to a static element (e.g. section headings) that confirms content loaded successfully without relying on dynamic cards.
    const tabsAndChecks = [
      { name: 'Overview', element: page.getByText('Total Dealers') },
      { name: 'Orders', element: page.getByRole('heading', { name: 'Order Inventory' }) },
      { name: 'Place orders', element: page.getByRole('heading', { name: 'Place Manual Order' }) },
      { name: 'Dealers & Studios', element: page.getByRole('heading', { name: 'Partners & Users' }) },
      { name: 'Pricing Table', element: page.getByText('1. Select Account Type') },
      { name: 'Invoices', element: page.getByRole('heading', { name: 'Confirmed Orders' }) },
      { name: 'CMS Portal', element: page.getByRole('button', { name: 'Banners' }).first() },
      { name: 'AI Gallery', element: page.getByRole('heading', { name: 'Gallery Events' }) }
    ] as const;

    for (const tab of tabsAndChecks) {
      await admin.openTab(tab.name);
      await expect(tab.element).toBeVisible();
    }

    // Stability verification check
    await page.waitForTimeout(10000);
  });

  /**
   * Admin money-path: place a manual order for a partner, record payment,
   * generate the invoice, and follow the order across the Confirmed → Paid →
   * Invoiced sections — verifying the downloaded PDF contains the ordered items.
   * Shared by S8 (Studio partner) and S9 (Dealer partner).
   */
  async function adminMoneyPath(
    authedPage: (role: 'ADMIN') => Promise<import('@playwright/test').Page | null>,
    partnerType: 'Studio' | 'Dealer',
    partnerUsername: string | undefined,
  ) {
    const page = await authedPage('ADMIN');
    test.skip(!page, 'ADMIN credentials not configured');
    test.skip(!partnerUsername, `${partnerType} partner username not configured`);

    const admin = new AdminConsolePage(page!);
    const customer = `PW-${partnerType}-${Date.now()}`;
    await admin.open();

    // Place a multi-item manual order on the partner's behalf (starts CONFIRMED).
    const { sizes } = await admin.placeManualOrder({
      partnerType,
      partnerUsername: partnerUsername!,
      customerName: customer,
      items: 2,
    });

    // Order is visible in the Orders tab.
    await admin.openTab('Orders');
    await expect(admin.orderRowByName(customer)).toBeVisible();

    // Invoices → Confirmed section: record payment → moves to Paid.
    await admin.openTab('Invoices');
    await expect(admin.section('Confirmed Orders').locator('tr', { hasText: customer })).toBeVisible();
    await admin.recordPaymentFor(customer);
    await expect(admin.section('Paid Orders').locator('tr', { hasText: customer })).toBeVisible();

    // Generate invoice: capture the download, verify toast + items, then INVOICED.
    const download = await admin.generateInvoiceFor(customer);
    await expect(page!.getByText('Invoice Ready')).toBeVisible();

    const pdfPath = path.join(os.tmpdir(), `pw-invoice-${Date.now()}.pdf`);
    await download.saveAs(pdfPath);
    expect(download.suggestedFilename()).toMatch(/Orbit_Invoice_\d+\.pdf/);

    const text = await extractPdfText(pdfPath);
    for (const size of sizes) {
      expect(text.toLowerCase(), `invoice PDF should list ordered item "${size}"`).toContain(size.toLowerCase());
    }

    // Order has moved to the Invoiced section.
    await expect(admin.invoicedRow(customer)).toBeVisible();
  }

  // S8 — Admin places + invoices a STUDIO order end-to-end (money path).
  test('S8 — Admin order → payment → invoice for studio', async ({ authedPage }) => {
    const partner = process.env.STUDIO_PARTNER_USERNAME || process.env.STUDIO_USERNAME;
    await adminMoneyPath(authedPage, 'Studio', partner);
  });

  // S9 — Same money path for a DEALER partner.
  test('S9 — Admin order → payment → invoice for dealer', async ({ authedPage }) => {
    const partner = process.env.DEALER_PARTNER_USERNAME || process.env.DEALER_USERNAME;
    await adminMoneyPath(authedPage, 'Dealer', partner);
  });

  // S10 — Admin navigates Products → AI Studio → AI Event Gallery, unlocks a known event and verifies photos.
  test('S10 — Admin navigates products → AI Studio → gallery event → views photos', async ({ authedPage }) => {
    const page = await authedPage('ADMIN');
    test.skip(!page, 'ADMIN credentials not configured');

    const eventName = process.env.GALLERY_EVENT_NAME;
    const eventPw = process.env.GALLERY_EVENT_PASSWORD;
    test.skip(!eventName || !eventPw, 'GALLERY_EVENT_NAME/PASSWORD not configured');

    // 1. Start at home, click "Products" in the top nav. In the desktop layout this is a
    //    <button> with an onClick navigate handler (the <a href> variant is mobile-only).
    await page!.goto('/');
    await page!.getByRole('button', { name: 'Products' }).first().click();
    await expect(page!).toHaveURL(/\/products$/);

    // 2. On the Products landing page, click "Start Project" inside the AI Studio section.
    const aiSection = page!.locator('section').filter({ hasText: /AI Studio/i });
    await aiSection.getByRole('button', { name: /Start Project/i }).click();
    await expect(page!).toHaveURL(/\/products\/aistudio$/);

    // 3. Click the "AI Event Gallery" card CTA → navigates to the gallery index.
    await page!.getByText('View Galleries').click();
    await expect(page!).toHaveURL(/\/products\/aistudio\/aigallery$/);

    // 4. Admin sees the event grid — the guest code-search input must NOT be present.
    await page!.waitForLoadState('networkidle');
    await expect(page!.locator('input[placeholder*="A3K9X2M7"]')).toHaveCount(0);

    // 5. Known test event card is visible in the grid.
    await expect(page!.getByText(eventName!, { exact: false })).toBeVisible();

    // 6. Click the event card → arrives at the password-gate screen.
    await page!.getByText(eventName!, { exact: false }).first().click();
    await expect(page!).toHaveURL(/\/products\/aistudio\/aigallery\/\d+/);

    // 7. Enter event password and unlock the gallery.
    await page!.locator('input[placeholder="Event password"]').fill(eventPw!);
    await page!.getByRole('button', { name: /Enter Gallery/i }).click();
    await page!.waitForLoadState('networkidle');

    // 8. At least 2 photo thumbnails are visible in the masonry grid.
    const thumbs = page!.locator('img[src*="thumb"]');
    await expect(thumbs.nth(0)).toBeVisible({ timeout: 15000 });
    await expect(thumbs.nth(1)).toBeVisible({ timeout: 15000 });
  });

  // S11 — Studio user (non-admin / guest view) finds a gallery by code, unlocks it, and verifies photos.
  test('S11 — Studio user finds gallery by code, unlocks and views photos', async ({ authedPage }) => {
    const page = await authedPage('STUDIO');
    test.skip(!page, 'STUDIO credentials not configured');

    const eventCode = process.env.GALLERY_EVENT_CODE;
    const eventName = process.env.GALLERY_EVENT_NAME;
    const eventPw = process.env.GALLERY_EVENT_PASSWORD;
    test.skip(!eventCode || !eventName || !eventPw, 'GALLERY_EVENT_CODE/NAME/PASSWORD not configured');

    // 1. Navigate directly to the gallery index — Studio role gets the guest finder view.
    await page!.goto('/products/aistudio/aigallery');
    await page!.waitForLoadState('networkidle');

    // 2. Guest finder branding is visible; the admin event grid must NOT appear.
    await expect(page!.getByText('AI Studio · Gallery')).toBeVisible();
    await expect(page!.getByText('Find Your Gallery')).toBeVisible();

    // 3. Type the alphanumeric gallery code into the finder input and press Enter to search.
    const codeInput = page!.locator('input[placeholder*="A3K9X2M7"]');
    await codeInput.fill(eventCode!);
    await codeInput.press('Enter');

    // 4. The found-event card appears with the known event name.
    await expect(page!.getByText(eventName!, { exact: false })).toBeVisible({ timeout: 10000 });

    // 5. Click the event card → password gate.
    await page!.getByText(eventName!, { exact: false }).first().click();
    await expect(page!).toHaveURL(/\/products\/aistudio\/aigallery\/\d+/);

    // 6. Enter event password and unlock.
    await page!.locator('input[placeholder="Event password"]').fill(eventPw!);
    await page!.getByRole('button', { name: /Enter Gallery/i }).click();
    await page!.waitForLoadState('networkidle');

    // 7. At least 2 photo thumbnails are visible.
    const thumbs = page!.locator('img[src*="thumb"]');
    await expect(thumbs.nth(0)).toBeVisible({ timeout: 15000 });
    await expect(thumbs.nth(1)).toBeVisible({ timeout: 15000 });
  });

  // S12 — Event unlock: app-level auth is required even for gallery guests.
  // Use a Studio account (it still needs the event password to view photos).
  test('S12 — Event unlock (guest)', async ({ authedPage }) => {
    const page = await authedPage('STUDIO');
    test.skip(!page, 'STUDIO credentials not configured');

    const eventId = process.env.GALLERY_EVENT_ID;
    const eventPw = process.env.GALLERY_EVENT_PASSWORD;
    test.skip(!eventId || !eventPw, 'GALLERY_EVENT_ID/PASSWORD not configured');

    const viewer = new GalleryViewerPage(page!);
    await viewer.openEvent(eventId!);
    await viewer.unlock(eventPw!);

    // Surface a wrong-password config issue immediately rather than timing out.
    await expect(
      viewer.passwordError,
      'gallery rejected GALLERY_EVENT_PASSWORD — check it is the event password, not the event name',
    ).toHaveCount(0);

    // Gate cleared → gallery content loaded.
    await expect(viewer.passwordInput).toHaveCount(0);
  });
});
