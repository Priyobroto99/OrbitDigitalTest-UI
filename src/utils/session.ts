import fs from 'fs';
import path from 'path';
import { ApiClient } from '../api/ApiClient';

export type Role = 'ADMIN' | 'STUDIO' | 'DEALER';

/** Env var pair backing each role. Kept here so the rest of the suite never reads process.env directly. */
const ROLE_ENV: Record<Role, [user: string, pass: string]> = {
  ADMIN: ['ADMIN_USERNAME', 'ADMIN_PASSWORD'],
  STUDIO: ['STUDIO_USERNAME', 'STUDIO_PASSWORD'],
  DEALER: ['DEALER_USERNAME', 'DEALER_PASSWORD'],
};

export const AUTH_DIR = path.resolve(__dirname, '../../playwright/.auth');

/** Credentials for a role, or null when the env vars are not configured. */
export function creds(role: Role): { username: string; password: string } | null {
  const [u, p] = ROLE_ENV[role];
  const username = process.env[u];
  const password = process.env[p];
  if (!username || !password) return null;
  return { username, password };
}

export function storageStatePath(role: Role): string {
  return path.join(AUTH_DIR, `${role.toLowerCase()}.json`);
}

/**
 * Ensure a storageState file exists for `role` and return its path.
 *
 * Logs in once via the API and caches the cookie jar on disk. Returns null when
 * the role has no credentials configured — callers should `test.skip` in that
 * case rather than fail, so the suite stays green on partially-seeded envs.
 */
export async function ensureStorageState(role: Role, baseURL: string): Promise<string | null> {
  const c = creds(role);
  if (!c) return null;

  const file = storageStatePath(role);
  if (fs.existsSync(file)) return file;

  fs.mkdirSync(AUTH_DIR, { recursive: true });
  const client = await ApiClient.create(baseURL, c);
  await client.saveStorageState(file);
  await client.dispose();
  return file;
}
