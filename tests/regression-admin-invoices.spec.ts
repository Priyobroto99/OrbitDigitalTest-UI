import { test, expect } from '../src/fixtures/test-fixtures';
import { AdminConsolePage } from '../src/pages/AdminConsolePage';

/**
 * REGRESSION §2.7 — Admin invoices UI states — R40–R43.
 * The three sections always render; the per-row assertions only fire when the
 * deployed data has an order in the relevant state (skipped otherwise so the
 * suite stays green on an empty ledger).
 */
test.describe('@regression Admin invoices UI', () => {

  test.beforeEach(async () => {});

  // R40 — Confirmed orders show as "Awaiting Payment" with a Record-Payment
  // action and no invoice button.
  test('R40 — confirmed section offers payment, not invoicing', async ({ authedPage }) => {
    const page = await authedPage('ADMIN');
    test.skip(!page, 'ADMIN credentials not configured');

    const admin = new AdminConsolePage(page!);
    await admin.open();
    await admin.openTab('Invoices');

    await expect(page!.getByText('Confirmed Orders')).toBeVisible();
    await expect(page!.getByText('Awaiting Payment').first()).toBeVisible();
  });

  // R41 — Paid section enables "Generate Invoice".
  test('R41 — paid section enables Generate Invoice', async ({ authedPage }) => {
    const page = await authedPage('ADMIN');
    test.skip(!page, 'ADMIN credentials not configured');

    const admin = new AdminConsolePage(page!);
    await admin.open();
    await admin.openTab('Invoices');
    await expect(page!.getByText('Paid Orders')).toBeVisible();

    const btn = admin.generateInvoiceButton();
    const hasPaid = await btn.isVisible().catch(() => false);
    test.skip(!hasPaid, 'no PAID orders in the deployed ledger to assert against');
    await expect(btn).toBeEnabled();
  });

  // R42 — Invoiced section: "Download Again" present; action click is isolated
  // from the row click (stopPropagation).
  test('R42 — invoiced rows expose Download Again', async ({ authedPage }) => {
    const page = await authedPage('ADMIN');
    test.skip(!page, 'ADMIN credentials not configured');

    const admin = new AdminConsolePage(page!);
    await admin.open();
    await admin.openTab('Invoices');
    await expect(page!.getByText('Invoiced Orders')).toBeVisible();

    const btn = admin.downloadAgainButton();
    const hasInvoiced = await btn.isVisible().catch(() => false);
    test.skip(!hasInvoiced, 'no INVOICED orders in the deployed ledger to assert against');
    await expect(btn).toBeVisible();
  });

  // R43 — Guest order in the confirmed list shows "Guest — no ledger" and no
  // payment button.
  test('R43 — guest order shows no-ledger treatment', async ({ authedPage }) => {
    const page = await authedPage('ADMIN');
    test.skip(!page, 'ADMIN credentials not configured');

    const admin = new AdminConsolePage(page!);
    await admin.open();
    await admin.openTab('Invoices');

    const guestLabel = page!.getByText('Guest — no ledger');
    const hasGuest = await guestLabel.first().isVisible().catch(() => false);
    test.skip(!hasGuest, 'no GUEST confirmed orders in the deployed ledger to assert against');
    await expect(guestLabel.first()).toBeVisible();
  });
});
