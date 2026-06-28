import { test as base, Page } from '@playwright/test';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { SignUpPage } from '../pages/SignUpPage';
import { AdminPage } from '../pages/AdminPage';
import { DealerPortalPage } from '../pages/DealerPortalPage';
import { ApiClient } from '../api/ApiClient';
import { ensureStorageState, Role } from '../utils/session';

/**
 * 'MyFixtures' is an interface that defines the objects we want to "inject" into our tests.
 * Think of this as the "Blueprint" for our PageFactory.
 */
type MyFixtures = {
  homePage: HomePage;
  loginPage: LoginPage;
  signUpPage: SignUpPage;
  adminPage: AdminPage;
  dealerPortalPage: DealerPortalPage;

  /** Unauthenticated API client (health checks, 401 guards). */
  api: ApiClient;
  /** Build an API client already logged in as `role`, or null if creds are missing. */
  apiAs: (role: Role) => Promise<ApiClient | null>;
  /** Open a browser page already authenticated as `role`, or null if creds are missing. */
  authedPage: (role: Role) => Promise<Page | null>;
};

/**
 * We 'extend' the base Playwright test object.
 * This is the magic of Dependency Injection.
 */
export const test = base.extend<MyFixtures>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  signUpPage: async ({ page }, use) => {
    await use(new SignUpPage(page));
  },
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
  dealerPortalPage: async ({ page }, use) => {
    await use(new DealerPortalPage(page));
  },

  api: async ({ baseURL }, use) => {
    const client = await ApiClient.create(baseURL!);
    await use(client);
    await client.dispose();
  },

  apiAs: async ({ baseURL }, use) => {
    const created: ApiClient[] = [];
    const factory = async (role: Role): Promise<ApiClient | null> => {
      const path = await ensureStorageState(role, baseURL!);
      if (!path) return null;
      // Reuse the warmed storageState so we don't hit /auth/login per test.
      const client = await ApiClient.fromStorageState(baseURL!, path);
      created.push(client);
      return client;
    };
    await use(factory);
    for (const c of created) await c.dispose();
  },

  authedPage: async ({ browser, baseURL }, use) => {
    const contexts: import('@playwright/test').BrowserContext[] = [];
    const factory = async (role: Role): Promise<Page | null> => {
      const path = await ensureStorageState(role, baseURL!);
      if (!path) return null;
      const context = await browser.newContext({ baseURL: baseURL!, storageState: path });
      contexts.push(context);
      return context.newPage();
    };
    await use(factory);
    for (const c of contexts) await c.close();
  },
});

/**
 * We also export 'expect' from the standard Playwright library
 * so we can use both 'test' and 'expect' from this one file.
 */
export { expect } from '@playwright/test';
