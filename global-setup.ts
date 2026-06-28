import { FullConfig } from '@playwright/test';
import { ensureStorageState, creds, Role } from './src/utils/session';

/**
 * Runs once before the whole suite.
 *
 * Warms one storageState per configured role so the specs reuse a single login
 * instead of logging in over and over (keeps the sanity gate under its time
 * budget). Roles without credentials are skipped silently — the specs that need
 * them `test.skip` themselves. The S1 health checks live in the sanity spec so a
 * dead gateway surfaces as a normal test failure rather than a setup crash.
 */
async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL as string;
  if (!baseURL) throw new Error('baseURL is not configured in playwright.config.ts');

  const roles: Role[] = ['ADMIN', 'STUDIO', 'DEALER'];
  for (const role of roles) {
    if (!creds(role)) {
      console.log(`[global-setup] ${role}: no credentials configured — dependent tests will skip.`);
      continue;
    }
    try {
      await ensureStorageState(role, baseURL);
      console.log(`[global-setup] ${role}: session captured.`);
    } catch (err) {
      console.warn(`[global-setup] ${role}: login failed — ${(err as Error).message}`);
    }
  }
}

export default globalSetup;
