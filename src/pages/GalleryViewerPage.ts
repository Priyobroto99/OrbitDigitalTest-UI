import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * AI Gallery event viewer (`/products/aistudio/aigallery/:eventId`).
 * The GUEST-facing unlock + day-tabs + lightbox flow.
 */
export class GalleryViewerPage extends BasePage {
  readonly passwordInput: Locator;
  readonly unlockButton: Locator;
  readonly passwordError: Locator;

  constructor(page: Page) {
    super(page);
    this.passwordInput = page.locator('input[type="password"][placeholder="Event password"]');
    this.unlockButton = page.getByRole('button', { name: /unlock|view photos|enter/i });
    this.passwordError = page.getByText(/Incorrect password/i);
  }

  async openEvent(eventId: string) {
    await this.navigate(`/products/aistudio/aigallery/${eventId}`);
    await this.page.waitForLoadState('networkidle');
  }

  async unlock(password: string) {
    await this.passwordInput.fill(password);
    // The eye-toggle sits immediately after the input; use the named unlock button instead.
    await this.unlockButton.click();
  }

  /** Day tab buttons appear once unlocked. */
  dayTabs(): Locator {
    return this.page.locator('[data-day-tab], button', { hasText: /Day|Unclassified/i });
  }
}
