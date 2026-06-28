import { test, expect } from '../src/fixtures/test-fixtures';
import { StudioDashboardPage } from '../src/pages/StudioDashboardPage';

/**
 * REGRESSION §2.6 — Studio dashboard (tabbed UI) — R35–R39.
 */
test.describe('@regression Studio dashboard', () => {

  // R35 — Tab switching renders each panel without remount errors.
  test('R35 — all four tabs render', async ({ authedPage }) => {
    const page = await authedPage('STUDIO');
    test.skip(!page, 'STUDIO credentials not configured');

    const errors: string[] = [];
    page!.on('pageerror', e => errors.push(e.message));

    const studio = new StudioDashboardPage(page!);
    await studio.open();

    await studio.openTab('Analytics');
    await expect(page!.getByText('Total Orders')).toBeVisible();

    await studio.openTab('Lab Orders');
    await expect(page!.getByRole('heading', { name: /Place Lab Order/i })).toBeVisible();

    await studio.openTab('Customer Orders');
    await expect(page!.getByRole('heading', { name: 'Customer Orders' })).toBeVisible();

    await studio.openTab('AI Studio');
    await expect(page!.getByRole('button', { name: /Open Gallery/i }).first()).toBeVisible();

    expect(errors, `page errors: ${errors.join(' | ')}`).toHaveLength(0);
  });

  // R36 — Lab Orders history uses studio-friendly status labels.
  test('R36 — lab order history renders with studio labels', async ({ authedPage }) => {
    const page = await authedPage('STUDIO');
    test.skip(!page, 'STUDIO credentials not configured');

    const studio = new StudioDashboardPage(page!);
    await studio.open();
    await studio.openTab('Lab Orders');

    await expect(page!.getByRole('heading', { name: /Order History/i })).toBeVisible();
    // Friendly labels (CONFIRMED→In Progress, PAID→Completed, INVOICED→Received)
    // must never surface the raw enum.
    const raw = page!.locator('table', { hasText: 'Order History' }).getByText(/^(CONFIRMED|PAID|INVOICED)$/);
    await expect(raw).toHaveCount(0);
  });

  // R37 — Analytics stat cards render and reflect order data.
  test('R37 — analytics totals render', async ({ authedPage }) => {
    const page = await authedPage('STUDIO');
    test.skip(!page, 'STUDIO credentials not configured');

    const studio = new StudioDashboardPage(page!);
    await studio.open();
    await studio.openTab('Analytics');
    await expect(page!.getByText('Total Orders')).toBeVisible();
  });

  // R38 — AI Studio hero navigates to the gallery.
  test('R38 — AI Studio tab navigates to the gallery', async ({ authedPage }) => {
    const page = await authedPage('STUDIO');
    test.skip(!page, 'STUDIO credentials not configured');

    const studio = new StudioDashboardPage(page!);
    await studio.open();
    await studio.openTab('AI Studio');
    await page!.getByRole('button', { name: /Open Gallery/i }).first().click();
    await expect(page!).toHaveURL(/\/products\/aistudio\/aigallery/);
  });

  // R39 — Legacy redirect: /products/studioai → /products/aistudio (public).
  test('R39 — legacy /products/studioai redirects', async ({ page }) => {
    await page.goto('/products/studioai');
    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/products\/aistudio$/);
  });
});
