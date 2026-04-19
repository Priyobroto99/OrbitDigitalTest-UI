import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * InventoryPage handles the main product list after login.
 */
export class InventoryPage extends BasePage {
    // Locator for the entire product list items.
    private readonly productList: Locator;
    // Locator for the shopping cart icon showing the item count.
    private readonly shoppingCartBadge: Locator;

    constructor(page: Page) {
        super(page);
        this.productList = page.locator('.inventory_item');
        this.shoppingCartBadge = page.locator('.shopping_cart_badge');
    }

    /**
     * Adds a specific item to the cart by its name.
     * @param productName The exact name of the product to add.
     */
    async addItemToCart(productName: string) {
        // filter({ hasText: 'Name' }) is a powerful way to find a specific item in a list.
        // It's like finding a row in a table by its text content in Selenium.
        const product = this.productList.filter({ hasText: productName });

        // Once the specific item is found, we find its child 'button' and click it.
        await product.locator('button').click();
    }

    /**
     * Retrieves the count shown on the cart icon badge.
     * @returns {Promise<string | null>} The number of items currently in the cart.
     */
    async getCartCount(): Promise<string | null> {
        return await this.shoppingCartBadge.textContent();
    }
}
