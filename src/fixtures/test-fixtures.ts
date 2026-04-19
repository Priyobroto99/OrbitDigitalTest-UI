import { test as base } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { CartPage } from '../pages/CartPage';

/**
 * 'MyFixtures' is an interface that defines the objects we want to "inject" into our tests.
 * Think of this as the "Blueprint" for our PageFactory.
 */
type MyFixtures = {
    loginPage: LoginPage;
    inventoryPage: InventoryPage;
    cartPage: CartPage;
};

/**
 * We 'extend' the base Playwright test object.
 * This is the magic of Dependency Injection. 
 * Instead of creating 'new LoginPage(page)' in every test, Playwright does it here.
 */
export const test = base.extend<MyFixtures>({
    
    // When a test asks for 'loginPage', this logic runs:
    loginPage: async ({ page }, use) => {
        // 1. Create a new instance of the page
        const loginPage = new LoginPage(page);
        // 2. "use" makes it available to the test
        await use(loginPage);
        // 3. (Optional) Any code after 'use' acts as "Teardown" (like @AfterMethod in Java)
    },

    inventoryPage: async ({ page }, use) => {
        const inventoryPage = new InventoryPage(page);
        await use(inventoryPage);
    },

    cartPage: async ({ page }, use) => {
        const cartPage = new CartPage(page);
        await use(cartPage);
    },
});

/**
 * We also export 'expect' from the standard Playwright library 
 * so we can use both 'test' and 'expect' from this one file.
 */
export { expect } from '@playwright/test';
