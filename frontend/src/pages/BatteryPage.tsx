import { useEffect, useState, useCallback } from 'react';
import {
  Battery,
  BatteryCharging,
  Thermometer,
  Zap,
  Heart,
  BarChart3,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import MetricTile from '../components/MetricTile';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getBatteryInfo, getBatteryHealth, getBatteryChart } from '../api';

export default function BatteryPage() {
  const [sn, setSn] = useState('');
  const [info, setInfo] = useState<Record<string, unknown>>({});
  const [health, setHealth] = useState<Record<string, unknown>>({});
  const [chart, setChart] = useState<Record<string, unknown>>({});
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
      const [i, h, c] = await Promise.all([
        getBatteryInfo(sn),
        getBatteryHealth(sn),
        getBatteryChart(sn),
      ]);
      setInfo(i);
      setHealth(h);
      setChart(c);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [sn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner message="Loading battery data..." />;

  const batteries = (info as Record<string, Record<string, unknown>>)?.batteries ?? {};
  const compA = (batteries as Record<string, Record<string, unknown>>)?.compartmentA ?? {};
  const compB = (batteries as Record<string, Record<string, unknown>>)?.compartmentB;

  const healthData = ((health as Record<string, Record<string, Record<string, unknown>>>)?.batteries?.compartmentA ?? {}) as Record<string, unknown>;

  const chartItems = ((chart as Record<string, unknown[]>)?.items ?? []).map(
    (item: unknown, idx: number) => {
      const i = item as Record<string, unknown>;
      return {
        name: `Day ${idx + 1}`,
        charge: i.m ?? 0,
        discharge: i.v ?? 0,
      };
    },
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Battery</h1>
          <p className="text-text-muted text-sm mt-1">Battery status and diagnostics</p>
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
          icon={<Battery className="w-6 h-6" />}
          label="Charge Level"
          value={(compA.batteryCharging as number) ?? '--'}
          unit="%"
          color="text-emerald-400"
        />
        <MetricTile
          icon={<Thermometer className="w-6 h-6" />}
          label="Temperature"
          value={(compA.temperature as number) ?? '--'}
          unit="°C"
          color="text-amber-400"
        />
        <MetricTile
          icon={<Zap className="w-6 h-6" />}
          label="Voltage"
          value={
            typeof compA.voltage === 'number'
              ? (compA.voltage / 1000).toFixed(1)
              : '--'
          }
          unit="V"
          color="text-sky-400"
        />
        <MetricTile
          icon={<Heart className="w-6 h-6" />}
          label="Health Grade"
          value={(healthData.healthGrade as string) ?? '--'}
          color="text-rose-400"
        />
      </div>

      {compB && (
        <>
          <h2 className="text-lg font-semibold text-text-primary mb-4">Battery B (Dual Battery)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <MetricTile
              icon={<BatteryCharging className="w-6 h-6" />}
              label="Charge Level B"
              value={((compB as Record<string, unknown>).batteryCharging as number) ?? '--'}
              unit="%"
              color="text-emerald-400"
            />
            <MetricTile
              icon={<Thermometer className="w-6 h-6" />}
              label="Temperature B"
              value={((compB as Record<string, unknown>).temperature as number) ?? '--'}
              unit="°C"
              color="text-amber-400"
            />
            <MetricTile
              icon={<Zap className="w-6 h-6" />}
              label="Voltage B"
              value={
                typeof (compB as Record<string, number>).voltage === 'number'
                  ? ((compB as Record<string, number>).voltage / 1000).toFixed(1)
                  : '--'
              }
              unit="V"
              color="text-sky-400"
            />
          </div>
        </>
      )}

      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-niu-cyan" />
          <h2 className="text-lg font-semibold text-text-primary">Battery Usage Chart</h2>
        </div>
        {chartItems.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartItems}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e2e4a" />
              <XAxis dataKey="name" stroke="#6e6e8a" fontSize={12} />
              <YAxis stroke="#6e6e8a" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1a1a2e',
                  border: '1px solid #2e2e4a',
                  borderRadius: '12px',
                  color: '#e8e8f0',
                }}
              />
              <Bar dataKey="charge" fill="#00f5d4" radius={[6, 6, 0, 0]} />
              <Bar dataKey="discharge" fill="#e63946" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-text-muted text-center py-10">No chart data available</p>
        )}
      </div>

      <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Battery Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          {([
            ['Charging', compA.isCharging ? 'Yes' : 'No'],
            ['Connected', compA.isConnected ? 'Yes' : 'No'],
            ['Charge Cycles', String(healthData.chargeTimes ?? '--')],
            ['Grade Points', String(healthData.healthGradePoints ?? '--')],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} className="flex justify-between text-sm py-1 border-b border-dark-600">
              <span className="text-text-muted">{label}</span>
              <span className="text-text-primary font-medium">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
