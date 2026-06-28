import { test, expect } from '../src/fixtures/test-fixtures';

/**
 * REGRESSION §2.1 — Order status machine (photolab) — R1–R10.
 *
 * The PATCH-validation guard (R10) is non-mutating and always runs. The full
 * transition chain (R1–R9) creates real orders and touches partner ledgers,
 * which is not safe to repeat against a production-like env on every deploy.
 * It is therefore gated behind RUN_MUTATING_ORDER_TESTS=1 and uniquely-named
 * (PW-*) records, per the plan's create-or-uniquely-name guidance.
 */
test.describe('@regression Order status machine', () => {

  // R10 — Removed statuses: the enum rejects SHIPPED/DELIVERED. Body validation
  // happens before any DB write, so this is deterministic and non-mutating.
  test('R10 — SHIPPED/DELIVERED are rejected by the status enum', async ({ apiAs }) => {
    const admin = await apiAs('ADMIN');
    test.skip(!admin, 'ADMIN credentials not configured');

    for (const status of ['SHIPPED', 'DELIVERED']) {
      const res = await admin!.patch('/api/orders/1', { data: { status } });
      expect(res.status(), `${status} should be rejected`).toBe(422);
    }
  });

  const mutating = process.env.RUN_MUTATING_ORDER_TESTS === '1';

  test.describe('full transition chain (mutating)', () => {
    test.skip(!mutating, 'set RUN_MUTATING_ORDER_TESTS=1 to run order-creating tests');

    test('R1–R7 — PENDING → CONFIRMED → PAID → INVOICED', async ({ apiAs }) => {
      const admin = await apiAs('ADMIN');
      const studio = await apiAs('STUDIO');
      test.skip(!admin || !studio, 'ADMIN and STUDIO credentials required');

      const me = await (await studio!.get('/api/users/profile')).json();
      const orderPayload = {
        user_id: me.id,
        account_type: 'studio',
        customer_name: `PW-${Date.now()}`,
        items: [{ product_id: 0, size: 'postcard', finish: 'regular', quantity: 1, unit_price: 100 }],
      };

      // R1 — Studio-placed order starts PENDING.
      const created = await (await studio!.post('/api/orders', { data: orderPayload })).json();
      expect(created.status).toBe('PENDING');
      const orderId = created.id;

      // R3 — Confirm transition PENDING → CONFIRMED (admin).
      const confirmed = await admin!.patch(`/api/orders/${orderId}`, { data: { status: 'CONFIRMED' } });
      expect((await confirmed.json()).status).toBe('CONFIRMED');

      // R5 — Invoice gate before payment: CONFIRMED (unpaid) → 400.
      const gated = await admin!.get(`/api/orders/${orderId}/download-invoice`);
      expect(gated.status()).toBe(400);

      // R4 — Record payment → PAID.
      const paid = await admin!.patch(`/api/orders/${orderId}`, { data: { status: 'PAID' } });
      expect((await paid.json()).status).toBe('PAID');

      // R6 — First invoice download → INVOICED (PDF returned, one-time transition).
      const invoice = await admin!.get(`/api/orders/${orderId}/download-invoice`);
      expect(invoice.status()).toBe(200);
      expect(invoice.headers()['content-type']).toContain('application/pdf');
      const afterFirst = await (await admin!.get(`/api/orders/${orderId}`)).json();
      expect(afterFirst.status).toBe('INVOICED');

      // R7 — Re-download stays INVOICED.
      const again = await admin!.get(`/api/orders/${orderId}/download-invoice`);
      expect(again.status()).toBe(200);
      const afterSecond = await (await admin!.get(`/api/orders/${orderId}`)).json();
      expect(afterSecond.status).toBe('INVOICED');
    });

    // R2 — Admin-placed order starts CONFIRMED (not PENDING).
    test('R2 — admin-placed order starts CONFIRMED', async ({ apiAs }) => {
      const admin = await apiAs('ADMIN');
      const studio = await apiAs('STUDIO');
      test.skip(!admin || !studio, 'ADMIN and STUDIO credentials required');

      const me = await (await studio!.get('/api/users/profile')).json();
      const created = await (await admin!.post('/api/orders', {
        data: {
          user_id: me.id,
          account_type: 'studio',
          customer_name: `PW-${Date.now()}`,
          items: [{ product_id: 0, size: 'postcard', finish: 'regular', quantity: 1, unit_price: 100 }],
        },
      })).json();
      expect(created.status).toBe('CONFIRMED');
    });

    // R9 — Cancel path: PENDING/CONFIRMED → CANCELLED.
    test('R9 — order can be cancelled', async ({ apiAs }) => {
      const admin = await apiAs('ADMIN');
      const studio = await apiAs('STUDIO');
      test.skip(!admin || !studio, 'ADMIN and STUDIO credentials required');

      const me = await (await studio!.get('/api/users/profile')).json();
      const created = await (await studio!.post('/api/orders', {
        data: {
          user_id: me.id,
          account_type: 'studio',
          customer_name: `PW-${Date.now()}`,
          items: [{ product_id: 0, size: 'postcard', finish: 'regular', quantity: 1, unit_price: 100 }],
        },
      })).json();

      const cancelled = await admin!.patch(`/api/orders/${created.id}`, { data: { status: 'CANCELLED' } });
      expect((await cancelled.json()).status).toBe('CANCELLED');
    });
  });
});
