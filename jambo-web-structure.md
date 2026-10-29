# jambo-web — structure

Frontend for Jambo MJ. One Next.js app serving both audiences, split by route
group rather than by codebase.

---

## Why one app

Buyers and producers see completely different screens, so two apps is tempting.
It is the wrong first move.

One app gives you one auth system, one cookie, one deployment, one domain, and
shared components — the pool card renders on both sides. It also handles the
case where a user is both, which will happen: a restaurant that also produces
something. Roughly 40% of the work of maintaining two.

Two apps buys clean separation, independent deploys, and no chance of leaking
producer UI through a routing bug. Worth it eventually. Amazon, Uber, Shopify
and Faire all run separate apps per audience — and every one of them started as
a single app and split once the pain justified it. Split when it hurts.

---

## Navigation

### Buyer (Marie)

| Item | Route | Notes |
|---|---|---|
| Dashboard | `/dashboard` | Landing. What is filling, closing soon, arriving. |
| Open pools | `/pools` | Browse. Filter by product or producer. |
| Orders | `/orders` | Tabs: Active / History. **Not two nav items.** |
| My stores | `/stores` | Required — an order cannot be placed without a store. |
| Invoices | `/invoices` | Empty until Stripe. Where a bookkeeper looks. |
| Settings | `/settings` | Profile, password, language, notification prefs. |

Plus a notification bell in the header: pool reached its minimum, pool closes in
48 hours, order shipped. Without these the app only works if she remembers to
open it.

### Producer (Luc)

| Item | Route | Notes |
|---|---|---|
| Dashboard | `/producer` | Open pools, volumes, what needs confirming. |
| My pools | `/producer/pools` | All statuses. Create from here. |
| My products | `/producer/products` | Catalogue, including deactivated. |
| Settings | `/producer/settings` | Company profile, contact, lead time. |

### Admin (Jambo staff — you)

Do not treat this as the small third role. Marie opens the app twice a week,
Luc opens it when he wants to sell something, **you open it every day**. Jambo
is not a passive marketplace — Jambo buys the pallet, books the freight, files
the customs entry and chases the 3PL. The buyer and producer sides are the
storefront. Admin is where the business actually runs.

| Item | Route | Notes |
|---|---|---|
| Operations | `/admin` | The daily cockpit. See below. |
| Pools | `/admin/pools` | Every pool, every producer, every status. |
| Orders | `/admin/orders` | Everything committed, across all buyers. |
| Producers | `/admin/producers` | Directory. Provision new accounts, edit profiles. |
| Buyers | `/admin/buyers` | Support: who they are, their stores, their history. |
| Money | `/admin/money` | Collected, owed to producers, margin per pool. |

**Operations** is the screen that does not exist yet and matters most. It is a
work queue, not a dashboard:

- pools closing in the next 48 hours — will they make their minimum?
- pools at `threshold_met` a producer has not confirmed yet — chase them
- pools just moved to `procured` — purchase order to send, freight to book
- shipments in transit — customs cleared? landed at the 3PL?
- arrived — split, labelled, out for delivery?
- payment collected but goods not delivered — the exposure list

### The schema gap this exposes

Once a pool reaches `procured`, the database goes silent. There is no record of
the purchase order to the producer, the freight booking, the customs entry, the
3PL handoff, or the delivery confirmation. Today `procured` means "the producer
said yes" and everything after that lives in your head and your inbox.

That is fine for pool number one and untenable by pool number ten. It needs a
`shipments` table (or a fulfilment state machine on `pools`) before the admin
operations screen can be built for real. Until then, admin can only be
read-only views over data that already exists — still worth having, still much
better than psql, but not the whole job.

**Order of work:** build the read-only admin views now, because they are cheap
and you need them immediately. Design the fulfilment schema before building the
operations queue, because building a UI over a data model that does not exist
yet is how you end up with a UI you have to throw away.

---

## Directory layout

```
jambo-web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              root shell, fonts, providers
│   │   ├── page.tsx                redirect by role
│   │   │
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── change-password/page.tsx   the password wall
│   │   │
│   │   ├── (buyer)/
│   │   │   ├── layout.tsx          buyer nav shell
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── pools/
│   │   │   │   ├── page.tsx        browse
│   │   │   │   └── [id]/page.tsx   detail + join
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx        active / history tabs
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── stores/page.tsx
│   │   │   ├── invoices/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   └── (producer)/
│   │       ├── layout.tsx          producer nav shell
│   │       ├── producer/
│   │       │   ├── page.tsx        dashboard
│   │       │   ├── pools/
│   │       │   │   ├── page.tsx
│   │       │   │   ├── new/page.tsx
│   │       │   │   └── [id]/page.tsx   participants + confirm
│   │       │   ├── products/page.tsx
│   │       │   └── settings/page.tsx
│   │       │
│   │       └── (admin)/
│   │           ├── layout.tsx      admin shell — guard on role === 'admin'
│   │           └── admin/
│   │               ├── page.tsx    operations queue
│   │               ├── pools/page.tsx
│   │               ├── orders/page.tsx
│   │               ├── producers/
│   │               │   ├── page.tsx
│   │               │   └── new/page.tsx    provision a producer
│   │               ├── buyers/page.tsx
│   │               └── money/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                     shadcn components land here
│   │   ├── pool-card.tsx           the core object — browse grid
│   │   ├── pool-progress.tsx       the fill bar, used in three places
│   │   ├── status-badge.tsx        one component, every status string
│   │   ├── join-pool-form.tsx      quantity + store picker
│   │   └── nav.tsx                 role-aware sidebar
│   │
│   ├── lib/
│   │   ├── api.ts                  fetch wrapper — credentials: 'include'
│   │   ├── types.ts                mirrors the backend DTOs
│   │   └── format.ts               money and dates
│   │
│   └── styles/globals.css
│
├── .env.local.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

Route groups `(auth)`, `(buyer)`, `(producer)` are parentheses on purpose: they
group files and give each group its own layout **without appearing in the URL**.
`/(buyer)/dashboard/page.tsx` serves `/dashboard`, not `/buyer/dashboard`.

---

## Three things that will bite

**Cookies.** Auth is an httpOnly cookie with `SameSite=Lax`, and the API already
sets `Access-Control-Allow-Origin: http://localhost:3000` with credentials
enabled. Every request must send `credentials: 'include'` — omit it and you get
401s that look exactly like a broken login. That is why `lib/api.ts` exists: one
wrapper, set it once, never think about it again.

Server Components cannot reach the browser cookie jar automatically. For any
server-side fetch you must forward the cookie header manually.

**NUMERIC arrives as a string.** `current_volume` comes back as `"140.00"`, not
`140`. That is `pg` preserving decimal precision on purpose, because JS floats
cannot represent decimals exactly. Never `Number()` a money value and add it —
format it for display, and let Postgres do arithmetic. `lib/format.ts` is where
that discipline lives.

**Bilingual.** Gatineau is majority francophone. Retrofitting i18n into a built
app is miserable; adding `next-intl` on day one costs almost nothing. Wire it up
before writing screens, even if French strings come later.

---

## Colour

Neutral surfaces, one signal colour, green reserved for actions.

| Use | Value | Why |
|---|---|---|
| Pool fill bar | `#D85A30` terracotta | Carries no prior meaning, so it can mean exactly one thing: how full the pool is. |
| Fill track | `#F1EFE8` | |
| Primary action | green | "Join pool" is a go-action; green earns its meaning on buttons. |
| Everything else | greyscale | Colour is scarce so the numbers dominate. |

Green is deliberately **not** the progress bar. Green means success everywhere in
software, so a green bar at 20% full says "this is fine" when it is not.

---

## Build order

Nine screens for a first version, tracing the money:

1. Login
2. Browse pools
3. Pool detail
4. Join flow
5. My orders
6. Producer: my pools
7. Producer: pool detail with confirm
8. Admin: all pools — read-only, one table, every status
9. Admin: all orders — read-only

The two admin screens are cheap: no new endpoints beyond what exists, no
writes, no state. They replace typing psql queries into a terminal, which you
will otherwise be doing every day.

Deferred: store CRUD (seed manually), product CRUD (add via API), producer
profile editing, admin provisioning (curl until the producer directory exists),
and the entire operations queue until the fulfilment schema is designed.

Build **pool detail first**, not login. It is the screen that has to be
persuasive, it is where every design decision gets tested, and you can hardcode
a fake pool object while you iterate. Login is boring and can wait until the app
is worth logging into.
