import { Locator, test } from '@playwright/test';
import { BasePage } from './BasePage';

export class HomePage extends BasePage {

    private readonly topNavHome: Locator;
    private readonly topNavSignIn: Locator;
    private readonly topNavSignUp: Locator;

    constructor(page) {
        super(page);
        // Using .menu__item based on inspection
        const items = page.locator('.menu__item');
        this.topNavHome = items.filter({ hasText: 'Home' });
        this.topNavSignIn = items.filter({ hasText: 'Sign In' });
        this.topNavSignUp = items.filter({ hasText: 'Sign Up' });
    }

    async launchApp() {
        await this.navigate('/');
    }

    async getTabTitle(): Promise<string> {
        return await this.page.title();
    }

    async clickHome() {
        await this.topNavHome.click();
    }

    async clickSignIn() {
        await this.topNavSignIn.click();
    }
    async clickSignUp() {
        await this.topNavSignUp.click();
    }
}
