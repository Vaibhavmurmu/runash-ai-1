import { queryMany } from "@/lib/db"

export type GroceryProductRecord = {
  id: string
  name: string
  description: string | null
  price: string | number
  price_inr: string | number | null
  category: string
  subcategory: string | null
  brand: string | null
  images: string[] | null
  in_stock: boolean
  stock_quantity: number
  unit: string
  min_order_quantity: number
  max_order_quantity: number
  is_organic: boolean
  is_fresh_produce: boolean
  tags: string[] | null
  average_rating: string | number
  total_reviews: number
  created_at: string
  updated_at: string
}

export type GroceryCartItemRecord = {
  id: string
  user_id: string
  product_id: string
  quantity: number
  created_at: string
  updated_at: string
  product_name: string
  product_price: string | number
  product_category: string
  stock_quantity: number
  in_stock: boolean
}

export type GroceryProductCreateInput = {
  name: string
  description?: string
  price: number
  priceInr?: number | null
  category: string
  subcategory?: string | null
  brand?: string | null
  images?: string[]
  inStock?: boolean
  stockQuantity?: number
  unit: string
  minOrderQuantity?: number
  maxOrderQuantity?: number
  isOrganic?: boolean
  isFreshProduce?: boolean
  tags?: string[]
}

export type GroceryProductUpdateInput = Partial<GroceryProductCreateInput>

export async function listGroceryProducts(filters: {
  category?: string | null
  search?: string | null
  isOrganic?: boolean
  isFreshProduce?: boolean
  minPrice?: number
  maxPrice?: number
  sortBy: "name" | "price" | "average_rating"
  sortOrder: "asc" | "desc"
  limit: number
  offset: number
}) {
  const clauses: string[] = []
  const params: unknown[] = []

  if (filters.category && filters.category !== "all") {
    params.push(filters.category)
    clauses.push(`category = $${params.length}`)
  }

  if (filters.search) {
    params.push(`%${filters.search.toLowerCase()}%`)
    clauses.push(`(
      LOWER(name) LIKE $${params.length}
      OR LOWER(COALESCE(description, '')) LIKE $${params.length}
      OR EXISTS (
        SELECT 1
        FROM unnest(COALESCE(tags, ARRAY[]::text[])) t
        WHERE LOWER(t) LIKE $${params.length}
      )
    )`)
  }

  if (filters.isOrganic) {
    clauses.push("is_organic = true")
  }

  if (filters.isFreshProduce) {
    clauses.push("is_fresh_produce = true")
  }

  if (typeof filters.minPrice === "number") {
    params.push(filters.minPrice)
    clauses.push(`price >= $${params.length}`)
  }

  if (typeof filters.maxPrice === "number") {
    params.push(filters.maxPrice)
    clauses.push(`price <= $${params.length}`)
  }

  const whereClause = clauses.length > 0 ? `where ${clauses.join(" and ")}` : ""

  params.push(filters.limit)
  const limitParam = `$${params.length}`
  params.push(filters.offset)
  const offsetParam = `$${params.length}`

  const products = await queryMany<GroceryProductRecord>(
    `
      select *
      from grocery_products
      ${whereClause}
      order by ${filters.sortBy} ${filters.sortOrder}, name asc
      limit ${limitParam} offset ${offsetParam}
    `,
    params,
  )

  const countRows = await queryMany<{ count: string }>(
    `
      select count(*)::text as count
      from grocery_products
      ${whereClause}
    `,
    params.slice(0, params.length - 2),
  )

  return {
    products,
    totalProducts: Number.parseInt(countRows[0]?.count ?? "0", 10),
  }
}

export async function listGroceryCategories() {
  return queryMany<{ category: string }>(`select distinct category from grocery_products order by category asc`)
}

export async function getGroceryProductById(productId: string) {
  const rows = await queryMany<GroceryProductRecord>(`select * from grocery_products where id = $1 limit 1`, [productId])
  return rows[0] ?? null
}

export async function createGroceryProduct(input: GroceryProductCreateInput) {
  const rows = await queryMany<GroceryProductRecord>(
    `
      insert into grocery_products
      (name, description, price, price_inr, category, subcategory, brand, images, in_stock, stock_quantity, unit, min_order_quantity, max_order_quantity, is_organic, is_fresh_produce, tags)
      values
      ($1, $2, $3, $4, $5, $6, $7, $8::text[], $9, $10, $11, $12, $13, $14, $15, $16::text[])
      returning *
    `,
    [
      input.name,
      input.description ?? null,
      input.price,
      input.priceInr ?? null,
      input.category,
      input.subcategory ?? null,
      input.brand ?? null,
      input.images ?? [],
      input.inStock ?? true,
      input.stockQuantity ?? 0,
      input.unit,
      input.minOrderQuantity ?? 1,
      input.maxOrderQuantity ?? 10,
      input.isOrganic ?? false,
      input.isFreshProduce ?? false,
      input.tags ?? [],
    ],
  )
  return rows[0]
}

export async function updateGroceryProduct(productId: string, input: GroceryProductUpdateInput) {
  const existing = await getGroceryProductById(productId)
  if (!existing) return null

  const rows = await queryMany<GroceryProductRecord>(
    `
      update grocery_products
      set
        name = $2,
        description = $3,
        price = $4,
        price_inr = $5,
        category = $6,
        subcategory = $7,
        brand = $8,
        images = $9::text[],
        in_stock = $10,
        stock_quantity = $11,
        unit = $12,
        min_order_quantity = $13,
        max_order_quantity = $14,
        is_organic = $15,
        is_fresh_produce = $16,
        tags = $17::text[],
        updated_at = now()
      where id = $1
      returning *
    `,
    [
      productId,
      input.name ?? existing.name,
      input.description ?? existing.description,
      input.price ?? Number(existing.price),
      input.priceInr ?? existing.price_inr,
      input.category ?? existing.category,
      input.subcategory ?? existing.subcategory,
      input.brand ?? existing.brand,
      input.images ?? existing.images ?? [],
      input.inStock ?? existing.in_stock,
      input.stockQuantity ?? existing.stock_quantity,
      input.unit ?? existing.unit,
      input.minOrderQuantity ?? existing.min_order_quantity,
      input.maxOrderQuantity ?? existing.max_order_quantity,
      input.isOrganic ?? existing.is_organic,
      input.isFreshProduce ?? existing.is_fresh_produce,
      input.tags ?? existing.tags ?? [],
    ],
  )

  return rows[0] ?? null
}

export async function deleteGroceryProduct(productId: string) {
  const rows = await queryMany<{ id: string }>(`delete from grocery_products where id = $1 returning id`, [productId])
  return rows.length > 0
}

export async function addToCart(userId: string, productId: string, quantity: number) {
  const rows = await queryMany<GroceryCartItemRecord>(
    `
      with product as (
        select id, name, price, category, stock_quantity, in_stock, min_order_quantity, max_order_quantity
        from grocery_products
        where id = $2
        for update
      ),
      upserted as (
        insert into grocery_cart_items (user_id, product_id, quantity)
        select $1, $2, $3
        from product
        where in_stock = true
          and $3 >= min_order_quantity
          and $3 <= max_order_quantity
          and stock_quantity >= $3
        on conflict (user_id, product_id)
        do update
          set quantity = grocery_cart_items.quantity + excluded.quantity,
              updated_at = now()
        where grocery_cart_items.quantity + excluded.quantity <= (select stock_quantity from product)
          and grocery_cart_items.quantity + excluded.quantity <= (select max_order_quantity from product)
        returning *
      )
      select
        u.id,
        u.user_id,
        u.product_id,
        u.quantity,
        u.created_at,
        u.updated_at,
        p.name as product_name,
        p.price as product_price,
        p.category as product_category,
        p.stock_quantity,
        p.in_stock
      from upserted u
      join grocery_products p on p.id = u.product_id
    `,
    [userId, productId, quantity],
  )

  return rows[0] ?? null
}

export async function updateCartQuantity(userId: string, productId: string, quantity: number) {
  const rows = await queryMany<GroceryCartItemRecord>(
    `
      with product as (
        select id, name, price, category, stock_quantity, in_stock, min_order_quantity, max_order_quantity
        from grocery_products
        where id = $2
        for update
      ),
      updated as (
        update grocery_cart_items c
        set quantity = $3,
            updated_at = now()
        from product p
        where c.user_id = $1
          and c.product_id = $2
          and p.in_stock = true
          and $3 >= p.min_order_quantity
          and $3 <= p.max_order_quantity
          and p.stock_quantity >= $3
        returning c.*
      )
      select
        u.id,
        u.user_id,
        u.product_id,
        u.quantity,
        u.created_at,
        u.updated_at,
        p.name as product_name,
        p.price as product_price,
        p.category as product_category,
        p.stock_quantity,
        p.in_stock
      from updated u
      join grocery_products p on p.id = u.product_id
    `,
    [userId, productId, quantity],
  )

  return rows[0] ?? null
}

export async function removeFromCart(userId: string, productId: string) {
  const rows = await queryMany<{ id: string }>(
    `delete from grocery_cart_items where user_id = $1 and product_id = $2 returning id`,
    [userId, productId],
  )
  return rows.length > 0
}

export async function listCartItems(userId: string) {
  return queryMany<GroceryCartItemRecord>(
    `
      select
        c.id,
        c.user_id,
        c.product_id,
        c.quantity,
        c.created_at,
        c.updated_at,
        p.name as product_name,
        p.price as product_price,
        p.category as product_category,
        p.stock_quantity,
        p.in_stock
      from grocery_cart_items c
      join grocery_products p on p.id = c.product_id
      where c.user_id = $1
      order by c.updated_at desc
    `,
    [userId],
  )
}
