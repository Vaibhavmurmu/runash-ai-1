'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Share2 } from 'lucide-react';
import { useState } from 'react';

export function ShortsCarousel() {
  const [likedShorts, setLikedShorts] = useState<number[]>([]);

  const shorts = [
    {
      id: 1,
      creator: 'StyleTips',
      title: 'Fashion Hack',
      views: 45600,
      likes: 8900,
      emoji: '✨',
    },
    {
      id: 2,
      creator: 'QuickReview',
      title: '30-Second Product Review',
      views: 32100,
      likes: 6200,
      emoji: '⭐',
    },
    {
      id: 3,
      creator: 'DailyStyle',
      title: 'Outfit of the Day',
      views: 28500,
      likes: 5400,
      emoji: '👗',
    },
    {
      id: 4,
      creator: 'TrendAlert',
      title: 'Trending Now',
      views: 51200,
      likes: 9800,
      emoji: '🔥',
    },
    {
      id: 5,
      creator: 'ShoppingTips',
      title: 'Deal Alert',
      views: 38900,
      likes: 7100,
      emoji: '🎁',
    },
    {
      id: 6,
      creator: 'StyleInspo',
      title: 'Styling Tutorial',
      views: 22300,
      likes: 4200,
      emoji: '💡',
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">Vertical short-form content optimized for mobile viewing</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {shorts.map((short) => (
          <Card
            key={short.id}
            className="overflow-hidden hover:border-orange-500/50 transition"
          >
            <div className="relative h-80 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-6xl flex-col gap-4">
              {short.emoji}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4 space-y-2">
                <p className="font-semibold text-white text-sm">{short.title}</p>
                <p className="text-xs text-gray-300">@{short.creator}</p>
              </div>

              <div className="absolute right-3 bottom-16 flex flex-col gap-4">
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 flex-col gap-1 h-auto p-2"
                  onClick={() => {
                    if (likedShorts.includes(short.id)) {
                      setLikedShorts(likedShorts.filter((id) => id !== short.id));
                    } else {
                      setLikedShorts([...likedShorts, short.id]);
                    }
                  }}
                >
                  <Heart
                    className={`h-5 w-5 ${likedShorts.includes(short.id) ? 'fill-red-500 text-red-500' : ''}`}
                  />
                  <span className="text-xs">{short.likes}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 flex-col gap-1 h-auto p-2"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-xs">{Math.floor(short.likes * 0.3)}</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/20 flex-col gap-1 h-auto p-2"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="text-xs">Share</span>
                </Button>
              </div>
            </div>

            <div className="p-3 space-y-2">
              <p className="text-xs text-muted-foreground flex justify-between">
                <span>{(short.views / 1000).toFixed(1)}K views</span>
                <span>{(short.likes / 1000).toFixed(1)}K likes</span>
              </p>
              <Button className="w-full text-xs bg-orange-600 hover:bg-orange-700 h-8">
                Watch Full
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
