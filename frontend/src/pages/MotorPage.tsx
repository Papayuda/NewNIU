import { useEffect, useState, useCallback } from 'react';
import { Gauge, Thermometer, Zap, Activity, RefreshCw } from 'lucide-react';
import MetricTile from '../components/MetricTile';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getMotorInfo } from '../api';

export default function MotorPage() {
  const [sn, setSn] = useState('');
  const [motor, setMotor] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const v = (await getVehicles()) as { sn: string }[];
      if (v.length > 0) setSn(v[0].sn);
      setLoading(false);
    })();
  }, []);

  const loadData = useCallback(async () => {
    if (!sn) return;
    setLoading(true);
    try {
      setMotor(await getMotorInfo(sn));
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [sn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner message="Loading motor data..." />;

  const m = motor as Record<string, number | string>;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Motor</h1>
          <p className="text-text-muted text-sm mt-1">Motor and controller diagnostics</p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricTile
          icon={<Gauge className="w-6 h-6" />}
          label="Current Speed"
          value={m.nowSpeed ?? '--'}
          unit="km/h"
          color="text-niu-cyan"
        />
        <MetricTile
          icon={<Activity className="w-6 h-6" />}
          label="Shake Value"
          value={m.shakeValue ?? '--'}
          color="text-violet-400"
        />
        <MetricTile
          icon={<Zap className="w-6 h-6" />}
          label="Controller Voltage"
          value={m.centreCtrlBattery ?? '--'}
          unit="V"
          color="text-amber-400"
        />
        <MetricTile
          icon={<Thermometer className="w-6 h-6" />}
          label="SS Protocol"
          value={m.ss_protocol_ver ?? '--'}
          color="text-sky-400"
        />
      </div>

      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Motor Data Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {Object.entries(motor).map(([key, val]) => (
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
