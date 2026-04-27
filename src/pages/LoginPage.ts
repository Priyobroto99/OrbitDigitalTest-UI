import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly loginButton: Locator;
    private readonly errorMessage: Locator;

    constructor(page: Page) {
        super(page);
        this.usernameInput = page.locator('input[name="username"]');
        this.passwordInput = page.locator('input[name="password"]');
        // Using submit type and text for the main login button
        this.loginButton = page.locator('button[type="submit"]:has-text("Sign In")');
        // Placeholder for error message - will refine if I find the exact selector
        this.errorMessage = page.locator('.error-message, [role="alert"], .text-red-500');
    }

    async login(username: string, password: string) {
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        await this.loginButton.click();
    }

    async getErrorMessage(): Promise<string | null> {
        // Wait a bit for potential error to appear if needed, or just return content
        if (await this.errorMessage.isVisible()) {
            return await this.errorMessage.textContent();
        }
        return null;
    }
}
