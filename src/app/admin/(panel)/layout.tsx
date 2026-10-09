import Link from "next/link";
import { Plus } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { ToastProvider } from "@/components/admin/ToastProvider";
import { AdminNotifier } from "@/components/admin/AdminNotifier";
import { cookies } from "next/headers";
import { NOTIFY_CLEARED_COOKIE } from "@/config/site";

export const dynamic = "force-dynamic";

/** Every admin page is protected here (in addition to the proxy and per-action checks). */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  // "Clear all" in the bell stores the time in a cookie, so the badge is right on the first render.
  const clearedRaw = (await cookies()).get(NOTIFY_CLEARED_COOKIE)?.value;
  const clearedAt = clearedRaw && !Number.isNaN(Date.parse(clearedRaw)) ? new Date(clearedRaw) : null;
  const since = clearedAt ? { createdAt: { gt: clearedAt } } : {};
  const [bookings, messages, bellBookings, bellMessages] = await Promise.all([
    prisma.bookingInquiry.count({ where: { status: "NEW", archived: false } }),
    prisma.contactMessage.count({ where: { status: "NEW" } }),
    prisma.bookingInquiry.count({ where: { status: "NEW", archived: false, ...since } }),
    prisma.contactMessage.count({ where: { status: "NEW", ...since } }),
  ]);

  return (
    <div className="min-w-0 lg:pl-72">
      <AdminSidebar counts={{ bookings, messages }} />
      <header className="sticky top-0 z-30 flex h-16 items-center justify-end gap-3 border-b border-cream-200 bg-white/95 pr-4 pl-16 backdrop-blur-sm sm:pr-6 lg:pl-6" style={{ viewTransitionName: "admin-header" }}>
        {/* The front-desk action is always one click away. */}
        <Link
          href="/admin/reservations/new"
          className="mr-auto inline-flex min-h-10 items-center gap-2 rounded-md bg-clay-600 px-4 text-sm font-semibold text-white hover:bg-clay-700 lg:mr-0"
        >
          <Plus size={17} aria-hidden /> New Reservation
        </Link>
        <AdminNotifier initialCount={bellBookings + bellMessages} initialClearedAt={clearedAt?.toISOString() ?? null} />
        <p className="hidden text-sm text-muted md:block">
          Signed in as <span className="font-medium text-ink">{admin.name}</span>
        </p>
        {/* Log out is visually separated from the primary action. */}
        <LogoutButton />
      </header>
      <main id="main" className="admin-main mx-auto min-w-0 max-w-6xl px-4 py-8 sm:px-6">
        <ToastProvider>{children}</ToastProvider>
      </main>
    </div>
  );
}
