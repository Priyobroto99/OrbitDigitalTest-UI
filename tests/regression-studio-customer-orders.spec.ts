import { test, expect } from '../src/fixtures/test-fixtures';

/**
 * REGRESSION §2.2 — Studio customer orders (DB-backed) — R11–R16.
 * These are self-cleaning: every created order is deleted in the same test
 * (DELETE → 204), so they are safe to run against a production-like env.
 */
test.describe('@regression Studio customer orders', () => {

  async function studioId(client: import('../src/api/ApiClient').ApiClient): Promise<number> {
    const me = await (await client.get('/api/users/profile')).json();
    return me.id;
  }

  // R11 — Create with multiple line items; total = Σ(qty×price); items persisted.
  test('R11 — create with multiple line items computes total', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');
    const id = await studioId(studio!);

    const items = [
      { description: 'PW item A', qty: 2, price: 50 },
      { description: 'PW item B', qty: 3, price: 10 },
    ];
    const res = await studio!.post('/api/studio-orders', {
      data: { studio_id: id, customer_name: `PW-${Date.now()}`, items },
    });
    expect(res.status()).toBe(201);
    const order = await res.json();
    expect(order.total).toBe(2 * 50 + 3 * 10);
    expect(order.items).toHaveLength(2);

    await studio!.delete(`/api/studio-orders/${order.id}`);
  });

  // R12 — Mark paid: CONFIRMED → PAID.
  test('R12 — mark paid transitions CONFIRMED → PAID', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');
    const id = await studioId(studio!);

    const created = await (await studio!.post('/api/studio-orders', {
      data: { studio_id: id, customer_name: `PW-${Date.now()}`, items: [{ description: 'PW pay', qty: 1, price: 100 }] },
    })).json();
    expect(created.status).toBe('CONFIRMED');

    const paid = await studio!.patch(`/api/studio-orders/${created.id}/pay`, { data: {} });
    expect(paid.status()).toBe(200);
    expect((await paid.json()).status).toBe('PAID');

    await studio!.delete(`/api/studio-orders/${created.id}`);
  });

  // R13 — Delete: 204; gone after reload.
  test('R13 — delete removes the order', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');
    const id = await studioId(studio!);

    const created = await (await studio!.post('/api/studio-orders', {
      data: { studio_id: id, customer_name: `PW-${Date.now()}`, items: [{ description: 'PW del', qty: 1, price: 10 }] },
    })).json();

    const del = await studio!.delete(`/api/studio-orders/${created.id}`);
    expect(del.status()).toBe(204);

    const list = await (await studio!.get('/api/studio-orders')).json();
    expect(list.find((o: any) => o.id === created.id)).toBeUndefined();
  });

  // R14 — Studio scoping (RBAC): cannot create for another studio id.
  test('R14 — cannot create an order for another studio', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');
    const id = await studioId(studio!);

    const res = await studio!.post('/api/studio-orders', {
      data: { studio_id: id + 999999, customer_name: `PW-${Date.now()}`, items: [{ description: 'x', qty: 1, price: 10 }] },
    });
    expect(res.status()).toBe(403);
  });

  // R15 — Validation: qty 0 or price ≤ 0 → 422 (Pydantic gt=0).
  test('R15 — invalid item quantity/price is rejected', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');
    const id = await studioId(studio!);

    const zeroQty = await studio!.post('/api/studio-orders', {
      data: { studio_id: id, customer_name: `PW-${Date.now()}`, items: [{ description: 'bad', qty: 0, price: 10 }] },
    });
    expect(zeroQty.status()).toBe(422);

    const zeroPrice = await studio!.post('/api/studio-orders', {
      data: { studio_id: id, customer_name: `PW-${Date.now()}`, items: [{ description: 'bad', qty: 1, price: 0 }] },
    });
    expect(zeroPrice.status()).toBe(422);
  });

  // R16 — Persistence: created order is returned by a fresh list call (DB, not localStorage).
  test('R16 — order persists across a fresh fetch', async ({ apiAs }) => {
    const studio = await apiAs('STUDIO');
    test.skip(!studio, 'STUDIO credentials not configured');
    const id = await studioId(studio!);

    const name = `PW-${Date.now()}`;
    const created = await (await studio!.post('/api/studio-orders', {
      data: { studio_id: id, customer_name: name, items: [{ description: 'PW persist', qty: 1, price: 10 }] },
    })).json();

    const list = await (await studio!.get('/api/studio-orders')).json();
    expect(list.find((o: any) => o.id === created.id && o.customer_name === name)).toBeTruthy();

    await studio!.delete(`/api/studio-orders/${created.id}`);
  });
});
