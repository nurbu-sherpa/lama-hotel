import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { prisma } from "@/lib/db";
import { deleteRoom, deleteRoomImage, moveRoomImage, updateRoomImage, uploadRoomImage } from "@/server/actions/admin/rooms";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { AText } from "@/components/admin/Fields";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { MoveButtons } from "@/components/admin/RowActions";
import { RoomForm } from "@/components/admin/RoomForm";
import { RoomUnitsPanel } from "@/components/admin/RoomUnitsPanel";
import { AdminPageTitle, Panel } from "@/components/admin/ui";

export const metadata = { title: "Edit room" };

export default async function EditRoomPage({ params, searchParams }: PageProps<"/admin/rooms/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const room = await prisma.room.findUnique({ where: { id }, include: {
      images: { orderBy: { sortOrder: "asc" } },
      units: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { assignments: true } } } },
      _count: { select: { inquiries: true, reservations: true } },
    } });
  if (!room) notFound();

  return (
    <>
      <Link href="/admin/rooms" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">
        ← All rooms
      </Link>
      <AdminPageTitle
        title={room.name}
        description={sp.created ? "Room created. You can now add photos below." : undefined}
        actions={
          <a href={`/rooms/${room.slug}`} target="_blank" className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cream-300 bg-white px-3 text-sm font-semibold hover:bg-cream-100">
            View on website <ExternalLink size={14} aria-hidden />
          </a>
        }
      />

      <RoomForm room={room} />

      <RoomUnitsPanel roomId={room.id} roomName={room.name} units={room.units} />

      <Panel title="Photos" description="Upload real photos of this room. Until you add some, the website shows a “Room photos coming soon” placeholder." className="mt-8">
        {room.images.length > 0 && (
          <ul className="mb-6 space-y-3">
            {room.images.map((img, i) => (
              <li key={img.id} className="flex flex-col gap-4 rounded-xl border border-cream-200 p-3 sm:flex-row">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-cream-100 sm:w-40">
                  <Image src={img.url} alt={img.alt} fill sizes="160px" className="object-cover" />
                </div>
                <AdminForm action={updateRoomImage} className="grid flex-1 gap-3 sm:grid-cols-2">
                  <input type="hidden" name="id" value={img.id} />
                  <AText label="Description (alt text)" name="alt" defaultValue={img.alt} required />
                  <AText label="Caption" name="caption" defaultValue={img.caption} optional />
                  <div>
                    <SubmitButton variant="outline">Save details</SubmitButton>
                  </div>
                </AdminForm>
                <div className="flex items-start gap-2">
                  <MoveButtons action={moveRoomImage} id={img.id} isFirst={i === 0} isLast={i === room.images.length - 1} label="photo" />
                  <ConfirmDialog action={deleteRoomImage} fields={{ id: img.id }} title="Delete this photo?" description="The photo will be removed from the website." triggerLabel="" />
                </div>
              </li>
            ))}
          </ul>
        )}
        <AdminForm action={uploadRoomImage} resetOnSuccess className="grid gap-4 rounded-xl bg-cream-50 p-4 sm:grid-cols-2">
          <input type="hidden" name="roomId" value={room.id} />
          <div className="sm:row-span-3">
            <ImageUploader required label="New photo" />
          </div>
          <AText label="Description (alt text)" name="alt" required placeholder={`e.g. Two beds in the ${room.name}`} hint="Describe what the photo shows — helps blind visitors and Google." />
          <AText label="Caption" name="caption" optional />
          <div>
            <SubmitButton>Upload photo</SubmitButton>
          </div>
        </AdminForm>
      </Panel>

      <Panel title="Delete room type" className="mt-8 border-red-100">
        <p className="mb-4 text-sm text-muted">
          This removes the room type and its photos from the website.
          {room._count.inquiries > 0 && ` ${room._count.inquiries} existing booking inquiries will keep the room name for your records.`}
        </p>
        <ConfirmDialog
          action={deleteRoom}
          fields={{ id: room.id }}
          title={`Delete “${room.name}”?`}
          description="This cannot be undone. If you only want to stop bookings temporarily, set Availability to “Unavailable” instead."
          triggerLabel="Delete room type"
        />
      </Panel>
    </>
  );
}
