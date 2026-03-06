B2B Admin Dashboard — Implementation Plan

project must use strict typescript, must be responsively designed for mobile tablet and desktop devices. The backend is the most inportant right now, please focus on that over everything, and then once that is created to a minimally viable condition move to the front end. We plan to iterate numerous times. This iteration is wholly focused / or has a primary objective set; of ensuring and implementing proper robust, comprehensive backend  logic. At which point we will connect that to the front end  back end logic mostly all provided . 

### Phase 0: Database Setup

- Apply the schema migration (`202603050001_init_schema.sql`): create `products`, `addresses`, `cart_items`, `orders`, `order_items`, and `price_tiers` tables with all indexes
- Apply RLS policies (`202603050002_rls_policies.sql`) for secure access
- Apply the `create_order_atomic` RPC (`202603050003_order_rpc.sql`)
- Apply the inventory movements table + trigger from the provided SQL
- Apply the `get_tiered_price` function for Phase 2 readiness

### Phase 1: Edge Functions (4 functions)

- `**admin-products-upsert**` — Create/update products with SKU uniqueness, MOQ ≥ 1, price ≥ 0 validation
- `**admin-products-set-active**` — Soft enable/disable products
- `**admin-inventory-adjust**` — Atomic stock adjustment with negative-stock guard
- `**admin-order-set-status**` — Update order status (pending → paid → processing → shipped → cancelled → refunded)
- Shared CORS headers module (`_shared/cors.ts`)
- All functions use `SUPABASE_SERVICE_ROLE_KEY` for writes

### Phase 2: Admin UI — Layout & Auth Guard

- Responsive sidebar navigation: **Overview**, **Catalog**, **Stock**, **Sales**
- Session-based auth guard — redirect unauthenticated users to login
- Login page with Supabase Auth (email/password)
- Mobile-friendly: collapsible sidebar with hamburger menu

### Phase 3: Dashboard (Overview) Page

- **Recent Orders** card: last 7 days, showing order number, total, status, date
- **Pending Orders** count badge
- **Low Stock Alerts**: products with stock < 10, sorted ascending
- Color-coded status badges (orange=pending, blue=processing, green=shipped, red=cancelled)

### Phase 4: Products (Catalog) Page

- Searchable table (SKU/name) with 25-per-page pagination
- Columns: SKU, Name, Price, MOQ, Stock, Active status, Last Updated
- Active/Inactive toggle calling `admin-products-set-active`
- Create/Edit product modal calling `admin-products-upsert`
- Mobile: cards layout instead of table

### Phase 5: Inventory (Stock) Page

- Products sorted by `stock_quantity` ascending (lowest stock first)
- Search by SKU/name, 50-per-page pagination
- **Quick Adjust** button on each row → opens dialog with +/- delta input and reason field
- Calls `admin-inventory-adjust` edge function
- Visual indicators for critical stock levels (red < 5, orange < 10)

### Phase 6: Orders (Sales) Pages

- **Orders List**: filterable by status dropdown + date range pickers, paginated
- Joined address data (city/state) shown in table
- **Order Detail** page: full order summary with shipping address, line items table (SKU, product name, qty, unit price, line total), and status change dropdown calling `admin-order-set-status`

### UI Patterns Throughout

- Loading skeletons on all data fetches
- Toast notifications for success/error using the standard `{ error: { code, message } }` shape
- Empty states with helpful messages
- Consistent color-coded status badges across all views