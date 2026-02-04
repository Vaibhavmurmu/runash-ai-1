# Drizzle ORM Expansion 
- Setup Guide

## Overview

Phase 2 extends the authentication system with a complete Drizzle ORM implementation, including:
- Comprehensive database schema (14+ tables)
- Type-safe query utilities and repositories
- Database hooks for client components
- Migration management tools
- Admin dashboard for database operations

## Installation & Setup

### 1. Install Dependencies

\`\`\`bash
npm install drizzle-orm @neondatabase/serverless drizzle-kit
\`\`\`

### 2. Environment Variables

Verify these are set in your Vercel project:

\`\`\`
DATABASE_URL=postgresql://...       # Your PostgreSQL connection
MIGRATION_SECRET=your-secret-key    # For securing admin endpoints
\`\`\`

### 3. Generate Drizzle Client

The Drizzle client is automatically created in `lib/drizzle.ts` with:
- Neon HTTP driver for serverless execution
- Schema definitions from `db/schema.ts`
- Type-safe query builder

### 4. Create Database Tables

There are two approaches:

**Option A: Using Drizzle Kit (Recommended)**
\`\`\`bash
npx drizzle-kit generate
npx drizzle-kit migrate
\`\`\`

**Option B: Via Admin Dashboard**
1. Go to `/admin/db`
2. Click "Refresh Status" to check connection
3. This will show missing tables
4. Create them manually using your database UI

### 5. Seed Sample Data (Optional)

\`\`\`bash
curl -X POST http://localhost:3000/api/db/seed \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET"
\`\`\`

Or use the admin dashboard at `/admin/db`

## File Structure

\`\`\`
├── db/
│   ├── schema.ts                 # Complete database schema
│   └── migrations/               # Migration files (auto-generated)
├── lib/
│   ├── drizzle.ts               # Drizzle client setup
│   ├── db-utils.ts              # Common query utilities
│   ├── db-admin.ts              # Admin utilities
│   └── repositories/
│       ├── products.ts          # Product queries
│       ├── orders.ts            # Order queries
│       ├── reviews.ts           # Review queries
│       └── messages.ts          # Message queries
├── hooks/
│   ├── use-products.ts          # Product hooks
│   ├── use-orders.ts            # Order hooks
│   ├── use-messages.ts          # Message hooks
│   ├── use-wishlist.ts          # Wishlist hooks
│   └── use-reviews.ts           # Review hooks
├── app/
│   ├── api/
│   │   └── db/
│   │       ├── status/route.ts  # Database status endpoint
│   │       └── seed/route.ts    # Database seeding
│   └── admin/
│       └── db/page.tsx          # Admin dashboard
\`\`\`

## Database Schema

### Authentication (Better Auth)
- `users` - User accounts with roles and metadata
- `sessions` - Active sessions with tokens
- `accounts` - OAuth provider links
- `verification_tokens` - Email verification and password reset

### E-Commerce
- `products` - Product catalog with inventory
- `orders` - Customer orders with totals
- `order_items` - Individual items in orders
- `reviews` - Product reviews and ratings

### Communication
- `messages` - Direct messages with read status
- `conversations` - Message groups
- `notifications` - User notifications

### Additional
- `wishlist` - User saved items
- `events` - Analytics tracking
- `auth_feature_flags` - Feature flag configuration

## Usage Examples

### Server-Side (API Routes, Server Components)

\`\`\`typescript
import { ProductRepository } from "@/lib/repositories/products"

// Get product
const product = await ProductRepository.findById(productId)

// Search products
const results = await ProductRepository.findByCategory("Electronics")

// Create product
const newProduct = await ProductRepository.create({
  name: "New Product",
  price: "99.99",
  userId: currentUser.id,
  // ... other fields
})
\`\`\`

### Client-Side (React Components)

\`\`\`typescript
import { useProducts, useFeaturedProducts } from "@/hooks/use-products"
import { useOrders } from "@/hooks/use-orders"

export function ProductList() {
  const { products, isLoading } = useProducts("Electronics")

  return (
    <div>
      {isLoading ? "Loading..." : products.map(p => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  )
}
\`\`\`

### Creating API Routes

All database hooks work with `/api/` routes. Example:

\`\`\`typescript
// app/api/products/route.ts
import { ProductRepository } from "@/lib/repositories/products"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get("category")

  const products = await ProductRepository.findByCategory(category || "", 20)
  return Response.json({ products })
}

export async function POST(req: Request) {
  const data = await req.json()
  const product = await ProductRepository.create(data)
  return Response.json({ product }, { status: 201 })
}
\`\`\`

## Best Practices

### 1. Always Use Repositories
Never query the database directly from components. Use repositories:
\`\`\`typescript
// Good
const product = await ProductRepository.findById(id)

// Avoid
const product = await db.query.products.findFirst(...)
\`\`\`

### 2. Type Safety
All queries are type-safe through Drizzle:
\`\`\`typescript
// TypeScript will catch errors
const user = await db.query.users.findFirst({
  where: eq(schema.users.email, "user@example.com")
  // IDE autocomplete for all fields
})
\`\`\`

### 3. Use Hooks for Client Components
\`\`\`typescript
// In client components, use hooks with SWR
const { products, isLoading } = useProducts()
\`\`\`

### 4. Handle Errors
\`\`\`typescript
try {
  const order = await OrderRepository.create(orderData)
} catch (error) {
  console.error("Failed to create order:", error)
  return Response.json({ error: "Failed to create order" }, { status: 500 })
}
\`\`\`

### 5. Performance
- Use relationships sparingly (they increase query complexity)
- Implement pagination for large datasets
- Cache frequently accessed data with SWR

## Admin Dashboard

Access the database admin dashboard at `/admin/db` to:
- Check database connection status
- View missing tables
- Seed sample data
- View schema information

**Note:** This page should be protected with authentication in production.

## Next Steps

Once Phase 2 is complete and stable:
1. **Phase 3**: Implement Vercel Workflows for automation
2. **Phase 4**: Add real-time communication with Chat SDK
3. **Phase 5**: Implement feature flags for gradual rollout
4. **Phase 6**: Add streaming with Streamdown
5. **Phase 7**: Integrate AI features
6. **Phase 8**: Add citation management with UltraCite

## Troubleshooting

### "Module not found" errors
\`\`\`
npm install drizzle-orm @neondatabase/serverless drizzle-kit uuid bcryptjs
\`\`\`

### Database connection fails
- Verify `DATABASE_URL` is set correctly
- Check Neon dashboard for connection limits
- Try using `POSTGRES_URL_NON_POOLING` for migrations

### Missing tables
Run migrations:
\`\`\`bash
npx drizzle-kit migrate
\`\`\`

Or use the admin dashboard to check and create tables manually.

### Seeding fails
- Ensure `MIGRATION_SECRET` matches in request header
- Check database has all required tables
- Verify Neon/PostgreSQL is running

## Support

For issues:
1. Check `/api/db/status` for database health
2. Review error logs in console
3. Verify environment variables in Vercel dashboard
4. Check Neon/PostgreSQL dashboard for connection issues
