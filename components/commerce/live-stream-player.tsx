'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Settings, Share2, Users, Heart } from 'lucide-react';

export function LiveStreamPlayer() {
  const [volume, setVolume] = useState(80);
  const [isLiked, setIsLiked] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="relative w-full bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="text-6xl">🎬</div>
              <p className="text-white font-semibold">Live Stream Player</p>
            </div>
          </div>

          <div className="absolute top-4 right-4 flex gap-2">
            <Badge className="bg-red-600 animate-pulse">LIVE</Badge>
            <Badge variant="secondary" className="bg-white/20 text-white">
              4K
            </Badge>
          </div>

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-semibold">12,450 watching</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                <Volume2 className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" className="text-white hover:bg-white/20">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <h2 className="text-2xl font-bold">Fashion Week Live - Day 3</h2>
            <p className="text-muted-foreground">Streamed by StyleGuru Studio</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="gap-1 bg-orange-600 hover:bg-orange-700">
              <Users className="h-4 w-4" />
              Follow Channel
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 bg-transparent"
              onClick={() => setIsLiked(!isLiked)}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current text-red-500' : ''}`} />
              {isLiked ? 'Liked' : 'Like'}
            </Button>
            <Button size="sm" variant="outline" className="gap-1 bg-transparent">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          </div>
        </div>

        <Card className="p-4 space-y-3">
          <h3 className="font-semibold">Featured Products</h3>
          <div className="grid grid-cols-3 gap-2">
            {['👗', '👠', '👜'].map((emoji, i) => (
              <Button key={i} variant="outline" className="h-20 text-2xl hover:border-orange-500/50 bg-transparent">
                {emoji}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-4 space-y-3">
        <h3 className="font-semibold">Live Chat</h3>
        <div className="h-48 bg-muted rounded-lg p-3 space-y-2 overflow-y-auto">
          {[
            { user: 'User123', message: 'Love these designs!' },
            { user: 'FashionFan', message: 'Where can I buy?' },
            { user: 'StyleGuru', message: 'Check the featured products!' },
          ].map((chat, i) => (
            <div key={i} className="text-sm">
              <span className="font-semibold text-orange-500">{chat.user}:</span>
              <span className="text-muted-foreground ml-2">{chat.message}</span>
            </div>
          ))}
        </div>
        <input
          type="text"
          placeholder="Send a message..."
          className="w-full px-3 py-2 bg-muted rounded border border-border/40 text-sm"
        />
      </Card>
    </div>
  );
}
