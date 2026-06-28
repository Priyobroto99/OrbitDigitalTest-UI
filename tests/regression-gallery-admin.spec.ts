import { test, expect } from '../src/fixtures/test-fixtures';

/**
 * REGRESSION §2.5 — Gallery admin & face clustering — R28–R34.
 *
 * R28/R29 (password encryption round-trip + update) are self-cleaning API tests:
 * each creates a throwaway event and deletes it. The clustering cases (R30–R34)
 * need uploaded photos and the Face++/RabbitMQ worker, so they require a seeded
 * fixture event and are left as explicit TODOs rather than flaky stubs.
 */
test.describe('@regression Gallery admin', () => {

  // R28 — Password encryption round-trip: revealed plaintext matches input and
  // `password_encrypted` is never sent to the client.
  test('R28 — password round-trips and ciphertext is never exposed', async ({ apiAs }) => {
    const admin = await apiAs('ADMIN');
    test.skip(!admin, 'ADMIN credentials not configured');

    const password = `pw-${Date.now()}`;
    const created = await admin!.post('/api/gallery/admin/events', {
      data: { name: `PW Event ${Date.now()}`, password },
    });
    expect(created.status()).toBe(200);
    const event = await created.json();

    try {
      expect(event.password).toBe(password);
      expect(event).not.toHaveProperty('password_encrypted');

      // Same guarantees through the admin list endpoint.
      const list = await (await admin!.get('/api/gallery/admin/events')).json();
      const fromList = list.find((e: any) => e.id === event.id);
      expect(fromList.password).toBe(password);
      expect(fromList).not.toHaveProperty('password_encrypted');
    } finally {
      await admin!.delete(`/api/gallery/admin/events/${event.id}`);
    }
  });

  // R29 — Update password: old password fails to unlock, new succeeds.
  test('R29 — updating the password invalidates the old one', async ({ apiAs }) => {
    const admin = await apiAs('ADMIN');
    test.skip(!admin, 'ADMIN credentials not configured');

    const oldPw = `old-${Date.now()}`;
    const newPw = `new-${Date.now()}`;
    const event = await (await admin!.post('/api/gallery/admin/events', {
      data: { name: `PW Event ${Date.now()}`, password: oldPw },
    })).json();

    try {
      const updated = await admin!.put(`/api/gallery/admin/events/${event.id}`, { data: { password: newPw } });
      expect(updated.status()).toBe(200);

      const oldTry = await admin!.post(`/api/gallery/events/${event.id}/unlock`, { data: { password: oldPw } });
      expect(oldTry.status()).toBe(403);

      const newTry = await admin!.post(`/api/gallery/events/${event.id}/unlock`, { data: { password: newPw } });
      expect(newTry.status()).toBe(200);
    } finally {
      await admin!.delete(`/api/gallery/admin/events/${event.id}`);
    }
  });

  // R30–R34 — Clustering lifecycle needs photos + the Face++/RabbitMQ worker on
  // a seeded fixture event (GALLERY_EVENT_ID with uploads). Tracked explicitly.
  test.fixme('R30 — queue clustering sets status=queued and disables upload', async () => {});
  test.fixme('R31 — progress polling returns done/total while processing', async () => {});
  test.fixme('R32 — completion toast fires and people sidebar populates', async () => {});
  test.fixme('R33 — person POV filter narrows the grid and Clear Filter restores it', async () => {});
  test.fixme('R34 — remove clustering clears people and resets status to idle', async () => {});
});
