import { Page } from '@playwright/test';

/**
 * BasePage is the "Parent" class (similar to a BasePage in Java Selenium).
 * All other page classes will "extend" this class to inherit its methods.
 */
export class BasePage {
    // In TypeScript, the type is declared after the variable name (variable: Type)
    // 'protected' means it's accessible by classes that extend BasePage (like LoginPage)
    // 'readonly' is like 'final' in Java.
    protected readonly page: Page;

    /**
     * The constructor is like a Java constructor. 
     * It runs when we create an instance: new BasePage(page)
     */
    constructor(page: Page) {
        this.page = page;
    }

    /**
     * 'async' marks this as an asynchronous method (it returns a Promise).
     * This is required for almost all browser actions in Playwright.
     * @param path The URL path to navigate to (defaults to root '/')
     */
    async navigate(path: string = '/') {
        // 'await' tells the code to wait until the browser finishes loading the page
        // page.goto() is like driver.get() in Selenium
        await this.page.goto(path);
    }

    /**
     * Common utility to get the page title.
     * @returns {Promise<string>} The title of the current page.
     */
    async getTitle(): Promise<string> {
        return await this.page.title();
    }
}
