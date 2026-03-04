'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Users, Heart } from 'lucide-react';

export function FeaturedStreams() {
  const streams = [
    {
      id: 1,
      title: 'Fashion Week Preview',
      streamer: 'StyleGuru',
      viewers: 12450,
      likes: 3210,
      status: 'LIVE',
    },
    {
      id: 2,
      title: 'Product Launch Event',
      streamer: 'TechReview',
      viewers: 8930,
      likes: 2140,
      status: 'LIVE',
    },
    {
      id: 3,
      title: 'Shopping Haul & Review',
      streamer: 'FashionBlogger',
      viewers: 5640,
      likes: 1890,
      status: 'LIVE',
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold">Featured Live Streams</h2>
        <p className="text-muted-foreground">Watch and shop from live broadcasts</p>
      </div>

      <div className="space-y-3">
        {streams.map((stream) => (
          <Card key={stream.id} className="p-4 hover:border-orange-500/50 transition cursor-pointer">
            <div className="flex gap-4">
              <div className="relative w-32 h-32 rounded-lg bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center flex-shrink-0">
                <Play className="h-8 w-8 text-orange-500" />
                <Badge className="absolute top-2 right-2 bg-red-600">
                  {stream.status}
                </Badge>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-lg">{stream.title}</h3>
                  <p className="text-sm text-muted-foreground">{stream.streamer}</p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4 text-orange-500" />
                    <span>{stream.viewers.toLocaleString()} watching</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Heart className="h-4 w-4 text-orange-500" />
                    <span>{stream.likes.toLocaleString()}</span>
                  </div>
                </div>

                <Button size="sm" className="w-fit bg-orange-600 hover:bg-orange-700">
                  Watch Now
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
