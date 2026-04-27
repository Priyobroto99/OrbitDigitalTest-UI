import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class DealerPortalPage extends BasePage {
    private readonly dealerSelect: Locator;
    private readonly sizeSelect: Locator;
    private readonly finishSelect: Locator;
    private readonly addToOrderBtn: Locator;

    constructor(page: Page) {
        super(page);
        this.dealerSelect = page.locator('select').nth(0);
        this.sizeSelect = page.locator('select').nth(1);
        this.finishSelect = page.locator('select').nth(2);
        this.addToOrderBtn = page.locator('button:has(svg.lucide-plus)').first();
    }

    async selectDealer(name: string) {
        // Wait for options to load
        await this.page.waitForTimeout(1000);
        const options = await this.dealerSelect.locator('option').all();
        let targetValue = '';
        for (const opt of options) {
            const text = await opt.textContent();
            if (text?.includes(name)) {
                targetValue = await opt.getAttribute('value') || '';
                break;
            }
        }
        if (targetValue) {
            await this.dealerSelect.selectOption(targetValue);
        } else {
            throw new Error(`Dealer ${name} not found in dropdown`);
        }
    }

    async addItemToOrder(details: { size: string, finish: 'Glossy' | 'Matt' }) {
        await this.sizeSelect.selectOption({ label: details.size });
        await this.finishSelect.selectOption({ label: details.finish });
        await this.addToOrderBtn.click();
    }

    async updateQuantity(rowIndex: number, quantity: string) {
        const row = this.page.locator('tr').nth(rowIndex + 1); // skip header
        const qtyInput = row.locator('input');
        await qtyInput.fill(quantity);
    }

    async getUnitPrice(rowIndex: number): Promise<string> {
        const row = this.page.locator('tr').nth(rowIndex + 1);
        // Unit price is in the second cell
        return await row.locator('td').nth(1).innerText();
    }
}
