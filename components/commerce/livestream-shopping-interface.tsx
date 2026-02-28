'use client';

import { useState } from 'react';
import { MessageCircle, Heart, Share2, ShoppingCart, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LiveStreamShoppingProps {
  streamTitle: string;
  host: string;
  viewers: number;
}

export function LiveStreamShoppingInterface({
  streamTitle = 'Premium Fashion Collection',
  host = 'Sarah Chen',
  viewers = 5243,
}: LiveStreamShoppingProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<number>(0);
  const [liked, setLiked] = useState(false);

  const featuredProducts = [
    {
      id: '1',
      name: 'Premium Silk Blouse',
      price: 89.99,
      image: '/placeholder.jpg',
      stock: 23,
      sales: 142,
    },
    {
      id: '2',
      name: 'Classic Denim Jacket',
      price: 129.99,
      image: '/placeholder.jpg',
      stock: 15,
      sales: 89,
    },
    {
      id: '3',
      name: 'Summer Linen Dress',
      price: 79.99,
      image: '/placeholder.jpg',
      stock: 31,
      sales: 256,
    },
    {
      id: '4',
      name: 'Leather Accessories Pack',
      price: 49.99,
      image: '/placeholder.jpg',
      stock: 8,
      sales: 65,
    },
  ];

  const liveComments = [
    { user: 'Alex M.', message: 'Love this blouse! Ordering now', timestamp: '30s ago' },
    { user: 'Jordan P.', message: 'Does it come in blue?', timestamp: '1m ago' },
    { user: 'Casey T.', message: 'Amazing quality!', timestamp: '2m ago' },
    { user: 'Riley K.', message: 'Already sold out the jacket 😭', timestamp: '3m ago' },
  ];

  const addToCart = (productId: string) => {
    setCartItems(cartItems + 1);
    setSelectedProduct(null);
  };

  return (
    <div className="bg-gradient-to-br from-slate-950 to-slate-900 rounded-lg overflow-hidden border border-slate-800">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-orange-700 p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-bold text-lg text-white mb-1">{streamTitle}</h3>
            <p className="text-sm text-orange-100">
              Hosted by {host} • {viewers.toLocaleString()} watching
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setLiked(!liked)}
              className={`p-2 rounded-lg transition-all ${
                liked ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Heart className="w-5 h-5" fill={liked ? 'currentColor' : 'none'} />
            </button>
            <button className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white/20 rounded-full h-1 overflow-hidden">
            <div className="bg-white h-full w-2/3 animate-pulse" />
          </div>
          <span className="text-xs font-medium text-white">LIVE</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
        {/* Featured Products */}
        <div className="lg:col-span-2">
          <h4 className="font-semibold text-white mb-3 text-sm uppercase tracking-wide">
            Featured Products
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((product) => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product.id)}
                className="bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:border-orange-500 border border-slate-700 transition-all hover:shadow-lg hover:shadow-orange-500/20"
              >
                <div className="relative overflow-hidden h-32 bg-slate-700">
                  <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover hover:scale-110 transition-transform"
                  />
                  {product.stock <= 10 && (
                    <div className="absolute top-2 right-2 bg-red-600 px-2 py-1 rounded text-xs font-bold text-white">
                      Only {product.stock} left
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-semibold text-white line-clamp-2 mb-1">
                    {product.name}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-orange-400">${product.price}</span>
                    <span className="text-xs text-slate-400">{product.sales} sold</span>
                  </div>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product.id);
                    }}
                    className="w-full mt-2 bg-orange-600 hover:bg-orange-700 text-white text-sm h-8"
                  >
                    Add to Cart
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Chat */}
        <div className="lg:col-span-1 flex flex-col bg-slate-800 rounded-lg overflow-hidden border border-slate-700">
          <div className="bg-slate-900 p-3 border-b border-slate-700 flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-orange-400" />
            <h4 className="font-semibold text-white text-sm">Live Chat</h4>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-80">
            {liveComments.map((comment, idx) => (
              <div key={idx} className="text-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-orange-400">{comment.user}</span>
                  <span className="text-xs text-slate-500">{comment.timestamp}</span>
                </div>
                <p className="text-slate-300 text-xs">{comment.message}</p>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div className="border-t border-slate-700 p-3 bg-slate-900">
            <input
              type="text"
              placeholder="Say something nice..."
              className="w-full bg-slate-800 text-white text-sm placeholder-slate-500 border border-slate-700 rounded px-3 py-2 focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="bg-slate-900 border-slate-800 max-w-md w-full">
            <div className="relative">
              <button
                onClick={() => setSelectedProduct(null)}
                className="absolute top-3 right-3 z-10 bg-slate-800 p-2 rounded-lg hover:bg-slate-700"
              >
                <X className="w-4 h-4 text-white" />
              </button>
              <img
                src={featuredProducts.find((p) => p.id === selectedProduct)?.image || "/placeholder.svg"}
                alt="Product"
                className="w-full h-64 object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-bold text-white mb-2">
                {featuredProducts.find((p) => p.id === selectedProduct)?.name}
              </h3>
              <p className="text-slate-400 mb-4">Perfect item featured in today's livestream</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-3xl font-bold text-orange-400">
                  ${featuredProducts.find((p) => p.id === selectedProduct)?.price}
                </span>
                <span className="text-sm text-slate-400">
                  {featuredProducts.find((p) => p.id === selectedProduct)?.sales} sold today
                </span>
              </div>
              <div className="mb-4">
                <label className="text-sm text-slate-300 block mb-2">Size</label>
                <select className="w-full bg-slate-800 border border-slate-700 text-white p-2 rounded mb-3">
                  <option>Select size</option>
                  <option>XS</option>
                  <option>S</option>
                  <option>M</option>
                  <option>L</option>
                  <option>XL</option>
                </select>
              </div>
              <Button
                onClick={() => addToCart(selectedProduct)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold h-10 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Cart ({cartItems} items)
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

export default LiveStreamShoppingInterface;
