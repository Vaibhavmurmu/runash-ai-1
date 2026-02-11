import { one, queryMany, sql } from "@/lib/db"

export type Product = {
  id: string
  user_id: string
  name: string
  description: string | null
  price: number
  category: string | null
  image_url: string | null
  in_stock: boolean
  featured: boolean
  sales_count: number
  inventory_count: number
  created_at?: string
  updated_at?: string
}

// List products (optionally scoped by user)
export async function listProducts(userId?: string): Promise<Product[]> {
  if (userId) {
    return queryMany<Product>(`select * from products where user_id=$1 order by updated_at desc, created_at desc`, [
      userId,
    ])
  }
  return queryMany<Product>(`select * from products order by updated_at desc, created_at desc`)
}

// Get a product by id
export async function getProduct(id: string): Promise<Product | null> {
  return one<Product>(sql<Product[]>`select * from products where id=${id} limit 1`)
}

// Create a product
export async function createProduct(userId: string, input: Partial<Product>): Promise<Product> {
  const rows = await sql<Product[]>`
    insert into products
      (user_id, name, description, price, category, image_url, in_stock, featured, sales_count, inventory_count)
    values
      (
        ${userId},
        ${input.name ?? "Untitled"},
        ${input.description ?? null},
        ${input.price ?? 0},
        ${input.category ?? "General"},
        ${input.image_url ?? null},
        ${input.in_stock ?? true},
        ${input.featured ?? false},
        ${input.sales_count ?? 0},
        ${input.inventory_count ?? 0}
      )
    returning *
  `
  return rows[0]
}

// Update a product
export async function updateProduct(id: string, input: Partial<Product>): Promise<Product | null> {
  const current = await getProduct(id)
  if (!current) return null
  const rows = await sql<Product[]>`
    update products
    set
      name=${input.name ?? current.name},
      description=${input.description ?? current.description},
      price=${input.price ?? current.price},
      category=${input.category ?? current.category},
      image_url=${input.image_url ?? current.image_url},
      in_stock=${input.in_stock ?? current.in_stock},
      featured=${input.featured ?? current.featured},
      sales_count=${input.sales_count ?? current.sales_count},
      inventory_count=${input.inventory_count ?? current.inventory_count},
      updated_at=now()
    where id=${id}
    returning *
  `
  return rows[0] ?? null
}

// Delete a product
export async function deleteProduct(id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`delete from products where id=${id} returning id`
  return rows.length > 0
}
