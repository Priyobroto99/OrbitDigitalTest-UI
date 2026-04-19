import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * LoginPage extends BasePage (just like Java inheritance: public class LoginPage extends BasePage).
 * This class handles all logic for the login page of SauceDemo.
 */
export class LoginPage extends BasePage {
    // These are our page elements. In Playwright, they are 'Locators' (similar to WebElements).
    // Note: TypeScript uses Name: Type instead of Type Name.
    private readonly usernameInput: Locator;
    private readonly passwordInput: Locator;
    private readonly loginButton: Locator;
    private readonly errorMessage: Locator;

    constructor(page: Page) {
        // 'super' calls the parent (BasePage) constructor, passing the 'page' object.
        super(page);

        // Locators are defined using CSS selectors. 
        // SauceDemo provides helpful 'data-test' attributes for automation.
        // page.locator() is like driver.findElement(By.css(...)) but with auto-waiting.
        this.usernameInput = page.locator('[data-test="username"]');
        this.passwordInput = page.locator('[data-test="password"]');
        this.loginButton = page.locator('[data-test="login-button"]');
        this.errorMessage = page.locator('[data-test="error"]');
    }

    /**
     * Navigates to the SauceDemo homepage.
     */
    async open() {
        // We call the navigate method from the parent BasePage class.
        await this.navigate('https://www.saucedemo.com/');
    }

    /**
     * Performs a login operation.
     * @param username The username to enter.
     * @param password The password to enter.
     */
    async login(username: string, password: string) {
        // .fill() is like .sendKeys() in Selenium.
        await this.usernameInput.fill(username);
        await this.passwordInput.fill(password);
        
        // .click() automatically waits for the button to be "actionable" (visible and enabled).
        await this.loginButton.click();
    }

    /**
     * Gets the current text of the error message element.
     * @returns {Promise<string | null>} The text content of the error message.
     */
    async getErrorMessage(): Promise<string | null> {
        return await this.errorMessage.textContent();
    }
}
