import { Page, Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Admin AI Gallery panel (inside `/admin` → "AI Gallery" tab).
 * Event creation, password reveal (Fernet round-trip), and face clustering.
 */
export class AdminGalleryPage extends BasePage {
  readonly eventList: Locator;
  readonly revealPasswordButton: Locator;
  readonly runClusteringButton: Locator;
  readonly removeClusteringButton: Locator;

  // Create-event form
  readonly nameInput: Locator;
  readonly passwordInput: Locator;
  readonly createButton: Locator;

  constructor(page: Page) {
    super(page);
    this.eventList = page.locator('[data-event-card], .event-card, article');
    this.revealPasswordButton = page.getByRole('button', { name: /Reveal event password/i });
    this.runClusteringButton = page.getByRole('button', { name: /Run Face Clustering|Re-run Face Clustering/i });
    this.removeClusteringButton = page.getByRole('button', { name: /Remove Clustering/i });

    this.nameInput = page.locator('input[placeholder="e.g. Priya & Raj Wedding"]');
    this.passwordInput = page.locator('input[placeholder="Guests will need this to view"]');
    this.createButton = page.getByRole('button', { name: /Create Event/i });
  }

  /** Reveal the password for the first event card and return the shown plaintext. */
  async revealFirstPassword(): Promise<string> {
    const reveal = this.revealPasswordButton.first();
    await reveal.click();
    // Password renders in a font-mono span once revealed.
    const value = this.page.locator('span.font-mono').first();
    await value.waitFor({ state: 'visible' });
    return (await value.textContent())?.trim() ?? '';
  }

  async runClustering() {
    await this.runClusteringButton.click();
  }

  clusteringStatus(): Locator {
    return this.page.getByText(/queued|processing|completed|idle/i).first();
  }
}
