import { test, expect } from '../src/fixtures/test-fixtures';
import { ApiClient } from '../src/api/ApiClient';
import { Role } from '../src/utils/session';

/**
 * REGRESSION §2.4 — Gallery viewer & event tokens — R21–R27.
 *
 * Unlock requires a guest-or-above session, so we reuse whichever role session
 * is configured. The event-token cases need a known event:
 *   GALLERY_EVENT_ID + GALLERY_EVENT_PASSWORD  (and GALLERY_EVENT_ID_B for R22).
 */
test.describe('@regression Gallery viewer & event tokens', () => {

  const eventId = process.env.GALLERY_EVENT_ID;
  const eventPw = process.env.GALLERY_EVENT_PASSWORD;
  const eventIdB = process.env.GALLERY_EVENT_ID_B;

  /** First configured role session — unlock only needs "guest or above". */
  async function anySession(apiAs: (r: Role) => Promise<ApiClient | null>): Promise<ApiClient | null> {
    for (const role of ['ADMIN', 'STUDIO', 'DEALER'] as Role[]) {
      const c = await apiAs(role);
      if (c) return c;
    }
    return null;
  }

  async function unlock(client: ApiClient, id: string, password: string) {
    return client.post(`/api/gallery/events/${id}/unlock`, { data: { password } });
  }

  // R21 — Wrong password → 403 "Incorrect event password".
  test('R21 — wrong event password is rejected', async ({ apiAs }) => {
    const client = await anySession(apiAs);
    test.skip(!client, 'no role credentials configured');
    test.skip(!eventId, 'GALLERY_EVENT_ID not configured');

    const res = await unlock(client!, eventId!, 'definitely-wrong-password');
    expect(res.status()).toBe(403);
  });

  // R22 — Event token scoping: event A's token must not work on event B.
  test('R22 — event token does not cross event boundaries', async ({ apiAs }) => {
    const client = await anySession(apiAs);
    test.skip(!client, 'no role credentials configured');
    test.skip(!eventId || !eventPw || !eventIdB, 'GALLERY_EVENT_ID(_B)/PASSWORD not configured');

    const unlocked = await unlock(client!, eventId!, eventPw!);
    expect(unlocked.status()).toBe(200);
    const token = (await unlocked.json()).token;

    const res = await client!.get(`/api/gallery/events/${eventIdB}/days`, {
      headers: { 'X-Event-Token': token },
    });
    expect(res.status()).toBe(403);
  });

  // R23 — Full-photo lightbox (pinned fix): a valid token returns 200, NOT 403,
  // for `/photos/{id}/full` (guards the event_id=0 regression).
  test('R23 — full-photo endpoint returns 200 with a valid token', async ({ apiAs }) => {
    const client = await anySession(apiAs);
    test.skip(!client, 'no role credentials configured');
    test.skip(!eventId || !eventPw, 'GALLERY_EVENT_ID/PASSWORD not configured');

    const unlocked = await unlock(client!, eventId!, eventPw!);
    expect(unlocked.status()).toBe(200);
    const token = (await unlocked.json()).token;
    const headers = { 'X-Event-Token': token };

    // Resolve a real photo id: first day → first photo.
    const days = await (await client!.get(`/api/gallery/events/${eventId}/days`, { headers })).json();
    test.skip(!Array.isArray(days) || days.length === 0, 'event has no days/photos to sample');

    const photos = await (await client!.get(
      `/api/gallery/events/${eventId}/days/${days[0].id}/photos?page=1&page_size=1`, { headers },
    )).json();
    const photoId = photos.photos?.[0]?.id ?? photos[0]?.id;
    test.skip(!photoId, 'first day has no photos to sample');

    const full = await client!.get(`/api/gallery/photos/${photoId}/full`, { headers });
    expect(full.status(), 'full-photo must not 403 with a valid event token').toBe(200);
    expect((await full.json()).url).toBeTruthy();
  });

  // R24 — Token expiry / invalidity: a malformed/garbage token → 401.
  test('R24 — invalid/expired event token returns 401', async ({ apiAs }) => {
    const client = await anySession(apiAs);
    test.skip(!client, 'no role credentials configured');
    test.skip(!eventId, 'GALLERY_EVENT_ID not configured');

    const res = await client!.get(`/api/gallery/events/${eventId}/days`, {
      headers: { 'X-Event-Token': 'not-a-real-jwt' },
    });
    expect(res.status()).toBe(401);
  });

  // R26 — loadMore guard (pinned fix): the viewer must never request
  // `/days/undefined/photos`. Driven through the real UI.
  test('R26 — viewer never requests an undefined day', async ({ authedPage }) => {
    test.skip(!eventId || !eventPw, 'GALLERY_EVENT_ID/PASSWORD not configured');
    // Unlock needs an authenticated guest-or-above browser session.
    const page = (await authedPage('ADMIN')) || (await authedPage('STUDIO')) || (await authedPage('DEALER'));
    test.skip(!page, 'no role credentials configured');

    const badRequests: string[] = [];
    page!.on('request', req => {
      if (/\/days\/undefined\/photos/.test(req.url())) badRequests.push(req.url());
    });

    await page!.goto(`/products/aistudio/aigallery/${eventId}`);
    await page!.locator('input[type="password"]').fill(eventPw!);
    await page!.locator('input[type="password"]').locator('xpath=following::button[1]').click();
    await page!.waitForLoadState('networkidle');
    // Nudge any lazy-loading.
    await page!.mouse.wheel(0, 4000);
    await page!.waitForTimeout(1500);

    expect(badRequests, `undefined-day requests: ${badRequests.join(', ')}`).toHaveLength(0);
  });

  // R25 / R27 are data-shape dependent (a day with >40 photos for infinite
  // scroll; an event with undated photos for the Unclassified tab). They need a
  // seeded fixture event to be deterministic — left as explicit TODOs so they
  // are visible rather than silently missing.
  test.fixme('R25 — infinite scroll appends without duplicate/undefined day request', async () => {});
  test.fixme('R27 — unclassified tab shows undated photos with correct counts', async () => {});
});
