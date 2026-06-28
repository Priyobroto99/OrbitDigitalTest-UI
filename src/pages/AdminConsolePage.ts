import { Page, Locator, Download, expect } from '@playwright/test';
import { BasePage } from './BasePage';

type AdminTab =
  | 'Overview'
  | 'Orders'
  | 'Place orders'
  | 'Dealers & Studios'
  | 'Pricing Table'
  | 'Invoices'
  | 'CMS Portal'
  | 'AI Gallery';

/**
 * Admin console (`/admin`) — the tabbed ADMIN dashboard.
 * Drives the full manual-order → record-payment → invoice money path exercised
 * by the post-deploy sanity checks, plus the Orders / Invoices / AI Gallery
 * panels. The older dealer-creation + pricing flows stay in AdminPage.ts.
 */
export class AdminConsolePage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async open() {
    await this.navigate('/admin');
    await this.page.waitForLoadState('networkidle');
  }

  tab(name: AdminTab): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async openTab(name: AdminTab) {
    await this.tab(name).click();
    await this.page.waitForLoadState('networkidle');
  }

  // --- Place orders (manual order on a partner's behalf) ------------------

  /** Toggle the partner type in the Place Manual Order panel. */
  async selectPartnerType(type: 'Studio' | 'Dealer') {
    await this.page.getByRole('button', { name: type, exact: true }).click();
  }

  /** Pick a partner from the "Active <role>" dropdown by its username. */
  async selectPartner(username: string) {
    const select = this.page.locator('select').first();
    await expect(select).toBeEnabled();
    const option = select.locator('option', { hasText: `(${username})` });
    await expect(option, `partner "${username}" present in dropdown`).toHaveCount(1);
    const value = await option.getAttribute('value');
    await select.selectOption(value!);
  }

  /** Size rows in the ordering tables (each has a quantity stepper). */
  private orderingRows(): Locator {
    return this.page.locator('div.group').filter({ has: this.page.locator('svg.lucide-plus') });
  }

  /**
   * Add `qtyEach` units to the first `count` size rows and return the size
   * labels added, so the caller can later assert them in the invoice PDF.
   */
  async addItems(count: number, qtyEach = 2): Promise<string[]> {
    const rows = this.orderingRows();
    await expect(rows.first()).toBeVisible();
    const sizes: string[] = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      const size = (await row.locator('h5').first().innerText()).trim();
      sizes.push(size);
      const plus = row.locator('button:has(svg.lucide-plus)').last();
      for (let q = 0; q < qtyEach; q++) await plus.click();
    }
    return sizes;
  }

  async setCustomerName(name: string) {
    await this.page.locator('input[placeholder="Mandatory"]').fill(name);
  }

  async placeOrder() {
    await this.page.getByRole('button', { name: /Confirm & Place Order/i }).click();
    // On success AdminPage auto-switches to the Orders tab.
    await expect(this.page.getByText('Order placed successfully!')).toBeVisible();
  }

  /**
   * Full manual-order helper: select partner, add items, place the order.
   * Returns { customerName, sizes } for downstream verification.
   */
  async placeManualOrder(opts: { partnerType: 'Studio' | 'Dealer'; partnerUsername: string; customerName: string; items?: number }) {
    await this.openTab('Place orders');
    await this.selectPartnerType(opts.partnerType);
    await this.selectPartner(opts.partnerUsername);
    // fetchOrderingPricing() (triggered by the selectedPartner useEffect) auto-fills the
    // customer name with the partner's name as its last step. Wait for that DOM signal
    // instead of networkidle — the useEffect schedules after React re-renders, so
    // networkidle can resolve before the API calls even start.
    await expect(this.page.locator('input[placeholder="Mandatory"]')).not.toHaveValue('', { timeout: 15000 });
    const sizes = await this.addItems(opts.items ?? 2);
    await this.setCustomerName(opts.customerName);
    await this.placeOrder();
    return { customerName: opts.customerName, sizes };
  }

  // --- Orders panel ------------------------------------------------------

  section(heading: string): Locator {
    return this.page.locator('section').filter({ hasText: heading });
  }

  /** A row in the Orders table for the given order id (#ORD-0001 style). */
  orderRow(orderId: number): Locator {
    return this.page.locator('tr', { hasText: `#ORD-${String(orderId).padStart(4, '0')}` });
  }

  /** A row anywhere matching a customer name. */
  orderRowByName(name: string): Locator {
    return this.page.locator('tr', { hasText: name });
  }

  statusBadges(): Locator {
    return this.page.locator('span', { hasText: /PENDING|CONFIRMED|PAID|INVOICED|CANCELLED/ });
  }

  // --- Invoices panel ----------------------------------------------------

  /** Open the Record Payment modal for a confirmed order and confirm full payment. */
  async recordPaymentFor(customerName: string) {
    const row = this.section('Confirmed Orders').locator('tr', { hasText: customerName });
    await expect(row, `confirmed order for "${customerName}"`).toBeVisible();
    await row.locator('button[title="Record Payment"]').click();
    // Modal pre-fills the outstanding amount; just confirm.
    await this.page.getByRole('button', { name: /Confirm Payment/i }).click();
    await expect(this.page.getByText('Payment recorded successfully!')).toBeVisible();
  }

  /** Click Generate Invoice for a paid order and return the triggered download. */
  async generateInvoiceFor(customerName: string): Promise<Download> {
    const row = this.section('Paid Orders').locator('tr', { hasText: customerName });
    await expect(row, `paid order for "${customerName}"`).toBeVisible();
    const downloadPromise = this.page.waitForEvent('download');
    await row.getByRole('button', { name: /Generate Invoice/i }).click();
    return downloadPromise;
  }

  invoicedRow(customerName: string): Locator {
    return this.section('Invoiced Orders').locator('tr', { hasText: customerName });
  }

  generateInvoiceButton(): Locator {
    return this.page.getByRole('button', { name: /Generate Invoice/i }).first();
  }
  downloadAgainButton(): Locator {
    return this.page.getByRole('button', { name: /Download Again/i }).first();
  }
  recordPaymentButton(): Locator {
    return this.page.getByRole('button', { name: /Record Payment/i }).first();
  }
}
