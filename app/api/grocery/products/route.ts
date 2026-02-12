import { type NextRequest, NextResponse } from "next/server"
import { groceryProducts, normalizedGroceryProducts } from "@/lib/grocery-products"
import { mapGroceryProductToChatProduct } from "@/lib/chat-product-recommendations"

const sortFieldMap = {
  name: "name",
  price: "price",
  rating: "averageRating",
} as const

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get("category")
    const search = searchParams.get("search")
    const organic = searchParams.get("organic")
    const locallySourced = searchParams.get("locallySourced")
    const minPrice = searchParams.get("minPrice")
    const maxPrice = searchParams.get("maxPrice")
    const sortBy = searchParams.get("sortBy") || "name"
    const format = searchParams.get("format")
    const sortOrder = searchParams.get("sortOrder") || "asc"
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "20")

    const normalizedOrganic = searchParams.get("isOrganic") ?? organic
    const normalizedFreshProduce = searchParams.get("isFreshProduce") ?? locallySourced
    const normalizedSortBy = sortBy in sortFieldMap ? sortFieldMap[sortBy as keyof typeof sortFieldMap] : sortFieldMap.name

    let filteredProducts = [...normalizedGroceryProducts]

    // Apply filters
    if (category && category !== "all") {
      filteredProducts = filteredProducts.filter((product) => product.category.toLowerCase() === category.toLowerCase())
    }

    if (search) {
      const searchLower = search.toLowerCase()
      filteredProducts = filteredProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(searchLower) ||
          product.description.toLowerCase().includes(searchLower) ||
          product.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
      )
    }

    if (normalizedOrganic === "true") {
      filteredProducts = filteredProducts.filter((product) => product.isOrganic)
    }

    if (normalizedFreshProduce === "true") {
      filteredProducts = filteredProducts.filter((product) => product.isFreshProduce)
    }

    if (minPrice) {
      filteredProducts = filteredProducts.filter((product) => product.price >= Number.parseInt(minPrice))
    }

    if (maxPrice) {
      filteredProducts = filteredProducts.filter((product) => product.price <= Number.parseInt(maxPrice))
    }

    // Apply sorting
    filteredProducts.sort((a, b) => {
      const aValue = normalizedSortBy === "name" ? a.name.toLowerCase() : a[normalizedSortBy]
      const bValue = normalizedSortBy === "name" ? b.name.toLowerCase() : b[normalizedSortBy]

      if (sortOrder === "desc") {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
      } else {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
      }
    })

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

    // Get categories for filter options
    const categories = [...new Set(groceryProducts.map((product) => product.category))]

    const products =
      format === "chat"
        ? paginatedProducts
            .map((product) => groceryProducts.find((rawProduct) => rawProduct.id === product.id))
            .filter((product): product is (typeof groceryProducts)[number] => Boolean(product))
            .map(mapGroceryProductToChatProduct)
        : paginatedProducts

    return NextResponse.json({
      products,
      totalProducts: filteredProducts.length,
      totalPages: Math.ceil(filteredProducts.length / limit),
      currentPage: page,
      categories,
      filters: {
        category,
        search,
        organic: normalizedOrganic,
        isOrganic: normalizedOrganic,
        locallySourced: normalizedFreshProduce,
        isFreshProduce: normalizedFreshProduce,
        minPrice,
        maxPrice,
        sortBy: normalizedSortBy,
        sortOrder,
      },
    })
  } catch (error) {
    console.error("Error fetching products:", error)
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, quantity = 1 } = body

    const product = groceryProducts.find((p) => p.id === productId)
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 })
    }

    if (!product.inStock) {
      return NextResponse.json({ error: "Product out of stock" }, { status: 400 })
    }

    // In a real app, you would add to cart in database
    // For now, just return success with product details
    return NextResponse.json({
      success: true,
      message: "Product added to cart",
      product: {
        ...product,
        quantity,
      },
    })
  } catch (error) {
    console.error("Error adding to cart:", error)
    return NextResponse.json({ error: "Failed to add product to cart" }, { status: 500 })
  }
}
