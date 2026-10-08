import type { RoomUnit } from "@prisma/client";
import { Ban, CheckCircle2 } from "lucide-react";
import { createRoomUnit, deleteRoomUnit, moveRoomUnit, toggleRoomUnit, updateRoomUnit } from "@/server/actions/admin/rooms";
import { AdminForm, SubmitButton } from "./AdminForm";
import { AText } from "./Fields";
import { ConfirmDialog } from "./ConfirmDialog";
import { MoveButtons } from "./RowActions";
import { Panel } from "./ui";

/** Manage the individual physical rooms of one room type. */
export function RoomUnitsPanel({ roomId, roomName, units }: { roomId: string; roomName: string; units: (RoomUnit & { _count: { assignments: number } })[] }) {
  const active = units.filter((u) => u.active).length;
  return (
    <Panel
      title="Physical rooms"
      description={`${active} bookable ${roomName}${active === 1 ? "" : "s"}. Rename rooms to match your door numbers. Rooms with reservation history can't be deleted — take them out of service instead.`}
      className="mt-8"
    >
      <ul className="space-y-3">
        {units.map((u, i) => (
          <li key={u.id} className={`rounded-xl border p-4 ${u.active ? "border-cream-200" : "border-dashed border-cream-300 bg-cream-50"}`}>
            <div className="flex flex-wrap items-center gap-2">
              <p className="flex-1 font-semibold text-forest-900">
                {u.name} <span className="ml-1 text-xs font-normal text-muted">{u.code}</span>
                {!u.active && <span className="ml-2 rounded-full bg-stone-200 px-2 py-0.5 text-xs font-semibold text-stone-700">Out of service</span>}
              </p>
              <MoveButtons action={moveRoomUnit} id={u.id} isFirst={i === 0} isLast={i === units.length - 1} label={u.name} />
              <AdminForm action={toggleRoomUnit}>
                <input type="hidden" name="id" value={u.id} />
                <SubmitButton variant="outline">
                  {u.active ? <Ban size={15} aria-hidden /> : <CheckCircle2 size={15} aria-hidden />}
                  {u.active ? "Out of service" : "Make bookable"}
                </SubmitButton>
              </AdminForm>
              {u._count.assignments === 0 && (
                <ConfirmDialog action={deleteRoomUnit} fields={{ id: u.id }} title={`Delete ${u.name}?`} description="This permanently removes the room and reduces the room count." triggerLabel="" />
              )}
            </div>
            <details className="mt-2">
              <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-clay-700">Rename / edit</summary>
              <AdminForm action={updateRoomUnit} className="mt-3 grid gap-3 sm:grid-cols-3">
                <input type="hidden" name="id" value={u.id} />
                <AText label="Room name" name="name" defaultValue={u.name} required maxLength={40} />
                <AText label="Code" name="code" defaultValue={u.code} required maxLength={20} />
                <AText label="Notes" name="notes" defaultValue={u.notes} optional maxLength={200} />
                <div className="sm:col-span-3">
                  <SubmitButton>Save</SubmitButton>
                </div>
              </AdminForm>
            </details>
          </li>
        ))}
      </ul>

      <AdminForm action={createRoomUnit} resetOnSuccess className="mt-5 grid gap-3 rounded-xl bg-cream-50 p-4 sm:grid-cols-4 sm:items-end">
        <input type="hidden" name="roomId" value={roomId} />
        <AText label="New room name" name="name" required maxLength={40} placeholder={`e.g. ${roomName.replace(/\s+Room$/, "")} ${units.length + 1}`} />
        <AText label="Code" name="code" required maxLength={20} placeholder="e.g. STD-7" />
        <AText label="Notes" name="notes" optional maxLength={200} />
        <SubmitButton>Add room</SubmitButton>
      </AdminForm>
    </Panel>
  );
}
