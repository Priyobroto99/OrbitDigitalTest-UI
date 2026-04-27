import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class AdminPage extends BasePage {
    // Navigation
    private readonly hamburgerMenu: Locator;
    
    // Tabs / Sidebar Buttons
    private readonly dealersStudiosBtn: Locator;
    private readonly pricingTableBtn: Locator;
    
    // Partner Creation
    private readonly addNewUserButton: Locator;
    private readonly dealerRoleBtn: Locator;
    private readonly studioRoleBtn: Locator;
    private readonly businessNameInput: Locator;
    private readonly emailInput: Locator;
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly createPartnerButton: Locator;
    
    // Pricing Table Selects
    private readonly accountTypeSelect: Locator;
    private readonly partnerSelect: Locator;

    constructor(page: Page) {
        super(page);
        
        // Navigation
        this.hamburgerMenu = page.locator('button').first(); 
        
        // Using has-text for better matching
        this.dealersStudiosBtn = page.locator('button:has-text("Dealers & Studios")');
        this.pricingTableBtn = page.locator('button:has-text("Pricing Table")');
        
        // Creation Modal Locators
        this.addNewUserButton = page.locator('button').filter({ hasText: /Add New Dealer|New User/i });
        
        // Role buttons in modal
        this.dealerRoleBtn = page.getByRole('button', { name: 'DEALER', exact: true });
        this.studioRoleBtn = page.getByRole('button', { name: 'STUDIO', exact: true });
        
        // Inputs based on inspection placeholders
        this.businessNameInput = page.locator('input[placeholder="Elite Photo Studio"]');
        this.emailInput = page.locator('input[placeholder="contact@partner.com"]');
        this.usernameInput = page.locator('input[placeholder="unique_handle"]');
        this.passwordInput = page.locator('input[placeholder="••••••••"]');
        
        this.createPartnerButton = page.locator('button:has-text("Create Partner Account")');
        
        // Pricing selects (standard HTML selects observed in inspection)
        this.accountTypeSelect = page.locator('select').nth(0);
        this.partnerSelect = page.locator('select').nth(1);
    }

    async navigateToAdminConsole() {
        if (!await this.dealersStudiosBtn.isVisible()) {
             await this.hamburgerMenu.click();
             await this.page.waitForTimeout(500);
        }
    }

    async clickDealersStudiosTab() {
        await this.dealersStudiosBtn.click();
    }

    async clickPricingTableTab() {
        await this.pricingTableBtn.click();
    }

    async createDealer(details: { username: string, email: string }) {
        await this.addNewUserButton.waitFor({ state: 'visible' });
        await this.addNewUserButton.click();
        
        // Select Dealer role in modal
        await this.dealerRoleBtn.click();

        // Fill form using specific placeholders
        await this.businessNameInput.fill(details.username); // business name same as username
        await this.emailInput.fill(details.email);
        await this.usernameInput.fill(details.username);
        await this.passwordInput.fill(details.username); // password same as username
        
        await this.createPartnerButton.click();
    }

    async selectPricingPartner(accountType: string, partnerName: string) {
        // Use values observed in inspection
        const value = accountType.toLowerCase();
        await this.accountTypeSelect.selectOption(value);
        
        // Wait for partner list to refresh
        await this.page.waitForTimeout(2000);
        
        // Find the option value for the partner
        const option = this.partnerSelect.locator('option').filter({ hasText: partnerName });
        const val = await option.getAttribute('value');
        
        if (val) {
            await this.partnerSelect.selectOption(val);
        } else {
            throw new Error(`Partner ${partnerName} not found in dropdown options`);
        }
    }

    async deleteUser(username: string) {
        const row = this.page.locator('tr').filter({ hasText: username });
        const deleteBtn = row.locator('button.text-red-600\\/40, button:has(svg[class*="trash"]), button:has-text("Delete")').last();
        await deleteBtn.click();
    }

    async updatePrice(rowIndex: number, newValue: string) {
        const row = this.page.locator('table tr').nth(rowIndex + 1); // skip header
        const input = row.locator('input');
        await input.clear();
        await input.fill(newValue);
    }

    async updatePriceByItem(itemName: string, finish: string, newValue: string) {
        const row = this.page.locator('table tr').filter({ hasText: itemName }).filter({ hasText: finish });
        const input = row.locator('input');
        await input.clear();
        await input.fill(newValue);
    }

    async savePricing() {
        const saveBtn = this.page.locator('button').filter({ hasText: /Save/i });
        await saveBtn.click();
    }
}
