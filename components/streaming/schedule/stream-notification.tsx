"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Calendar, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ScheduledStream } from "@/types/stream-scheduler";

interface StreamNotificationProps {
  stream: ScheduledStream;
  onDismiss: () => void;
  onGoToStudio: (stream: ScheduledStream) => void;
}

export default function StreamNotification({
  stream,
  onDismiss,
  onGoToStudio,
}: StreamNotificationProps) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    const update = () => {
      const starts = new Date(stream.scheduledDate);
      setTimeLeft(
        starts.getTime() <= Date.now()
          ? "Starting now"
          : formatDistanceToNow(starts, { addSuffix: false }),
      );
    };

    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [stream.scheduledDate]);

  return (
    <Card className="p-4 border-l-4 border-l-orange-500 shadow-md animate-slideIn">
      <div className="flex items-start">
        <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-full mr-4 shrink-0">
          <Bell className="h-6 w-6 text-orange-600 dark:text-orange-400" />
        </div>
        <div className="flex-1">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Upcoming Stream</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDismiss}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm font-semibold mt-2">{stream.title}</p>
          <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              Starting in {timeLeft} (
              {new Date(stream.scheduledDate).toLocaleString()})
            </span>
          </div>

          <Button
            onClick={() => onGoToStudio(stream)}
            className="bg-gradient-to-r from-orange-600 to-yellow-500 hover:opacity-90 text-white mt-3"
            size="sm"
          >
            Go to Studio
          </Button>
        </div>
      </div>
    </Card>
  );
}
