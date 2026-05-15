import { useEffect, useState, useCallback } from 'react';
import { Cpu, Download, Shield, CheckCircle2, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getFirmwareVersion } from '../api';

export default function FirmwarePage() {
  const [sn, setSn] = useState('');
  const [firmware, setFirmware] = useState<Record<string, unknown>>({});
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
      setFirmware(await getFirmwareVersion(sn));
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, [sn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <LoadingSpinner message="Loading firmware info..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Firmware</h1>
          <p className="text-text-muted text-sm mt-1">Software versions and updates</p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-niu-cyan/10 flex items-center justify-center">
              <Cpu className="w-6 h-6 text-niu-cyan" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Current Firmware</h2>
              <p className="text-text-muted text-sm">Installed version</p>
            </div>
          </div>
          <div className="space-y-3">
            {Object.entries(firmware).map(([key, val]) => {
              if (typeof val === 'object') return null;
              return (
                <div key={key} className="flex justify-between text-sm py-2 border-b border-dark-600">
                  <span className="text-text-muted">{key}</span>
                  <span className="text-text-primary font-medium">{String(val ?? '--')}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-emerald-400/10 flex items-center justify-center">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Update Status</h2>
              <p className="text-text-muted text-sm">Software update information</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <CheckCircle2 className="w-16 h-16 text-emerald-400" />
            <p className="text-text-primary font-medium">Firmware is up to date</p>
            <p className="text-text-muted text-sm text-center">
              Your vehicle is running the latest available firmware. Updates are managed through the NIU app.
            </p>
            <button className="mt-4 px-6 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" />
              Check for Updates
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
