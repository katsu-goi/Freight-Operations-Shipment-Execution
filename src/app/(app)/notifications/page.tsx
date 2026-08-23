import { requireProfile } from "@/lib/auth";
import { listNotifications } from "@/lib/repos/notifications";
import NotificationsList from "./NotificationsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications — Airship Express" };

export default async function NotificationsPage() {
  await requireProfile();
  const notifications = await listNotifications(100);
  return <NotificationsList notifications={notifications} />;
}
