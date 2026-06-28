# Post-Deployment Test Plan (Playwright)

> Functional verification to run after every Coolify deployment.
> Two suites: **Sanity** (fast, blocking — must pass before a release is
> considered live) and **Regression** (broad, run after sanity passes).
>
> Scope is end-to-end against the deployed stack (nginx gateway → services →
> Neon/Supabase). These are **test-case definitions**, not the Playwright code.

---

## 0. Conventions & setup

### Test roles (seed/known accounts)

| Alias | Role | Used for |
|-------|------|----------|
| `ADMIN` | `ADMIN` | Photolab admin console, invoices, migrations |
| `STUDIO` | `STUDIO` | Studio dashboard, lab orders, customer orders |
| `DEALER` | `DEALER` | Dealer ordering (regression cross-checks) |
| `GUEST` | unauthenticated / event-token | Gallery viewer |

### Auth

- App uses **HttpOnly JWT cookies**. Playwright should log in through the real
  login form (or a storage-state fixture captured per role) — do not fake tokens,
  since cookie + `credentials: include` is part of what's under test.
- Capture one `storageState` per role in `global-setup` to keep suites fast.

### Environment

- Run against the deployed gateway URL (single origin; all `/api/*` routed by nginx).
- Treat data as **production-like** — prefer create-then-clean or uniquely-named
  test records (e.g. customer name `PW-<timestamp>`) over destructive assertions.
- Tag tests: `@sanity`, `@regression`. CI runs `--grep @sanity` first as a gate.

### Severity / suite mapping

- **Sanity** = "is the deployment alive and are the money/critical paths working?"
  Small, deterministic, no deep edge cases. Target < 3 min.
- **Regression** = "did this release break any previously-working behavior?"
  Covers status machines, RBAC, edge cases, recently-changed areas.

---

## 1. SANITY SUITE (`@sanity`)

Blocking. If any fails, the deployment is **not** healthy — investigate before
announcing release.

| # | Area | Test case | Steps | Expected |
|---|------|-----------|-------|----------|
| S1 | Health | Gateway & services up | `GET /api/orders/health` (and each service health route) | `200`, `{status: "healthy"}` per service |
| S2 | App shell | SPA loads | Navigate to `/` | Home page renders, no console errors, nav header visible |
| S3 | Auth | Admin login | Log in as `ADMIN` via form | Redirected to admin area; session cookie set; protected route reachable |
| S4 | Auth | Studio login | Log in as `STUDIO` | `/studio` loads with the 4-tab dashboard header |
| S5 | Auth | Unauthenticated guard | Hit `/studio` with no session | "Access Restricted" message (not a crash) |
| S6 | Orders | Order list loads | As `ADMIN`, open Orders tab | Orders table renders; status badges shown |
| S7 | Studio orders | Customer Orders tab fetches | As `STUDIO`, open **Customer Orders** tab | List loads via `GET /api/studio-orders`; **no "Error connecting to service" toast** (regression guard for the nginx route) |
| S8 | Studio orders | Create customer order | Fill customer name + one line item, submit | `201`; order appears in "Awaiting Payment"; persists after reload |
| S9 | Invoices | Invoices tab loads | As `ADMIN`, open Invoices | Confirmed / Paid / Invoiced sections render without error |
| S10 | Gallery | Admin gallery loads | As `ADMIN`, open Gallery | Event list renders; password reveal field present |
| S11 | Gallery | Event unlock (guest) | Open a known event, enter correct password | Event token issued; day tabs + photos load |

---

## 2. REGRESSION SUITE (`@regression`)

Run after sanity passes. Grouped by feature. Emphasis on the order status
machine, RBAC scoping, and the areas changed in recent releases (studio
dashboard, studio customer orders, gallery face clustering, password
encryption, event-token scoping).

### 2.1 Order status machine (photolab)

| # | Test case | Steps | Expected |
|---|-----------|-------|----------|
| R1 | Studio-placed order starts PENDING | As `STUDIO`, place a lab order | New order status = `PENDING` |
| R2 | Admin-placed order starts CONFIRMED | As `ADMIN`, place an order on a partner's behalf | Status = `CONFIRMED` (not PENDING) |
| R3 | Confirm transition | Admin moves PENDING → CONFIRMED | Badge updates; event published |
| R4 | Record payment → PAID | Admin records payment on a CONFIRMED order | Status → `PAID`; violet "Paid" badge; appears in Invoices → Paid Orders |
| R5 | Invoice gate before payment | Attempt invoice download on a CONFIRMED (unpaid) order | `400` — "Invoice can only be generated after payment is recorded" |
| R6 | First invoice download → INVOICED | Download invoice on a PAID order | PDF returned; status → `INVOICED` (one-time transition) |
| R7 | Re-download stays INVOICED | Download invoice again on INVOICED order | PDF returned every time; status remains `INVOICED` (button never disables) |
| R8 | INVOICED is terminal | Confirm no UI path moves INVOICED backward | No regression to PAID/CONFIRMED |
| R9 | Cancel path | Cancel a PENDING/CONFIRMED order | Status → `CANCELLED`; excluded from active flows |
| R10 | Removed statuses | Verify SHIPPED/DELIVERED no longer offered | No such options in UI; enum rejects them |

### 2.2 Studio customer orders (new DB-backed feature)

| # | Test case | Steps | Expected |
|---|-----------|-------|----------|
| R11 | Create with multiple line items | Submit order with 2+ items | `total` = Σ(qty×price); items persisted |
| R12 | Mark paid | `PATCH /studio-orders/{id}/pay` via UI | Status CONFIRMED → PAID; moves to Paid section |
| R13 | Delete | Delete a customer order | `204`; row removed; gone after reload |
| R14 | Studio scoping (RBAC) | As `STUDIO`, attempt to read/create/pay/delete another studio's order id | `403` for cross-studio; own list auto-scoped to `sub` |
| R15 | Validation | Submit item with qty 0 or price ≤ 0 | `422` (Pydantic `gt=0`); UI surfaces error |
| R16 | Persistence | Create order, hard-refresh | Order still listed (DB, not localStorage) |

### 2.3 RBAC / authorization

| # | Test case | Steps | Expected |
|---|-----------|-------|----------|
| R17 | Non-admin order scoping | As `STUDIO`, `GET /api/orders` | Only own orders returned |
| R18 | Admin-only routes | As `STUDIO`/`DEALER`, hit admin route (e.g. gst PUT, migrate, invoice download) | `403` |
| R19 | Studio-or-admin gate | As `DEALER`, hit `/api/studio-orders` | `403` (role not in ADMIN/STUDIO) |
| R20 | Unauthenticated API | Call protected endpoint with no cookie | `401` |

### 2.4 Gallery — viewer & event tokens

| # | Test case | Steps | Expected |
|---|-----------|-------|----------|
| R21 | Wrong password | Unlock event with bad password | `403` "Incorrect event password" |
| R22 | Event token scoping | Use event A's token on event B's `/days` etc. | `403` (sub mismatch enforced) |
| R23 | **Full-photo lightbox** (fix verification) | With a valid event token, open a photo via `/api/gallery/photos/{photo_id}/full` | `200` signed URL — **not** 403 (regression guard for the event_id=0 fix) |
| R24 | Event token expiry | Token older than 72h | `401` invalid/expired |
| R25 | Day pagination | Scroll a day with > 40 photos | Infinite scroll appends; no duplicate/`undefined` day request |
| R26 | Empty/no-active-day guard | Load event state where no day is resolved yet | No malformed `/days/undefined/photos` call (regression guard for loadMore fix) |
| R27 | Unclassified photos | Open an event with undated photos | Unclassified tab shows; counts correct |

### 2.5 Gallery — admin & face clustering

| # | Test case | Steps | Expected |
|---|-----------|-------|----------|
| R28 | Password encryption round-trip | Create event with password, reveal it in admin list | Revealed plaintext matches input (Fernet decrypt); `password_encrypted` never sent to client |
| R29 | Update password | Change event password, unlock with new one | Old password fails, new succeeds |
| R30 | Queue clustering | Click "Run Face Clustering" | Status → `queued`; upload button disabled while clustering |
| R31 | Progress polling | While processing | `clustering-status` returns done/total; progress bar advances |
| R32 | Completion toast | Clustering finishes | "Face clustering completed!" toast; people sidebar populates |
| R33 | Person POV filter | Select a person in the sidebar | Grid filters to that person's photos; "Clear Filter" restores day view |
| R34 | Remove clustering | Click "Remove Clustering", confirm | `event_people` cleared; status → `idle`; sidebar empties |

### 2.6 Studio dashboard (tabbed UI)

| # | Test case | Steps | Expected |
|---|-----------|-------|----------|
| R35 | Tab switching | Click each of Analytics / Lab Orders / Customer Orders / AI Studio | Correct panel renders; no remount errors |
| R36 | Lab order placement + history | Place a lab order from Lab Orders tab | Appears in history with studio-friendly status label (CONFIRMED→"In Progress", PAID→"Completed", INVOICED→"Received") |
| R37 | Analytics totals | Open Analytics with known orders | Stat cards + total spend reflect order data |
| R38 | AI Studio nav | Click hero in AI Studio tab | Navigates to `/products/aistudio/aigallery` |
| R39 | Legacy redirect | Visit `/products/studioai` | Redirects to `/products/aistudio` |

### 2.7 Admin invoices UI states

| # | Test case | Steps | Expected |
|---|-----------|-------|----------|
| R40 | Confirmed section | Confirmed orders shown as "Awaiting Payment" | Record-payment action only; no invoice button |
| R41 | Paid section | Paid orders listed | "Generate Invoice" enabled (violet) |
| R42 | Invoiced section | Invoiced orders listed | "Download Again" present; row click opens detail; action click doesn't trigger row click (stopPropagation) |
| R43 | Guest order | Guest order in confirmed list | "Guest — no ledger" shown; no payment button |

---

## 3. Suite execution order (CI)

```
1. global-setup        → capture storageState per role, health preflight (S1)
2. npx playwright test --grep @sanity      (BLOCKING gate)
3. npx playwright test --grep @regression  (runs only if sanity green)
4. teardown            → remove PW-* test records created during the run
```

> Sanity gates the deploy; regression catches behavioral drift. Keep R23 and
> R26 in regression permanently — they pin the two bugs fixed in the most recent
> review (event-token full-photo 403, and the `loadMore` undefined-day request).

---

## 4. Not covered here (call out explicitly)

- **Payment gateway / real money movement** — none in app; nothing to test.
- **RabbitMQ/Redis internals** — covered indirectly via clustering status (R30–R32), not directly asserted.
- **PDF visual correctness** — R6/R7 assert a PDF is returned and status transitions, not pixel layout. Add a snapshot test later if invoice layout regressions become a concern.
- **Load/performance** — out of scope for functional post-deploy checks.
