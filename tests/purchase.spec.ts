import { test, expect } from '../src/fixtures/test-fixtures';

test.describe('SauceDemo Purchase Flows', () => {

    /**
     * Flow 2: Add to Cart and Verify
     * We need { loginPage, inventoryPage, cartPage } for this test.
     * Playwright will automatically initialize all three for us.
     */
    test('should add a backpack to the cart and verify its presence', async ({ loginPage, inventoryPage, cartPage }) => {
        // 1. Initial login
        await loginPage.open();
        await loginPage.login('standard_user', 'secret_sauce');

        // 2. Add specific product to cart from Inventory page
        const productName = 'Sauce Labs Backpack';
        await inventoryPage.addItemToCart(productName);

        // 3. (Brief Brainstorm) How to get to the cart? 
        // Let's use BasePage navigation or we could add a method to InventoryPage.
        // For now, let's just go directly to the cart URL to keep the flow simple.
        await cartPage.navigate('https://www.saucedemo.com/cart.html');

        // 4. Assertion (Validation)
        // Check if our product is visible in the cart items.
        const isInCart = await cartPage.isItemInCart(productName);
        expect(isInCart).toBeTruthy();
    });

});
