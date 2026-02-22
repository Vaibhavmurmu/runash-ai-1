import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShoppingCart, Heart } from "lucide-react"

interface StreamProductsProps {
  streamId: string
}

export default function StreamProducts({ streamId }: StreamProductsProps) {
  const products = [
    {
      id: 1,
      name: "AI Smart Home Hub",
      description: "Control your entire home with voice commands and AI-powered automation.",
      price: 129.99,
      originalPrice: 159.99,
      discount: 20,
      image: "/placeholder.svg?height=120&width=120",
      featured: true,
    },
    {
      id: 2,
      name: "Wireless Earbuds Pro",
      description: "Premium sound quality with active noise cancellation and AI voice assistant.",
      price: 89.99,
      originalPrice: 119.99,
      discount: 25,
      image: "/placeholder.svg?height=120&width=120",
    },
    {
      id: 3,
      name: "Ultra HD Webcam",
      description: "Crystal clear video with AI-powered lighting and background adjustments.",
      price: 79.99,
      originalPrice: 99.99,
      discount: 20,
      image: "/placeholder.svg?height=120&width=120",
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Featured Products</h2>
        <Button variant="link" className="text-orange-500 dark:text-orange-400">
          View All
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <Card key={product.id} className={product.featured ? "border-orange-200 dark:border-orange-800/30" : ""}>
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-zinc-100 dark:bg-zinc-800">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                  {product.featured && (
                    <Badge className="absolute top-1 left-1 bg-orange-500 text-[10px]">Featured</Badge>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="mb-2 text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-bold text-orange-600 dark:text-orange-400">${product.price}</span>
                    <span className="text-sm line-through text-muted-foreground">${product.originalPrice}</span>
                    <Badge variant="outline" className="text-xs text-orange-600 dark:text-orange-400">
                      {product.discount}% OFF
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2 p-4 pt-0">
              <Button className="flex-1 bg-orange-500 hover:bg-orange-600">
                <ShoppingCart className="mr-2 h-4 w-4" /> Add to Cart
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Heart className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
