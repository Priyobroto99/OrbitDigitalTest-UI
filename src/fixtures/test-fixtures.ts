import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { SignUpPage } from '../pages/SignUpPage';
import { AdminPage } from '../pages/AdminPage';
import { DealerPortalPage } from '../pages/DealerPortalPage';

/**
 * 'MyFixtures' is an interface that defines the objects we want to "inject" into our tests.
 * Think of this as the "Blueprint" for our PageFactory.
 */
type MyFixtures = {
    homePage: HomePage;
    loginPage: LoginPage;
    signUpPage: SignUpPage;
    adminPage: AdminPage;
    dealerPortalPage: DealerPortalPage;
};

/**
 * We 'extend' the base Playwright test object.
 * This is the magic of Dependency Injection. 
 */
export const test = base.extend<MyFixtures>({
    homePage: async ({ page }, use) => {
        const homePage = new HomePage(page);
        await use(homePage);
    },
    loginPage: async ({ page }, use) => {
        const loginPage = new LoginPage(page);
        await use(loginPage);
    },
    signUpPage: async ({ page }, use) => {
        const signUpPage = new SignUpPage(page);
        await use(signUpPage);
    },
    adminPage: async ({ page }, use) => {
        const adminPage = new AdminPage(page);
        await use(adminPage);
    },
    dealerPortalPage: async ({ page }, use) => {
        const dealerPortalPage = new DealerPortalPage(page);
        await use(dealerPortalPage);
    }
});

/**
 * We also export 'expect' from the standard Playwright library 
 * so we can use both 'test' and 'expect' from this one file.
 */
export { expect } from '@playwright/test';
