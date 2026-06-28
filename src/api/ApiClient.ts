import { APIRequestContext, APIResponse, request } from '@playwright/test';

/**
 * Thin wrapper around Playwright's APIRequestContext.
 *
 * The app authenticates with an HttpOnly `access_token` cookie set by
 * `POST /api/users/auth/login`. APIRequestContext stores Set-Cookie values and
 * replays them with `credentials: include` semantics, so once `login()` runs the
 * same client is authenticated for every subsequent call — exactly like the
 * browser. This is what lets the RBAC / status-machine tests assert raw status
 * codes without driving the UI.
 */
export class ApiClient {
  private constructor(private readonly ctx: APIRequestContext) {}

  /** Create a client. Pass creds to log in immediately (throws if login fails). */
  static async create(
    baseURL: string,
    creds?: { username: string; password: string },
  ): Promise<ApiClient> {
    const ctx = await request.newContext({ baseURL });
    const client = new ApiClient(ctx);
    if (creds) await client.login(creds);
    return client;
  }

  /** Create a client from a previously-captured storageState file (reuses the session cookie). */
  static async fromStorageState(baseURL: string, storageState: string): Promise<ApiClient> {
    const ctx = await request.newContext({ baseURL, storageState });
    return new ApiClient(ctx);
  }

  async login(creds: { username: string; password: string }): Promise<void> {
    const res = await this.ctx.post('/api/users/auth/login', { data: creds });
    if (!res.ok()) {
      throw new Error(
        `API login failed for "${creds.username}": ${res.status()} ${await res.text()}`,
      );
    }
  }

  get(endpoint: string, options?: Parameters<APIRequestContext['get']>[1]): Promise<APIResponse> {
    return this.ctx.get(endpoint, options);
  }
  post(endpoint: string, options?: Parameters<APIRequestContext['post']>[1]): Promise<APIResponse> {
    return this.ctx.post(endpoint, options);
  }
  patch(endpoint: string, options?: Parameters<APIRequestContext['patch']>[1]): Promise<APIResponse> {
    return this.ctx.patch(endpoint, options);
  }
  put(endpoint: string, options?: Parameters<APIRequestContext['put']>[1]): Promise<APIResponse> {
    return this.ctx.put(endpoint, options);
  }
  delete(endpoint: string, options?: Parameters<APIRequestContext['delete']>[1]): Promise<APIResponse> {
    return this.ctx.delete(endpoint, options);
  }

  /** Persist cookies to a storageState file so a browser context can reuse the session. */
  async saveStorageState(path: string): Promise<void> {
    await this.ctx.storageState({ path });
  }

  async dispose(): Promise<void> {
    await this.ctx.dispose();
  }
}
