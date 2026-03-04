import { promises as fs } from "node:fs"
import path from "node:path"

export type WishlistRecord = {
  id: string
  name: string
  price: number
  originalPrice: number
  addedDate: string
  inStock: boolean
  emoji: string
  image?: string
}

export type NotificationRecord = {
  id: string
  type: "delivery" | "promo" | "order" | "alert"
  title: string
  message: string
  timestamp: string
  read: boolean
}

type CommerceUserData = {
  wishlist: WishlistRecord[]
  notifications: NotificationRecord[]
}

type Store = Record<string, CommerceUserData>

const STORE_PATH = path.join(process.cwd(), "data", "commerce-user-data.json")

const defaultData: CommerceUserData = {
  wishlist: [
    {
      id: "1",
      name: "Wireless Earbuds Pro",
      price: 199.99,
      originalPrice: 249.99,
      addedDate: "2024-01-10",
      inStock: true,
      emoji: "🎧",
    },
    {
      id: "2",
      name: "Smart Watch Ultra",
      price: 349.99,
      originalPrice: 399.99,
      addedDate: "2024-01-08",
      inStock: true,
      emoji: "⌚",
    },
  ],
  notifications: [
    {
      id: "1",
      type: "delivery",
      title: "Order Delivered",
      message: "Your order ORD-001234 has been delivered",
      timestamp: "5 minutes ago",
      read: false,
    },
    {
      id: "2",
      type: "promo",
      title: "Flash Sale Alert",
      message: "20% off on Wireless Earbuds - Limited time offer",
      timestamp: "2 hours ago",
      read: false,
    },
  ],
}

async function ensureStore() {
  try {
    await fs.access(STORE_PATH)
  } catch {
    await fs.mkdir(path.dirname(STORE_PATH), { recursive: true })
    await fs.writeFile(STORE_PATH, JSON.stringify({ "1": defaultData }, null, 2), "utf-8")
  }
}

export async function readStore(): Promise<Store> {
  await ensureStore()
  const raw = await fs.readFile(STORE_PATH, "utf-8")
  return JSON.parse(raw) as Store
}

export async function writeStore(store: Store) {
  await fs.writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf-8")
}

export async function getCommerceUserData(userId: string): Promise<CommerceUserData> {
  const store = await readStore()
  return store[userId] ?? defaultData
}

export async function updateCommerceUserData(userId: string, updater: (current: CommerceUserData) => CommerceUserData) {
  const store = await readStore()
  const nextData = updater(store[userId] ?? defaultData)
  store[userId] = nextData
  await writeStore(store)
  return nextData
}
