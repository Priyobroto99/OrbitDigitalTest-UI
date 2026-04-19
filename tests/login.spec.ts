import { test, expect } from '../src/fixtures/test-fixtures';

/**
 * Notice how we import 'test' from our custom fixtures file, NOT @playwright/test.
 * This is how we "inject" our Page Objects into the test.
 */

test.describe('SauceDemo Login Tests', () => {

    /**
     * Flow 1: Successful Login
     * In the arguments, we list the pages we need: { loginPage }.
     * Playwright sees this and automatically creates the LoginPage object for us.
     */
    test('should login successfully with standard_user', async ({ loginPage }) => {
        // Step 1: Open the website
        await loginPage.open();

        // Step 2: Perform login
        // 'secret_sauce' is the password for all users on this site
        await loginPage.login('standard_user', 'secret_sauce');

        // Step 3: Assertion (Validation)
        // expect() is the equivalent of Assert.assertEquals() in TestNG/JUnit
        // Playwright assertions are "Web-First" (they auto-wait for the condition to be true)
        const title = await loginPage.getTitle();
        expect(title).toBe('Swag Labs');
    });

});
