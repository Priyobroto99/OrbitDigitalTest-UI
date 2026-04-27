import { test, expect } from '../src/fixtures/test-fixtures';

test.describe('Orbit Digital Sanity Tests', () => {
    test('should load the home page and verify title', async ({ homePage }) => {
        await homePage.launchApp();
        const title = await homePage.getTabTitle();
        expect(title).toBe('Orbit Digital Orders');
    });
});