# Entity and Model Registry

| Model/value        | Persistence                   | Purpose                                                                             |
| ------------------ | ----------------------------- | ----------------------------------------------------------------------------------- |
| `Perfume`          | Database                      | Sellable perfume content, publication, merchandising, and recommendation attributes |
| `PerfumeVariant`   | Database; child of Perfume    | Stable size, price, and available quantity                                          |
| `Customer`         | Database                      | Current customer identity, contact, and delivery details                            |
| `Order`            | Database                      | Customer reference, totals, reference, confirmation access, and lifecycle           |
| `OrderItem`        | Database; child of Order      | Variant, ordered quantity, and immutable placed price                               |
| `OrderStatusEvent` | Database; child of Order      | Designed status activity history                                                    |
| `Cart`             | Client storage                | Versioned set of selected variant identifiers and quantities                        |
| `CartItem`         | Client storage; child of Cart | `perfumeVariantId` and `quantity` only                                              |
| `PerfumeStatus`    | Enum                          | `DRAFT`, `PUBLISHED`                                                                |
| `ScentCharacter`   | Enum                          | `FRESH`, `WARM`, `SWEET`, `WOODY`                                                   |
| `Occasion`         | Enum                          | `EVERYDAY`, `WORK`, `DATE_NIGHT`, `SPECIAL_OCCASION`                                |
| `TimeOfDay`        | Enum                          | `DAY`, `NIGHT`                                                                      |
| `OrderStatus`      | Enum                          | `NEW`, `CONFIRMED`, `AWAITING_PAYMENT`, `CANCELLED`                                 |

Recommendation attributes are enum arrays on Perfume; multiple selections are allowed. `Either` is a public no-filter choice, not persisted data.

`Customer.whatsappNumber` is normalized and unique; `Customer.email` is optional, normalized, and unique when present. Delivery state, city, and address belong to Customer rather than Order. `Order.stockRestoredAt` is the one-time cancellation-restoration marker.

Exact properties and transactional rules are defined in `documentation/system/domain-data-contracts.md`.
