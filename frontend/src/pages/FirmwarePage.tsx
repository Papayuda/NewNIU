import { useEffect, useState, useCallback } from 'react';
import {
  Cpu,
  Download,
  Shield,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getFirmwareVersion, getUpdateInfo } from '../api';

export default function FirmwarePage() {
  const [sn, setSn] = useState('');
  const [firmware, setFirmware] = useState<Record<string, unknown>>({});
  const [updateInfo, setUpdateInfo] = useState<Record<string, unknown>>({});
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
      const [fw, upd] = await Promise.all([
        getFirmwareVersion(serial),
        getUpdateInfo(serial),
      ]);
      setFirmware(fw);
      setUpdateInfo(upd);
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

  if (loading) return <LoadingSpinner message="Loading firmware info..." />;

  const needsUpdate = firmware.needUpdate === true;
  const supportsUpdate = firmware.isSupportUpdate === true;
  const nowVersion = (firmware.nowVersion as string) || '--';
  const availVersion = (firmware.version as string) || '--';
  const hardVersion = (firmware.hardVersion as string) || '--';

  const displayEntries = [
    ['Serial Number', firmware.sn],
    ['Current Version', nowVersion],
    ['Available Version', availVersion],
    ['Hardware Version', hardVersion],
    ['Protocol Version', firmware.ss_protocol_ver],
    ['Supports OTA', supportsUpdate ? 'Yes' : 'No'],
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Firmware</h1>
          <p className="text-text-muted text-sm mt-1">Software versions and updates</p>
        </div>
        <button
          onClick={() => void loadData(sn)}
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
              <h2 className="text-lg font-semibold text-text-primary">Firmware Details</h2>
              <p className="text-text-muted text-sm">Version information</p>
            </div>
          </div>
          <div className="space-y-3">
            {displayEntries.map(([label, val]) => (
              <div key={label as string} className="flex justify-between text-sm py-2 border-b border-dark-600">
                <span className="text-text-muted">{label as string}</span>
                <span className="text-text-primary font-medium">{String(val ?? '--')}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              needsUpdate ? 'bg-amber-400/10' : 'bg-emerald-400/10'
            }`}>
              <Shield className={`w-6 h-6 ${needsUpdate ? 'text-amber-400' : 'text-emerald-400'}`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">Update Status</h2>
              <p className="text-text-muted text-sm">OTA update information</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            {needsUpdate ? (
              <>
                <AlertTriangle className="w-16 h-16 text-amber-400" />
                <p className="text-text-primary font-medium">Update Available</p>
                <p className="text-text-muted text-sm text-center">
                  A new firmware version is available. Update through the NIU app.
                </p>
                {firmware.otaDescribe && (
                  <p className="text-text-secondary text-sm text-center mt-2">
                    {firmware.otaDescribe as string}
                  </p>
                )}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-16 h-16 text-emerald-400" />
                <p className="text-text-primary font-medium">Firmware is up to date</p>
                <p className="text-text-muted text-sm text-center">
                  Your vehicle is running the latest available firmware.
                </p>
              </>
            )}
            <button
              onClick={() => void loadData(sn)}
              className="mt-4 px-6 py-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all flex items-center gap-2 text-sm"
            >
              <Download className="w-4 h-4" />
              Check for Updates
            </button>
          </div>
        </div>
      </div>

      {Object.keys(updateInfo).length > 0 && (
        <div className="mt-6 bg-dark-800 rounded-2xl p-6 border border-dark-600">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Update Info (Raw)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {Object.entries(updateInfo).map(([key, val]) => (
              <div key={key} className="flex justify-between text-sm py-1 border-b border-dark-600">
                <span className="text-text-muted">{key}</span>
                <span className="text-text-primary font-medium truncate ml-4 max-w-[200px]">
                  {typeof val === 'object' ? JSON.stringify(val) : String(val ?? '--')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
