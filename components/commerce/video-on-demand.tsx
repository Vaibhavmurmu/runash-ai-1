'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Clock, Heart, Eye } from 'lucide-react';

export function VideoOnDemand() {
  const videos = [
    {
      id: 1,
      title: 'Summer Collection Haul',
      creator: 'FashionBlogger',
      duration: '24:35',
      views: 12500,
      likes: 3200,
      emoji: '👕',
    },
    {
      id: 2,
      title: 'Product Unboxing Special',
      creator: 'TechReview',
      duration: '18:42',
      views: 8900,
      likes: 2100,
      emoji: '📦',
    },
    {
      id: 3,
      title: 'Behind the Scenes',
      creator: 'StyleGuru',
      duration: '12:15',
      views: 5600,
      likes: 1800,
      emoji: '🎬',
    },
    {
      id: 4,
      title: 'Q&A with Creators',
      creator: 'LiveMarket',
      duration: '45:30',
      views: 15200,
      likes: 4500,
      emoji: '💬',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
        {videos.map((video) => (
          <Card
            key={video.id}
            className="overflow-hidden hover:shadow-lg hover:border-orange-500/50 transition cursor-pointer group"
          >
            <div className="relative h-48 bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center text-5xl overflow-hidden">
              {video.emoji}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                <Button size="lg" variant="ghost" className="text-white">
                  <Play className="h-8 w-8 fill-white" />
                </Button>
              </div>
              <Badge className="absolute top-2 right-2 bg-orange-600">NEW</Badge>
            </div>

            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-semibold line-clamp-1">{video.title}</h3>
                <p className="text-sm text-muted-foreground">{video.creator}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {video.duration}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {(video.views / 1000).toFixed(1)}K
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-3 w-3" />
                    {(video.likes / 1000).toFixed(1)}K
                  </div>
                </div>
              </div>

              <Button className="w-full gap-1 bg-orange-600 hover:bg-orange-700">
                <Play className="h-4 w-4" />
                Watch Now
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
