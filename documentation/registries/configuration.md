# Application Configuration Registry

| Concern                | Value/rule                                                                           | Status                                    |
| ---------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| Brand                  | JPScents                                                                             | Confirmed                                 |
| Locale                 | `en-NG`                                                                              | Assumed; confirm with client              |
| Currency               | `NGN`, integer minor units                                                           | Assumed; confirm display without decimals |
| Size unit              | `mL` initially                                                                       | Assumed from design                       |
| Payment mode           | Manual after saved Order                                                             | Confirmed                                 |
| WhatsApp destination   | non-secret configured business number                                                | Client dependency                         |
| WhatsApp template      | includes reference and concise Order context                                         | Copy open                                 |
| Order reference        | `JP-` plus collision-safe human-readable value                                       | Prefix/format assumed                     |
| Cart storage           | versioned browser storage key                                                        | Exact key/version implementation detail   |
| Related/result limits  | small designed sets; three related on Product Detail                                 | Product Detail count confirmed            |
| Bestseller             | zero or one eligible Perfume                                                         | Confirmed                                 |
| Featured               | Admin-maintained multiple selection                                                  | Confirmed                                 |
| Public routes          | registry in `routes-and-pages.md`                                                    | Confirmed                                 |
| Recommendation enums   | registry in `entities-and-models.md`                                                 | Mostly confirmed; wording issue open      |
| Order statuses         | `NEW`, `CONFIRMED`, `AWAITING_PAYMENT`, `CANCELLED`                                  | Confirmed from Admin design               |
| Trusted Admin identity | exact JPScents Tally-submitted email plus trusted Supabase `app_metadata.role=admin` | Confirmed from client record              |
| Admin sign-in          | Supabase email magic link; pre-provisioned user only; `/auth/confirm` callback       | Confirmed                                 |
| Initial data           | empty catalogue and Orders; demo fixtures are explicit local opt-in only             | Confirmed                                 |

Secrets and environment-specific credentials never belong in this registry or committed config. The primary and optional secondary Admin emails are identity allowlist values, not passwords or credentials.
