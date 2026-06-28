import { test, expect } from '../src/fixtures/test-fixtures';

/**
 * REGRESSION §2.3 — RBAC / authorization (R17–R20).
 * Asserted at the API layer: deterministic, non-mutating, and the cookie-based
 * auth is exactly what's under test.
 */
test.describe('@regression RBAC / authorization', () => {

  // R17 — Non-admin order scoping: STUDIO sees only its own orders.
  test('R17 — non-admin /orders is self-scoped', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');

    const res = await studio!.get('/api/orders');
    expect(res.status()).toBe(200);

    const me = await (await studio!.get('/api/users/profile')).json();
    const orders = await res.json();
    for (const o of orders) {
      expect(String(o.user_id)).toBe(String(me.id));
    }
  });

  // R18 — Admin-only route (PATCH order status) rejects non-admins.
  test('R18 — admin-only order PATCH is forbidden for STUDIO', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');

    const res = await studio!.patch('/api/orders/1', { data: { status: 'CONFIRMED' } });
    expect(res.status()).toBe(403);
  });

  // R18b — Admin-only invoice download rejects non-admins.
  test('R18 — invoice download is forbidden for STUDIO', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');

    const res = await studio!.get('/api/orders/1/download-invoice');
    expect(res.status()).toBe(403);
  });

  // R19 — Studio-or-admin gate: DEALER cannot touch /studio-orders.
  test('R19 — DEALER is forbidden from /studio-orders', async ({ apiAs }) => {
    const dealer = await apiAs('DEALER');
    test.skip(!dealer, 'DEALER credentials not configured');

    const res = await dealer!.get('/api/studio-orders');
    expect(res.status()).toBe(403);
  });

  // R20 — Unauthenticated API call returns 401.
  test('R20 — protected endpoint without cookie returns 401', async ({ api }) => {
    const res = await api.get('/api/orders');
    expect(res.status()).toBe(401);
  });
});
