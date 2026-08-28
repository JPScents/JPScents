# Engineering Architecture

## Current foundation

- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, and shadcn/ui.
- `src/app` owns routes, layouts, metadata, boundaries, and composition.
- `src/config` owns typed, non-secret application configuration.
- `src/components/ui` will own shadcn primitives; `src/components/shared` will contain only proven cross-feature application UI.
- Server rendering is the default; interactive client islands remain narrow.

## Platform

- Supabase Postgres is the hosted database.
- Prisma ORM 7 is the application schema, migration, generated-client, and database-connection authority.
- Runtime database traffic uses Supavisor transaction pooling; Prisma CLI migrations use the direct/session connection.
- Supabase Auth protects Admin; trusted `app_metadata` supplies authorization context.
- Supabase Storage owns Admin-managed product images.
- Browser code does not query application tables through the Supabase Data API.

## Feature boundaries

| Feature | Owns | Does not own |
| --- | --- | --- |
| `catalogue` | Perfumes, variants, product discovery, related/featured/bestseller selection, Help Me Choose, Admin perfume management | Cart persistence, checkout, Orders |
| `cart` | Client cart state, persistence, quantities, removal, preview/full-cart presentation | Product truth, stock mutation, Order creation |
| `orders` | Checkout, cart revalidation, Order creation, confirmation, WhatsApp handoff, Admin order operations | Catalogue editing, client cart storage |

Checkout belongs to Orders because its successful result is a persisted Order. Homepage and Admin Overview are route compositions, not additional features.

## Intended source shape

Create folders only when implementation requires them:

```text
src/
  app/                  # public/admin routes and layouts
  components/
    ui/                 # shadcn primitives
    shared/             # proven shared application UI
  features/
    catalogue/
    cart/
    orders/
  db/                   # database client, schema/migrations, seeds
tests/                  # mirrors source ownership
```

Do not create empty actions/services/repositories folders. Start cohesive; split after real pressure appears.

## Dependency direction

```text
routes -> feature public boundaries + shared UI
features -> own internals + shared leaf capabilities
shared UI/capabilities -> no feature workflows
database infrastructure -> no feature workflows
```

Features do not import another feature's internals. Route composition may combine feature outputs. Catalogue provides resolved perfume/variant projections used by Cart and Orders without Cart copying catalogue state.

## Shared UI boundary

- Public and Admin shells are separate shared application components.
- `ModalShell` composes shadcn Dialog and standardizes title, optional description, close control, body, footer/actions, focus behaviour, and responsive sizing.
- Feature-specific modals own their fields, validation, and actions; no generic modal configuration engine.
- Product cards share one data projection but retain explicit Gallery and Catalogue presentations.
- Page-only sections remain local even when visually substantial.

## Infrastructure decisions still required

- final `/admin/login` presentation and the first Admin-user provisioning handoff;
- product-image limits and deletion/retirement rules;
- deployment target;
- exact stock restoration behaviour when an Order is cancelled.
