import { useEffect, useState, useCallback } from 'react';
import {
  Gauge,
  Wifi,
  WifiOff,
  Lock,
  Unlock,
  Activity,
  RefreshCw,
  Battery,
  Signal,
} from 'lucide-react';
import MetricTile from '../components/MetricTile';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getMotorInfo } from '../api';

export default function MotorPage() {
  const [sn, setSn] = useState('');
  const [motor, setMotor] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const v = (await getVehicles()) as { sn: string }[];
        if (v.length > 0) setSn(v[0].sn);
      } catch {
        /* handled by api layer */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadData = useCallback(async (serial: string) => {
    if (!serial) return;
    setLoading(true);
    try {
      setMotor(await getMotorInfo(serial));
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching
    if (sn) void loadData(sn);
  }, [sn, loadData]);

  if (loading) return <LoadingSpinner message="Loading motor data..." />;

  const m = motor as Record<string, unknown>;
  const isConnected = m.isConnected === true;
  const isLocked = (m.lockStatus as number) === 1;
  const isCharging = (m.isCharging as number) === 1;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Motor & Status</h1>
          <p className="text-text-muted text-sm mt-1">Real-time vehicle status from NIU Cloud</p>
        </div>
        <button
          onClick={() => void loadData(sn)}
          className="p-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricTile
          icon={isConnected ? <Wifi className="w-6 h-6" /> : <WifiOff className="w-6 h-6" />}
          label="Connection"
          value={isConnected ? 'Online' : 'Offline'}
          color={isConnected ? 'text-emerald-400' : 'text-text-muted'}
        />
        <MetricTile
          icon={isLocked ? <Lock className="w-6 h-6" /> : <Unlock className="w-6 h-6" />}
          label="Lock Status"
          value={isLocked ? 'Locked' : 'Unlocked'}
          color={isLocked ? 'text-emerald-400' : 'text-amber-400'}
        />
        <MetricTile
          icon={<Gauge className="w-6 h-6" />}
          label="Current Speed"
          value={(m.nowSpeed as number) ?? 0}
          unit="km/h"
          color="text-niu-cyan"
        />
        <MetricTile
          icon={<Battery className="w-6 h-6" />}
          label="Charging"
          value={isCharging ? 'Yes' : 'No'}
          color={isCharging ? 'text-niu-cyan' : 'text-text-muted'}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <MetricTile
          icon={<Activity className="w-6 h-6" />}
          label="Shake Value"
          value={(m.shakingValue as number) ?? '--'}
          color="text-violet-400"
        />
        <MetricTile
          icon={<Signal className="w-6 h-6" />}
          label="GSM Signal"
          value={(m.gsm as number) ?? '--'}
          color="text-sky-400"
        />
        <MetricTile
          icon={<Gauge className="w-6 h-6" />}
          label="Estimated Range"
          value={(m.estimatedMileage as number) ?? 0}
          unit="km"
          color="text-niu-red"
        />
      </div>

      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
        <h2 className="text-lg font-semibold text-text-primary mb-4">All Motor Data</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {Object.entries(motor)
            .filter(([key]) => key !== 'lastTrack')
            .map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm py-1 border-b border-dark-600">
                <span className="text-text-muted">{key}</span>
                <span className="text-text-primary font-medium truncate ml-4 max-w-[200px]">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '--')}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
