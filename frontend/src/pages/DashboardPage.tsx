import { useEffect, useState, useCallback } from 'react';
import {
  Battery,
  Gauge,
  Milestone,
  Thermometer,
  Zap,
  Timer,
  RefreshCw,
  Lock,
  Unlock,
  Navigation,
} from 'lucide-react';
import MetricTile from '../components/MetricTile';
import VehicleSelector from '../components/VehicleSelector';
import StatusBadge from '../components/StatusBadge';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getOverallTally, getBatteryInfo, getMotorInfo } from '../api';

interface VehicleData {
  sn: string;
  name?: string;
  type?: number | string;
  vehicleTypeId?: string;
  frameno?: string;
  frameNo?: string;
  isConnected?: boolean;
  isSelected?: boolean;
  [key: string]: unknown;
}

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [selectedSN, setSelectedSN] = useState('');
  const [tally, setTally] = useState<Record<string, unknown>>({});
  const [battery, setBattery] = useState<Record<string, unknown>>({});
  const [motor, setMotor] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const v = (await getVehicles()) as VehicleData[];
        setVehicles(v);
        if (v.length > 0) {
          setSelectedSN(v[0].sn);
        }
      } catch {
        /* handled by api layer */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadVehicleData = useCallback(async (serial: string) => {
    if (!serial) return;
    setRefreshing(true);
    try {
      const [t, b, m] = await Promise.all([
        getOverallTally(serial),
        getBatteryInfo(serial),
        getMotorInfo(serial),
      ]);
      setTally(t);
      setBattery(b);
      setMotor(m);
    } catch {
      /* handled by api layer */
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching
    if (selectedSN) void loadVehicleData(selectedSN);
  }, [selectedSN, loadVehicleData]);

  if (loading) return <LoadingSpinner message="Loading vehicles..." />;

  if (vehicles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Zap className="w-16 h-16 text-text-muted" />
        <h2 className="text-xl font-semibold text-text-primary">No Vehicles Found</h2>
        <p className="text-text-muted text-center max-w-md">
          No NIU vehicles are linked to your account. Make sure you have registered your scooter in the official NIU app.
        </p>
      </div>
    );
  }

  const selectedVehicle = vehicles.find((v) => v.sn === selectedSN);
  const batteries = (battery as Record<string, Record<string, Record<string, unknown>>>)?.batteries ?? {};
  const compA = batteries?.compartmentA ?? {};
  const batteryPercent = compA?.batteryCharging ?? '--';
  const batteryTemp = compA?.temperature ?? '--';
  const rawMileage = (tally as Record<string, number>)?.totalMileage ?? 0;
  const totalMileage = rawMileage > 10000 ? rawMileage / 1000 : rawMileage;
  const lastTrackSpeed = (motor as Record<string, number>)?.nowSpeed ?? 0;
  const isConnected = (motor as Record<string, boolean>)?.isConnected ?? false;
  const isLocked = (motor as Record<string, number>)?.lockStatus === 1;
  const estimatedRange = (motor as Record<string, number>)?.estimatedMileage ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-muted text-sm mt-1">
            {selectedVehicle?.name || selectedVehicle?.vehicleTypeId || selectedVehicle?.type || 'NIU Vehicle'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <StatusBadge online={!!selectedVehicle?.isConnected} />
          <VehicleSelector
            vehicles={vehicles}
            selected={selectedSN}
            onSelect={setSelectedSN}
          />
          <button
            onClick={() => void loadVehicleData(selectedSN)}
            disabled={refreshing}
            className="p-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricTile
          icon={<Battery className="w-6 h-6" />}
          label="Battery Level"
          value={batteryPercent as string | number}
          unit="%"
          color="text-emerald-400"
          subtitle="State of charge"
        />
        <MetricTile
          icon={<Gauge className="w-6 h-6" />}
          label="Current Speed"
          value={lastTrackSpeed}
          unit="km/h"
          color="text-niu-cyan"
          subtitle="Real-time speed"
        />
        <MetricTile
          icon={<Milestone className="w-6 h-6" />}
          label="Total Mileage"
          value={totalMileage.toFixed(1)}
          unit="km"
          color="text-violet-400"
          subtitle="Lifetime distance"
        />
        <MetricTile
          icon={<Thermometer className="w-6 h-6" />}
          label="Battery Temp"
          value={batteryTemp as string | number}
          unit="°C"
          color="text-amber-400"
          subtitle="Battery temperature"
        />
        <MetricTile
          icon={<Navigation className="w-6 h-6" />}
          label="Estimated Range"
          value={estimatedRange || '--'}
          unit="km"
          color="text-niu-red"
          subtitle="Remaining range"
        />
        <MetricTile
          icon={<Timer className="w-6 h-6" />}
          label="Ride Time"
          value={((tally as Record<string, number>)?.totalRidingTime ?? 0)}
          unit="min"
          color="text-sky-400"
          subtitle="Total riding time"
        />
        <MetricTile
          icon={isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          label="Lock Status"
          value={isLocked ? 'Locked' : 'Unlocked'}
          color={isLocked ? 'text-emerald-400' : 'text-amber-400'}
          subtitle={isConnected ? 'Vehicle online' : 'Vehicle offline'}
        />
        <MetricTile
          icon={<Gauge className="w-6 h-6" />}
          label="Avg Speed"
          value={
            totalMileage > 0 && (tally as Record<string, number>)?.totalRidingTime > 0
              ? (totalMileage / ((tally as Record<string, number>).totalRidingTime / 60)).toFixed(1)
              : '--'
          }
          unit="km/h"
          color="text-teal-400"
          subtitle="Average speed"
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Vehicle Info</h3>
          <div className="space-y-3">
            {[
              ['Serial Number', selectedVehicle?.sn],
              ['Model', selectedVehicle?.vehicleTypeId || selectedVehicle?.type],
              ['Frame No', selectedVehicle?.frameNo || selectedVehicle?.frameno],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-text-muted">{label}</span>
                <span className="text-text-primary font-medium">{(val as string) || '--'}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Quick Stats</h3>
          <div className="space-y-3">
            {[
              ['Total Rides', (tally as Record<string, number>)?.totalRidingTimes ?? '--'],
              ['Savings (CO2)', `${((tally as Record<string, number>)?.totalCo2Saved ?? 0).toFixed(1)} kg`],
              ['Days Since Purchase', (tally as Record<string, number>)?.bindDaysCount ?? (tally as Record<string, number>)?.totalDays ?? '--'],
            ].map(([label, val]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <span className="text-text-muted">{label}</span>
                <span className="text-text-primary font-medium">{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
