import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

type StudioTab = 'Analytics' | 'Lab Orders' | 'Customer Orders' | 'AI Studio';

/**
 * Studio Dashboard (`/studio`) — the tabbed STUDIO portal.
 * Covers the four-tab header, the Customer Orders DB-backed feature, and the
 * Lab Orders place-order flow.
 */
export class StudioDashboardPage extends BasePage {
  readonly header: Locator;
  readonly accessRestricted: Locator;

  // Customer Orders form
  readonly newOrderBtn: Locator;
  readonly custNameInput: Locator;
  readonly custPhoneInput: Locator;
  readonly confirmOrderBtn: Locator;
  readonly awaitingPaymentSection: Locator;
  readonly paidSection: Locator;

  constructor(page: Page) {
    super(page);
    this.header = page.getByRole('heading', { name: 'Studio Dashboard' });
    this.accessRestricted = page.getByText('Access Restricted');

    this.newOrderBtn = page.getByRole('button', { name: /New Order/i });
    this.custNameInput = page.locator('input[placeholder="e.g. Rahul Sharma"]');
    this.custPhoneInput = page.locator('input[placeholder="e.g. 9876543210"]');
    this.confirmOrderBtn = page.getByRole('button', { name: /Confirm Order/i });
    this.awaitingPaymentSection = page.locator('section', { hasText: 'Awaiting Payment' });
    this.paidSection = page.locator('section', { hasText: 'Paid' }).last();
  }

  async open() {
    await this.navigate('/studio');
    await this.page.waitForLoadState('networkidle');
  }

  tab(name: StudioTab): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  async openTab(name: StudioTab) {
    await this.tab(name).click();
  }

  // --- Customer Orders ---------------------------------------------------

  async openNewOrderForm() {
    await this.newOrderBtn.click();
    await this.custNameInput.waitFor({ state: 'visible' });
  }

  /** Fill the i-th order item row (0-based). Description + qty + price. */
  async fillItem(index: number, description: string, qty: number, price: number) {
    await this.page.getByRole('button', { name: /Add Item/i }).waitFor();
    // Add extra rows as needed (the form starts with one row).
    const descInputs = this.page.locator('input[placeholder="e.g. 4×6 Glossy — Wedding Album"]');
    while ((await descInputs.count()) <= index) {
      await this.page.getByRole('button', { name: /Add Item/i }).click();
    }
    const row = this.page.locator('div.flex.gap-3.items-center').nth(index);
    await row.locator('input').nth(0).fill(description);
    await row.locator('input[type="number"]').nth(0).fill(String(qty));
    await row.locator('input[type="number"]').nth(1).fill(String(price));
  }

  async submitOrder() {
    await this.confirmOrderBtn.click();
  }

  orderCard(customerName: string): Locator {
    return this.page.locator('div', { hasText: customerName }).filter({ has: this.page.getByRole('button', { name: /Mark Paid/i }) });
  }

  async markPaid(customerName: string) {
    const card = this.page.locator('.divide-y > div', { hasText: customerName });
    await card.getByRole('button', { name: /Mark Paid/i }).click();
  }
}
