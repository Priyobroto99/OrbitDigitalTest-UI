import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class SignUpPage extends BasePage {
    private readonly fullNameInput: Locator;
    private readonly phoneInput: Locator;
    private readonly emailInput: Locator;
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly createAccountButton: Locator;
    
    // Role buttons
    private readonly guestRoleButton: Locator;
    private readonly dealerRoleButton: Locator;
    private readonly studioRoleButton: Locator;

    constructor(page: Page) {
        super(page);
        this.fullNameInput = page.locator('input[name="fullName"]');
        this.phoneInput = page.locator('input[name="phoneNumber"]');
        this.emailInput = page.locator('input[name="email"]');
        this.usernameInput = page.locator('input[name="username"]');
        this.passwordInput = page.locator('input[name="password"]');
        
        // Using more specific selectors for the "Create Account" button
        this.createAccountButton = page.locator('button[type="submit"]:has-text("Create Account")');
        
        // Role selectors
        this.guestRoleButton = page.locator('button:has-text("Guest")');
        this.dealerRoleButton = page.locator('button:has-text("Dealer")');
        this.studioRoleButton = page.locator('button:has-text("Studio")');
    }

    async selectRole(role: 'Guest' | 'Dealer' | 'Studio') {
        if (role === 'Guest') await this.guestRoleButton.click();
        else if (role === 'Dealer') await this.dealerRoleButton.click();
        else if (role === 'Studio') await this.studioRoleButton.click();
    }

    async fillSignUpForm(details: {
        fullName: string,
        phone: string,
        email: string,
        username: string,
        password: string,
        role?: 'Guest' | 'Dealer' | 'Studio'
    }) {
        if (details.role) {
            await this.selectRole(details.role);
        }
        await this.fullNameInput.fill(details.fullName);
        await this.phoneInput.fill(details.phone);
        await this.emailInput.fill(details.email);
        await this.usernameInput.fill(details.username);
        await this.passwordInput.fill(details.password);
    }

    async submit() {
        await this.createAccountButton.click();
    }

    async signUp(details: {
        fullName: string,
        phone: string,
        email: string,
        username: string,
        password: string,
        role?: 'Guest' | 'Dealer' | 'Studio'
    }) {
        await this.fillSignUpForm(details);
        await this.submit();
    }
}
