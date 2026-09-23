import { useEffect, useState } from "react";
import { Bell, CheckCheck, Package, Repeat, Sparkles, Trash2, Truck, Wallet, X } from "lucide-react";
import type { AppNotification, NotificationType } from "@/lib/notifications-data";

// Per-type icon + soft accent, reusing the app's existing brand/aqua palette
// instead of introducing new colors.
const TYPE_META: Record<NotificationType, { Icon: typeof Bell; wrap: string; icon: string }> = {
  order: { Icon: Package, wrap: "bg-brand-soft", icon: "text-brand" },
  subscription: { Icon: Repeat, wrap: "bg-aqua-soft", icon: "text-aqua" },
  delivery: { Icon: Truck, wrap: "bg-brand-soft", icon: "text-brand" },
  promo: { Icon: Sparkles, wrap: "bg-aqua-soft", icon: "text-aqua" },
  system: { Icon: Wallet, wrap: "bg-secondary", icon: "text-foreground" },
};

export function NotificationsPanel({
  open,
  onClose,
  notifications,
  onMarkAllRead,
  onClearAll,
  onOpenNotification,
}: {
  open: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onOpenNotification: (id: string) => void;
}) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Close on Escape, same as the Sidebar drawer, and reset the filter each
  // time the panel is freshly opened.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) setFilter("all");
  }, [open]);

  if (!open) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;
  const list = filter === "unread" ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div className="fixed inset-0 z-50">
      <button
        aria-label="Close notifications"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-foreground/45"
      />

      <div className="px-screen absolute top-[max(4.25rem,calc(env(safe-area-inset-top)+3.5rem))] left-1/2 w-full max-w-md -translate-x-1/2">
        <div className="animate-dropdown card-soft flex max-h-[70dvh] w-full flex-col overflow-hidden rounded-3xl shadow-[0_20px_50px_-16px_rgba(13,42,110,0.45)]">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 py-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-f-sm font-extrabold text-foreground">Notifications</h2>
              {unreadCount > 0 && (
                <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-primary-foreground">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              aria-label="Close notifications"
              onClick={onClose}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Filter pills + mark all as read, mirroring the shop category pill style */}
          <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-3">
            <div className="flex gap-1.5">
              {(
                [
                  ["all", "All"],
                  ["unread", "Unread"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-f-2xs font-semibold transition-colors ${
                    filter === key ? "bg-brand text-primary-foreground" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="flex shrink-0 items-center gap-1 text-f-2xs font-bold text-brand"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="no-scrollbar mt-1 flex-1 overflow-y-auto px-2 py-2">
            {list.length === 0 ? (
              <div className="animate-rise px-4 py-10 text-center">
                <div className="bg-aqua-soft mx-auto grid h-14 w-14 place-items-center rounded-full">
                  <Bell className="h-6 w-6 text-brand" />
                </div>
                <p className="mt-3 text-f-sm font-bold text-foreground">
                  {filter === "unread" ? "You're all caught up" : "No notifications yet"}
                </p>
                <p className="mt-1 text-f-2xs text-muted-foreground">
                  {filter === "unread"
                    ? "New order and delivery updates will show up here."
                    : "We'll let you know about orders, subscriptions and deliveries."}
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {list.map((n) => {
                  const { Icon, wrap, icon } = TYPE_META[n.type];
                  return (
                    <li key={n.id}>
                      <button
                        onClick={() => onOpenNotification(n.id)}
                        className={`flex w-full items-start gap-2.5 rounded-2xl px-2.5 py-3 text-left transition-colors ${
                          n.read ? "bg-transparent" : "bg-brand-soft/60"
                        }`}
                      >
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${wrap}`}>
                          <Icon className={`h-4 w-4 ${icon}`} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span
                              className={`truncate text-f-xs ${
                                n.read ? "font-semibold text-foreground" : "font-bold text-foreground"
                              }`}
                            >
                              {n.title}
                            </span>
                            <span className="shrink-0 text-[10px] text-muted-foreground">{n.time}</span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-f-2xs text-muted-foreground">
                            {n.message}
                          </span>
                        </span>
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-hidden="true" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Footer — clear/read-all lives here so it's reachable without scrolling. */}
          {notifications.length > 0 && (
            <div className="shrink-0 border-t border-border/70 px-4 py-3">
              <button
                onClick={onClearAll}
                className="flex w-full items-center justify-center gap-1.5 text-f-2xs font-bold text-muted-foreground"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear all notifications
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
