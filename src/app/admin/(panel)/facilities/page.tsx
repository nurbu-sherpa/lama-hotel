import { prisma } from "@/lib/db";
import { createFacility, deleteFacility, moveFacility, toggleFacility, updateFacility } from "@/server/actions/admin/facilities";
import { AdminForm, SubmitButton } from "@/components/admin/AdminForm";
import { ACheckbox, ASelect, AText } from "@/components/admin/Fields";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MoveButtons, ToggleButton } from "@/components/admin/RowActions";
import { AdminPageTitle, EmptyState, Panel } from "@/components/admin/ui";
import { FACILITY_ICONS, FacilityIcon } from "@/components/shared/icons";

export const metadata = { title: "Facilities" };

function IconSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <ASelect label="Icon" name="icon" defaultValue={defaultValue ?? "check"}>
      {Object.entries(FACILITY_ICONS).map(([key, { label }]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </ASelect>
  );
}

export default async function FacilitiesPage() {
  const facilities = await prisma.facility.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <>
      <AdminPageTitle
        title="Facilities"
        description="Facilities shown on the homepage and room pages. Only add facilities you actually offer — hidden ones are not shown on the website."
      />

      <Panel title="Add a facility" className="mb-6">
        <AdminForm action={createFacility} resetOnSuccess className="grid gap-4 sm:grid-cols-2">
          <AText label="Name" name="name" required maxLength={100} placeholder="e.g. Parking available" />
          <IconSelect />
          <AText label="Short description" name="description" optional maxLength={300} className="sm:col-span-2" />
          <ACheckbox label="Show on website" name="active" defaultChecked />
          <div className="sm:text-right">
            <SubmitButton>Add facility</SubmitButton>
          </div>
        </AdminForm>
      </Panel>

      {facilities.length === 0 ? (
        <EmptyState title="No facilities yet" />
      ) : (
        <ul className="space-y-3">
          {facilities.map((f, i) => (
            <li key={f.id} className={`rounded-lg border bg-white p-4 ${f.active ? "border-cream-200" : "border-dashed border-cream-300 opacity-75"}`}>
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
                  <FacilityIcon name={f.icon} size={20} />
                </span>
                <p className="flex-1 font-semibold text-forest-900">
                  {f.name} {!f.active && <span className="ml-1 text-xs font-normal text-muted">(hidden)</span>}
                </p>
                <MoveButtons action={moveFacility} id={f.id} isFirst={i === 0} isLast={i === facilities.length - 1} label={f.name} />
                <ToggleButton action={toggleFacility} id={f.id} active={f.active} label={f.name} />
                <ConfirmDialog action={deleteFacility} fields={{ id: f.id }} title={`Delete “${f.name}”?`} description="It will be removed from the website." triggerLabel="" />
              </div>
              <details className="mt-3">
                <summary className="inline-flex min-h-10 cursor-pointer items-center text-sm font-semibold text-clay-700">Edit</summary>
                <AdminForm action={updateFacility} className="mt-3 grid gap-4 sm:grid-cols-2">
                  <input type="hidden" name="id" value={f.id} />
                  <AText label="Name" name="name" defaultValue={f.name} required maxLength={100} />
                  <IconSelect defaultValue={f.icon} />
                  <AText label="Short description" name="description" defaultValue={f.description} optional className="sm:col-span-2" />
                  <ACheckbox label="Show on website" name="active" defaultChecked={f.active} />
                  <div className="sm:text-right">
                    <SubmitButton>Save</SubmitButton>
                  </div>
                </AdminForm>
              </details>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
