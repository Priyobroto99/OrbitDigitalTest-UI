import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * CartPage handles the logic for the shopping cart view.
 */
export class CartPage extends BasePage {
    // Locator for individual items listed in the cart.
    private readonly cartItems: Locator;
    // Locator for the "Checkout" button on the cart page.
    private readonly checkoutButton: Locator;

    constructor(page: Page) {
        super(page);
        this.cartItems = page.locator('.cart_item');
        this.checkoutButton = page.locator('[data-test="checkout"]');
    }

    /**
     * Verifies if a specific item is present in the cart.
     * @param productName The product name to look for in the cart.
     * @returns {Promise<boolean>} True if found, false otherwise.
     */
    async isItemInCart(productName: string): Promise<boolean> {
        // .filter({ hasText: ... }) will narrow the search for cart items.
        // .isVisible() checks if at least one such element is present and visible.
        return await this.cartItems.filter({ hasText: productName }).isVisible();
    }

    /**
     * Clicks the "Checkout" button to proceed to payment/shipping info.
     */
    async clickCheckout() {
        await this.checkoutButton.click();
    }
}
