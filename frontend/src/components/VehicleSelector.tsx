import { ChevronDown } from 'lucide-react';

interface Vehicle {
  sn: string;
  name?: string;
  type?: number | string;
  vehicleTypeId?: string;
  frameno?: string;
  frameNo?: string;
  [key: string]: unknown;
}

interface VehicleSelectorProps {
  vehicles: Vehicle[];
  selected: string;
  onSelect: (sn: string) => void;
}

export default function VehicleSelector({ vehicles, selected, onSelect }: VehicleSelectorProps) {
  if (vehicles.length === 0) return null;

  return (
    <div className="relative">
      <select
        value={selected}
        onChange={(e) => onSelect(e.target.value)}
        className="appearance-none bg-dark-700 border border-dark-500 text-text-primary rounded-xl px-4 py-2.5 pr-10 text-sm font-medium focus:outline-none focus:border-niu-cyan transition-colors cursor-pointer"
      >
        {vehicles.map((v) => (
          <option key={v.sn} value={v.sn}>
            {v.name || v.type || v.sn}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
    </div>
  );
}
