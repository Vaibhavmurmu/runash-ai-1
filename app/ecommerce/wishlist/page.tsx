"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, Share2, Trash2, ShoppingCart } from "lucide-react";
import {
  useCommerceCartActions,
  useWishlistData,
} from "@/hooks/use-commerce-data";

export default function WishlistPage() {
  const router = useRouter();
  const { data: wishlistItems, loading, error, removeItem } = useWishlistData();
  const { addItemToCart } = useCommerceCartActions();

  const totalSavings = useMemo(
    () =>
      wishlistItems.reduce(
        (acc, item) => acc + (item.originalPrice - item.price),
        0,
      ),
    [wishlistItems],
  );

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">Loading wishlist...</div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-red-600">{error}</div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-bold sm:text-3xl">My Wishlist</h1>
          <p className="mt-2 text-sm text-muted-foreground sm:text-base">
            {wishlistItems.length} items saved
          </p>
        </div>

        {wishlistItems.length === 0 ? (
          <Card className="p-12 text-center space-y-4">
            <p className="text-4xl">💭</p>
            <p className="text-muted-foreground">Your wishlist is empty</p>
            <Button
              className="bg-orange-600 hover:bg-orange-700"
              onClick={() => router.push("/grocery")}
            >
              Start Shopping
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              {wishlistItems.map((item) => (
                <Card
                  key={item.id}
                  className="p-4 hover:border-orange-500/50 transition"
                >
                  <div className="flex flex-col gap-4 sm:flex-row">
                    <div className="relative flex h-28 w-full items-center justify-center rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 text-5xl sm:h-32 sm:w-32 sm:shrink-0">
                      {item.emoji}
                      {!item.inStock && (
                        <Badge className="absolute top-2 right-2 bg-red-600">
                          Out of Stock
                        </Badge>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-3">
                      <div>
                        <h3 className="text-base font-semibold sm:text-lg">
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Added {item.addedDate}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <span className="text-lg font-bold text-orange-500 sm:text-xl">
                          ${item.price.toFixed(2)}
                        </span>
                        <span className="text-sm line-through text-muted-foreground">
                          ${item.originalPrice.toFixed(2)}
                        </span>
                        <Badge
                          variant="secondary"
                          className="bg-green-500/10 text-green-700"
                        >
                          Save ${(item.originalPrice - item.price).toFixed(2)}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        <Button
                          size="sm"
                          className="min-w-[132px] gap-1 bg-orange-600 hover:bg-orange-700"
                          disabled={!item.inStock}
                          onClick={() => addItemToCart(item)}
                        >
                          <ShoppingCart className="h-4 w-4" />
                          Add to Cart
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-w-[96px] gap-1 bg-transparent"
                        >
                          <Share2 className="h-4 w-4" />
                          Share
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => removeItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card className="sticky bottom-2 space-y-3 border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-600/10 p-4 sm:bottom-3 sm:space-y-4 sm:p-6 lg:top-4 lg:bottom-auto">
                <h3 className="text-base font-semibold sm:text-lg">
                  Wishlist Summary
                </h3>
                <div className="space-y-2 text-sm sm:space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-medium">{wishlistItems.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">In Stock</span>
                    <span className="font-medium">
                      {wishlistItems.filter((i) => i.inStock).length}
                    </span>
                  </div>
                  <div className="border-t border-orange-500/20 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total Savings</span>
                      <span className="font-bold text-green-600">
                        ${totalSavings.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full gap-1 bg-orange-600 hover:bg-orange-700"
                  onClick={() =>
                    wishlistItems
                      .filter((item) => item.inStock)
                      .forEach((item) => addItemToCart(item))
                  }
                >
                  <ShoppingCart className="h-4 w-4" />
                  Add All to Cart
                </Button>
              </Card>

              <Card className="space-y-3 p-4 sm:space-y-4 sm:p-6">
                <h3 className="text-base font-semibold sm:text-lg">
                  Wishlist Actions
                </h3>
                <div className="flex flex-col gap-2 sm:gap-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Share Wishlist
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start bg-transparent"
                  >
                    <Heart className="h-4 w-4 mr-2" />
                    Export List
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
