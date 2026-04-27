import { test, expect } from '../src/fixtures/test-fixtures';

test.describe('Admin Partner Workflow E2E', () => {
    
    const testUsername = `dealer_flow_${Date.now()}`;
    const testEmail = `${testUsername}@example.com`;

    test('should manage partner lifecycle and pricing', async ({ homePage, loginPage, adminPage, dealerPortalPage, page }) => {
        test.setTimeout(120000); // 2 minutes for this complex flow

        // Handle alerts
        page.on('dialog', async dialog => {
            console.log('Dialog:', dialog.message());
            await dialog.accept();
        });

        // 1. Login using admin
        await homePage.launchApp();
        await homePage.clickSignIn();
        const username = process.env.ADMIN_USERNAME;
        const password = process.env.ADMIN_PASSWORD;
        if (!username || !password) throw new Error('ADMIN_USERNAME or ADMIN_PASSWORD not set');
        
        await loginPage.login(username, password);
        await page.waitForLoadState('networkidle');
        
        // Assert login success
        await expect(page.locator('button:has-text("Logout")')).toBeVisible();
        
        // 2. Navigate to admin console and create Dealer
        await adminPage.navigateToAdminConsole();
        await adminPage.clickDealersStudiosTab();
        await adminPage.createDealer({
            username: testUsername,
            email: testEmail
        });
        
        // 5. Verify dealer is visible
        await adminPage.clickDealersStudiosTab();
        await expect(page.locator('tr').filter({ hasText: testUsername })).toBeVisible();

        // --- NEW STEPS ---
        
        // 6. Navigate to Dealer Portal via hamburger menu
        await page.locator('button').first().click(); // Open menu
        await page.locator('a:has-text("Dealer Portal")').click();
        await page.waitForLoadState('networkidle');

        // 7. Select the newly created dealer
        await dealerPortalPage.selectDealer(testUsername);
        await page.waitForTimeout(1000); // Wait for table to populate

        // 8. Add 2 Matt items and 2 Glossy items to cart
        await dealerPortalPage.addItemToOrder({ size: 'POSTCARD', finish: 'Matt' });
        await dealerPortalPage.updateQuantity(0, '2');
        
        await dealerPortalPage.addItemToOrder({ size: '4X6', finish: 'Glossy' });
        await dealerPortalPage.updateQuantity(1, '2');

        // 9. Check base pricing
        const basePrice = await dealerPortalPage.getUnitPrice(0);
        console.log(`Base Price for item 0 (Matt): ${basePrice}`);

        // 10. Navigate to Pricing Table section (Admin Console)
        await page.locator('button').first().click(); // Open menu
        await page.locator('a:has-text("Admin Console")').click();
        await adminPage.clickPricingTableTab();

        // 11. Select the partner and update a price
        await adminPage.selectPricingPartner('Dealer', testUsername);
        const newPrice = '99.99';
        // Target POSTCARD Glossy specifically
        await adminPage.updatePriceByItem('POSTCARD', 'Glossy', newPrice);
        
        // 12. Save changes
        await adminPage.savePricing();
        await page.waitForTimeout(1000);

        // 13. Navigate to dealer portal again to view updated price
        await page.locator('button').first().click(); // Open menu
        await page.locator('a:has-text("Dealer Portal")').click();
        await dealerPortalPage.selectDealer(testUsername);
        await page.waitForTimeout(1000);

        // Check the price for Postcard Glossy
        await dealerPortalPage.addItemToOrder({ size: 'POSTCARD', finish: 'Glossy' });
        
        const updatedPrice = await dealerPortalPage.getUnitPrice(0);
        console.log(`Updated Price for Postcard Glossy: ${updatedPrice}`);
        expect(updatedPrice).toContain(newPrice);

        // 14. Delete the partner
        await page.locator('button').first().click(); // Open menu
        await page.locator('a:has-text("Admin Console")').click();
        await adminPage.clickDealersStudiosTab();
        await adminPage.deleteUser(testUsername);

        // Verify user is gone
        await expect(page.locator('tr').filter({ hasText: testUsername })).not.toBeVisible();
    });
});
