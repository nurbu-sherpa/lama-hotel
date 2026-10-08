import Link from "next/link";
import { AdminPageTitle } from "@/components/admin/ui";
import { RoomForm } from "@/components/admin/RoomForm";

export const metadata = { title: "Add room type" };

export default function NewRoomPage() {
  return (
    <>
      <Link href="/admin/rooms" className="inline-flex min-h-10 items-center text-sm font-semibold text-clay-700">
        ← All rooms
      </Link>
      <AdminPageTitle title="Add room type" description="You can add photos after creating the room." />
      <RoomForm />
    </>
  );
}
