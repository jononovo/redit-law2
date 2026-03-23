"use client";

import { useState, useCallback } from "react";
import { Bell, Check, CheckCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  bot_id: string | null;
  is_read: boolean;
  created_at: string;
}

function typeIcon(type: string) {
  switch (type) {
    case "purchase":
      return "💳";
    case "balance_low":
      return "⚠️";
    case "suspicious":
      return "🚨";
    case "topup_completed":
      return "💰";
    case "wallet_activated":
      return "🎉";
    case "topup_request":
      return "📩";
    default:
      return "🔔";
  }
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function NotificationPopover() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: countData } = useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications/unread-count");
      if (!res.ok) return { count: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const { data: notifsData, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/v1/notifications?limit=20");
      if (!res.ok) return { notifications: [] };
      return res.json();
    },
    enabled: open,
    refetchInterval: open ? 15000 : false,
  });

  const markRead = useMutation({
    mutationFn: async (ids: number[]) => {
      await fetch("/api/v1/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      await fetch("/api/v1/notifications/read-all", {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["unread-count"] });
    },
  });

  const unreadCount = countData?.count || 0;
  const notifications: Notification[] = notifsData?.notifications || [];

  const handleMarkOne = useCallback(
    (id: number) => {
      markRead.mutate([id]);
    },
    [markRead]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full relative text-neutral-500 hover:text-neutral-900"
          data-testid="button-notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center border-2 border-white"
              data-testid="badge-unread-count"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 p-0 rounded-2xl shadow-xl border border-neutral-100"
        sideOffset={8}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <h3 className="font-semibold text-neutral-900 text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80 h-7 px-2"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
              data-testid="button-mark-all-read"
            >
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center text-neutral-400 text-sm" data-testid="text-no-notifications">
              No notifications yet
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors",
                  !n.is_read && "bg-primary/[0.03]"
                )}
                data-testid={`notification-item-${n.id}`}
              >
                <span className="text-lg mt-0.5 shrink-0">{typeIcon(n.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        !n.is_read ? "font-semibold text-neutral-900" : "text-neutral-600"
                      )}
                    >
                      {n.title}
                    </p>
                    {!n.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 text-neutral-400 hover:text-primary"
                        onClick={() => handleMarkOne(n.id)}
                        data-testid={`button-mark-read-${n.id}`}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">{n.body}</p>
                  <p className="text-[10px] text-neutral-400 mt-1">{timeAgo(n.created_at)}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {notifications.length > 0 && (
          <div className="px-4 py-2 border-t border-neutral-100 text-center">
            <span className="text-xs text-neutral-400">
              Showing latest {notifications.length} notifications
            </span>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
