import { one, queryMany, sql } from "@/lib/db"

export type AppUser = {
  id: string
  email: string
  name: string | null
  role: "user" | "admin"
  password_hash: string
  created_at?: string
  updated_at?: string
}

export async function listUsers(): Promise<AppUser[]> {
  try {
    return queryMany<AppUser>(
      `select id, email, name, role, password_hash, created_at, updated_at from users order by created_at desc`,
    )
  } catch {
    return []
  }
}

export async function getUser(id: string): Promise<AppUser | null> {
  return one<AppUser>(
    sql<
      AppUser[]
    >`select id, email, name, role, password_hash, created_at, updated_at from users where id=${id} limit 1`,
  )
}

export async function createUser(u: Partial<AppUser>): Promise<AppUser> {
  const rows = await sql<AppUser[]>`
    insert into users (email, name, role, password_hash)
    values (${u.email}, ${u.name ?? null}, ${(u.role as any) ?? "user"}, ${u.password_hash ?? ""})
    returning id, email, name, role, password_hash, created_at, updated_at
  `
  return rows[0]
}

export async function updateUser(id: string, u: Partial<AppUser>): Promise<AppUser | null> {
  const current = await getUser(id)
  if (!current) return null
  const rows = await sql<AppUser[]>`
    update users set
      email=${u.email ?? current.email},
      name=${u.name ?? current.name},
      role=${(u.role as any) ?? current.role},
      password_hash=${u.password_hash ?? current.password_hash},
      updated_at=now()
    where id=${id}
    returning id, email, name, role, password_hash, created_at, updated_at
  `
  return rows[0] ?? null
}

export async function deleteUser(id: string): Promise<boolean> {
  const rows = await sql<{ id: string }[]>`delete from users where id=${id} returning id`
  return rows.length > 0
}
