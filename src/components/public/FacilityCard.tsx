import { FacilityIcon } from "@/components/shared/icons";

export function FacilityCard({ name, description, icon }: { name: string; description?: string; icon: string }) {
  return (
    <div className="flex gap-4 border-t border-cream-300/80 py-5">
      <span className="mt-0.5 shrink-0 text-forest-600">
        <FacilityIcon name={icon} />
      </span>
      <div>
        <h3 className="font-display text-xl font-medium text-forest-900">{name}</h3>
        {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
      </div>
    </div>
  );
}
