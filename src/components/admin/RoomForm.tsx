import type { Room } from "@prisma/client";
import { createRoom, updateRoom } from "@/server/actions/admin/rooms";
import { AdminForm, SubmitButton } from "./AdminForm";
import { ACheckbox, ASelect, AText, ATextArea } from "./Fields";
import { RichTextEditor } from "./RichTextEditor";
import { Panel } from "./ui";

export function RoomForm({ room }: { room?: Room }) {
  return (
    <AdminForm action={room ? updateRoom : createRoom} className="space-y-6">
      {room && <input type="hidden" name="id" value={room.id} />}

      <Panel title="Room details">
        <div className="grid gap-5 sm:grid-cols-2">
          <AText label="Room name" name="name" defaultValue={room?.name} required maxLength={80} />
          <AText
            label="URL slug"
            name="slug"
            defaultValue={room?.slug}
            optional
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            hint={room ? `Page address: /rooms/${room.slug}. Changing it changes the link.` : "Leave empty to create it from the name."}
          />
          <ATextArea label="Short description" name="shortDescription" defaultValue={room?.shortDescription} rows={2} maxLength={300} optional className="sm:col-span-2" hint="Shown on room cards." />
          <div className="sm:col-span-2">
            <RichTextEditor label="Full description" name="description" defaultValue={room?.description} required />
          </div>
        </div>
      </Panel>

      <Panel title="Price" description="The price is per room. It is never multiplied by the number of guests.">
        <div className="grid gap-5 sm:grid-cols-3">
          <AText label="Price per room" name="price" type="number" inputMode="numeric" min={0} step={1} defaultValue={room?.price ?? ""} required />
          <AText label="Currency" name="currency" defaultValue={room?.currency ?? "NPR"} required maxLength={3} />
          <AText label="Shown after price" name="priceSuffix" defaultValue={room?.priceSuffix ?? "/ room"} hint="e.g. “/ room” or “/ room / night”" />
        </div>
      </Panel>

      <Panel title="Beds, rooms & availability">
        <div className="grid gap-5 sm:grid-cols-2">
          <AText label="Beds" name="bedDescription" defaultValue={room?.bedDescription ?? "Two 4 × 6 ft beds"} required />
          {room ? (
            <div>
              <p className="field-label">Number of rooms of this type</p>
              <p className="rounded-xl border border-cream-200 bg-cream-50 px-3.5 py-2.5 text-sm">
                <strong>{room.totalRooms}</strong> bookable rooms
              </p>
              <p className="field-hint">Counted automatically from the physical rooms below — add, remove or take rooms out of service there.</p>
            </div>
          ) : (
            <AText
              label="Number of physical rooms to create"
              name="initialUnits"
              type="number"
              min={0}
              max={50}
              defaultValue={1}
              required
              hint="Creates rooms named e.g. “Deluxe 1”, “Deluxe 2”. You can rename them later."
            />
          )}
          <AText
            label="Guest note"
            name="capacityDescription"
            defaultValue={room?.capacityDescription}
            optional
            className="sm:col-span-2"
            hint="Optional, informational only — bookings are never rejected by guest number."
          />
          <ASelect label="Availability" name="status" defaultValue={room?.status ?? "AVAILABLE"} hint="“Unavailable” shows a notice on the website but still lets guests send inquiries.">
            <option value="AVAILABLE">Available</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </ASelect>
          <AText label="Sort order" name="sortOrder" type="number" min={0} defaultValue={room?.sortOrder ?? 0} hint="Lower numbers appear first." />
          <ACheckbox label="Featured" name="featured" defaultChecked={room?.featured ?? true} hint="Highlight this room type." className="sm:col-span-2" />
        </div>
      </Panel>

      <Panel title="Search engines (optional)">
        <div className="grid gap-5">
          <AText label="Meta title" name="metaTitle" defaultValue={room?.metaTitle} optional maxLength={120} />
          <ATextArea label="Meta description" name="metaDescription" defaultValue={room?.metaDescription} optional rows={2} maxLength={300} />
        </div>
      </Panel>

      <div className="sticky bottom-4 flex justify-end">
        <SubmitButton className="shadow-lg">{room ? "Save room" : "Create room"}</SubmitButton>
      </div>
    </AdminForm>
  );
}
