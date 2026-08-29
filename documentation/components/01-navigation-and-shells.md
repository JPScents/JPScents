# Navigation and Shells

## Identity

| Field   | Value                                                                                   |
| ------- | --------------------------------------------------------------------------------------- |
| Type    | Shared component family                                                                 |
| Sources | Workspace `Navigation & Shells`; all Final Site and Final Admin frames                  |
| Access  | Public shell and protected Admin shell                                                  |
| Purpose | Provide consistent navigation, cart visibility, responsive menus, and layout ownership. |

## Data and domain

- **Entities:** Cart; authenticated Admin session.
- **Displayed:** JPScents identity, public links, cart quantity, Admin links, sign-in state, date, View Store.
- **Derived:** cart badge is the sum of CartItem quantities.
- **Configuration:** public/Admin route registry, brand name, store URL.

## Operations

| Kind  | Requirement              | Trigger/result                                  |
| ----- | ------------------------ | ----------------------------------------------- |
| Read  | Resolve local cart count | Header render and cart changes                  |
| Read  | Resolve Admin session    | Protect Admin shell and display signed-in state |
| Write | None                     | Menus and cart preview are local UI state       |

## Components

- **Reused:** `PublicHeader`, `MobilePublicHeader`, `CartUtility`, `PublicFooter`, `AdminSidebar`, `AdminTopbar`, `MobileAdminHeader`.
- **Local:** page titles and breadcrumbs remain page-owned.
- **Variants/states:** active navigation, zero/non-zero badge, menu open/closed, authenticated/loading/unauthorized.
- **Ownership:** public and Admin shells share tokens/primitives, not one conditional mega-shell.

## Behaviour and presentation

- Public wordmark links Home; navigation contains Perfumes and Help Me Choose; Cart utility opens preview rather than navigating directly.
- Desktop public navigation is centred; mobile keeps wordmark, Menu, and Cart visible.
- Desktop Admin uses a fixed 248px sidebar plus topbar; mobile replaces both with a compact Admin header/menu.
- Menus close on navigation and Escape and return focus to their trigger.

## Quality

- Use semantic navigation landmarks, current-page indication, labelled icon buttons, keyboard-operable menus, focus containment, and adequate touch targets.
- Do not expose Admin content before authorization completes.

## Decisions

- **Confirmed:** public and Admin shells are distinct shared application components.
- **Assumed:** mobile menus use accessible shadcn Sheet/Drawer composition.
- **Open:** final authentication provider and the missing visual reference for an open mobile menu.

## Approval

- [ ] Included in Freeman's consolidated foundation approval
