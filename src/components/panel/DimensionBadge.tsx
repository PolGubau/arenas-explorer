import { DIMENSION_COLORS, DIMENSION_LABELS } from "@/lib/constants";
import { Calendar, ImageIcon, Shirt, TypeIcon } from "@/lib/icons";
import type { Dimension } from "@/types/graph";

const ICON: Record<Dimension, React.ComponentType<{ size?: number; className?: string }>> = {
  imagen: ImageIcon,
  año: Calendar,
  vestimenta: Shirt,
  transcripcion: TypeIcon,
};

export function DimensionBadge({ dimension }: { dimension: Dimension }) {
  const Icon = ICON[dimension];
  const color = DIMENSION_COLORS[dimension];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
      style={{
        borderColor: `${color}55`,
        backgroundColor: `${color}1a`,
        color,
      }}
    >
      <Icon size={11} />
      {DIMENSION_LABELS[dimension]}
    </span>
  );
}
