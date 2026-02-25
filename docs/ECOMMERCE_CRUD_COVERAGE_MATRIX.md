# Ecommerce CRUD Coverage Matrix

This matrix tracks runtime coverage for seller-facing ecommerce entities across API contracts and UI surfaces.

## Entity coverage (API + permissions)

| Entity | Create | Read | Update | Delete | List | Filter | Search | Permission checks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `products` | `POST /api/products` | `GET /api/products/:id` | `PUT/PATCH /api/products/:id` | `DELETE /api/products/:id` | `GET /api/products` | `category` query | `q` query (name) | `x-user-id` scoped in list/read/update/delete + conflict checks (`row_version`) |
| `orders` | `POST /api/orders` | `GET /api/orders/:id` | `PUT /api/orders/:id` | `DELETE /api/orders/:id` | `GET /api/orders` | `status` query | `q` query (buyer name/email) | `x-user-id` scoped in list/read/update/delete + conflict checks (`row_version`) |
| `order_items` | via `POST /api/orders` item payload | nested via order reads | N/A (update through order workflow) | cascading via order delete | nested list via order reads | inherited from order filters | inherited from order search | inherited from parent `orders` permission scope |

## UI surface coverage

| UI surface | Entity usage | Endpoints | Optimistic updates | Rollback behavior | Conflict-safe edit behavior |
| --- | --- | --- | --- | --- | --- |
| `components/seller/product-manager.tsx` | products | list/create/update/delete endpoints under `/api/products*` | create, status-edit, delete mutate local state before network completion | restores previous SWR cache snapshot on failed mutation and revalidates | sends `row_version`/`If-Match` and handles `409 VERSION_CONFLICT` |
| `components/seller/inventory-manager.tsx` | products | list/update/delete endpoints under `/api/products*` | inline stock save + delete are applied optimistically | restores prior cache snapshot on failure and revalidates | sends `row_version`/`If-Match` and handles conflict failures |
| `components/seller/order-manager.tsx` | orders | list/update endpoint usage under `/api/orders*` | status edits are applied optimistically in list + detail panel | restores prior cache snapshot and selected order state on failure | sends `row_version` and handles `409 VERSION_CONFLICT` |

## Notes

- `order_items` remain append-only through order creation and are intentionally represented as nested child records.
- Conflict-safe edits are implemented with `row_version` checks so stale clients cannot silently overwrite newer changes.
