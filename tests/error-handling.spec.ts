import { test, expect } from '../src/fixtures/test-fixtures';

test.describe('SauceDemo Error Handling Tests', () => {

    /**
     * Flow 3: Negative Login Flow
     * Goal: Verify the "Locked Out" error message appears for specific users.
     */
    test('should show error for locked out user', async ({ loginPage }) => {
        // Step 1: Attempt login with a known "locked out" user
        await loginPage.open();
        await loginPage.login('locked_out_user', 'secret_sauce');

        // Step 2: Extract the error message from the page
        const errorText = await loginPage.getErrorMessage();

        // Step 3: Assertion (Validation)
        // We expect the message to specifically mention the user is locked out.
        // contains() is like Java's .contains() method.
        expect(errorText).toContain('Epic sadface: Sorry, this user has been locked out.');
    });

});
