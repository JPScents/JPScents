# Relationship Registry

| Relationship                   | Rule                                                                       |
| ------------------------------ | -------------------------------------------------------------------------- |
| Perfume → PerfumeVariant       | One-to-many; at least one orderable variant is required before publication |
| Perfume → recommendation enums | Many selections within each controlled enum group                          |
| Order → OrderItem              | One-to-many; at least one line                                             |
| Order → OrderStatusEvent       | One-to-many chronological activity history                                 |
| OrderItem → PerfumeVariant     | Many-to-one stable reference                                               |
| Cart → CartItem                | One-to-many client-only relationship                                       |
| CartItem → PerfumeVariant      | Many-to-one identifier resolved against current catalogue data             |
| Bestseller → Perfume           | Zero-or-one published, in-stock Perfume globally                           |
| Featured → Perfume             | Zero-to-many; Admin-maintained                                             |

Names, slugs, images, and size labels are not copied into CartItem or OrderItem. `OrderItem.unitPriceMinor` is retained because it is the immutable price agreed when the Order was created.
