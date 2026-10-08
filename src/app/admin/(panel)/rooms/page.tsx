import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatPrice } from "@/lib/utils/format";
import { moveRoom } from "@/server/actions/admin/rooms";
import { AdminPageTitle, EmptyState, StatusBadge } from "@/components/admin/ui";
import { MoveButtons } from "@/components/admin/RowActions";

export const metadata = { title: "Rooms" };

export default async function AdminRoomsPage() {
  const rooms = await prisma.room.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { images: true } } } });
  const total = rooms.reduce((n, r) => n + r.totalRooms, 0);

  return (
    <>
      <AdminPageTitle
        title="Rooms"
        description={`${total} rooms in ${rooms.length} types. Changing a price here updates the whole website immediately.`}
        actions={
          <Link href="/admin/rooms/new" className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-900">
            <Plus size={16} aria-hidden /> Add room type
          </Link>
        }
      />
      {rooms.length === 0 ? (
        <EmptyState title="No rooms yet" description="Add your first room type." />
      ) : (
        <ul className="space-y-3">
          {rooms.map((r, i) => (
            <li key={r.id} className="flex flex-col gap-4 rounded-lg border border-cream-200 bg-white p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/admin/rooms/${r.id}`} className="text-lg font-semibold text-forest-900 hover:underline">
                    {r.name}
                  </Link>
                  <StatusBadge status={r.status} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  <strong className="text-ink">
                    {formatPrice(r.price, r.currency)} {r.priceSuffix}
                  </strong>{" "}
                  · {r.totalRooms} rooms · {r.bedDescription} · {r._count.images} photos
                </p>
              </div>
              <div className="flex items-center gap-2">
                <MoveButtons action={moveRoom} id={r.id} isFirst={i === 0} isLast={i === rooms.length - 1} label={r.name} />
                <Link href={`/admin/rooms/${r.id}`} className="inline-flex min-h-9 items-center rounded-lg border border-cream-300 px-3 text-sm font-semibold hover:bg-cream-100">
                  Edit
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
