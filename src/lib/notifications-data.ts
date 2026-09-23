// Notification system data. Kept separate from abraaj-data.ts the same way
// mosque-data.ts is, since notifications are their own self-contained domain
// (id, type, read state) rather than catalog content.

export type NotificationType = "order" | "subscription" | "delivery" | "promo" | "system";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
};

// Seed data covering the categories asked for: orders, subscriptions,
// delivery updates, plus promo/system so the list doesn't read as one-note.
export const initialNotifications: AppNotification[] = [
  {
    id: "n1",
    type: "delivery",
    title: "Delivery on the way",
    message: "Order #AB-1042 is out for delivery and should arrive within 30 minutes.",
    time: "10m ago",
    read: false,
  },
  {
    id: "n2",
    type: "order",
    title: "Order confirmed",
    message: "We've received your order for 2× 5 Gallon Bottle. We'll notify you once it ships.",
    time: "1h ago",
    read: false,
  },
  {
    id: "n3",
    type: "subscription",
    title: "Subscription renewed",
    message: "Your bi-weekly plan was renewed. Next delivery is scheduled for Thursday.",
    time: "3h ago",
    read: false,
  },
  {
    id: "n4",
    type: "promo",
    title: "New offer unlocked",
    message: "Get 15% off your next 5 Gallon refill this week only.",
    time: "Yesterday",
    read: true,
  },
  {
    id: "n5",
    type: "delivery",
    title: "Delivery completed",
    message: "Order #AB-1031 was delivered. Enjoy your water!",
    time: "2d ago",
    read: true,
  },
  {
    id: "n6",
    type: "system",
    title: "Payment method updated",
    message: "Your default card ending in 4321 was saved successfully.",
    time: "3d ago",
    read: true,
  },
];
