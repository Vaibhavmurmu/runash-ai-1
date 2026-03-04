'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Download, Share2, Bookmark } from 'lucide-react';

export function ClipsLibrary() {
  const clips = [
    {
      id: 1,
      title: 'Discount Code Reveal',
      creator: 'StyleGuru',
      duration: '0:45',
      views: 8500,
      category: 'Promo',
      emoji: '💰',
    },
    {
      id: 2,
      title: 'Product Highlight',
      creator: 'FashionReview',
      duration: '1:23',
      views: 6200,
      category: 'Feature',
      emoji: '⭐',
    },
    {
      id: 3,
      title: 'Customer Testimonial',
      creator: 'LiveMarket',
      duration: '0:58',
      views: 4100,
      category: 'Social Proof',
      emoji: '👍',
    },
    {
      id: 4,
      title: 'Quick Tutorial',
      creator: 'TechGuru',
      duration: '2:15',
      views: 12300,
      category: 'Educational',
      emoji: '📚',
    },
    {
      id: 5,
      title: 'Behind the Scenes',
      creator: 'StyleStudio',
      duration: '1:42',
      views: 7800,
      category: 'Behind The Scenes',
      emoji: '🎬',
    },
    {
      id: 6,
      title: 'Limited Offer Clip',
      creator: 'ShopLive',
      duration: '0:52',
      views: 9600,
      category: 'Limited Time',
      emoji: '⏰',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {clips.map((clip) => (
          <Card
            key={clip.id}
            className="overflow-hidden hover:shadow-lg hover:border-orange-500/50 transition"
          >
            <div className="relative h-40 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-4xl group">
              {clip.emoji}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Button size="sm" variant="ghost" className="text-white">
                  <Play className="h-6 w-6 fill-white" />
                </Button>
              </div>

              <div className="absolute top-2 left-2 right-2 flex justify-between items-start">
                <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                  {clip.category}
                </Badge>
                <Badge variant="secondary" className="bg-white/20 text-white text-xs">
                  {clip.duration}
                </Badge>
              </div>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold">{clip.title}</h3>
                <p className="text-sm text-muted-foreground">by {clip.creator}</p>
                <p className="text-xs text-muted-foreground mt-1">{clip.views.toLocaleString()} views</p>
              </div>

              <div className="flex gap-2">
                <Button size="sm" className="flex-1 gap-1 bg-orange-600 hover:bg-orange-700">
                  <Play className="h-4 w-4" />
                  Play
                </Button>
                <Button size="sm" variant="outline" className="px-3 bg-transparent">
                  <Download className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="px-3 bg-transparent">
                  <Share2 className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" className="px-3 bg-transparent">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
