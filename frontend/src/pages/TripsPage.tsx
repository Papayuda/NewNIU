import { useEffect, useState, useCallback } from 'react';
import { Route, Clock, Gauge, Calendar, RefreshCw, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getTracks } from '../api';

interface Track {
  trackId?: string;
  id?: string;
  ridingTime?: number;
  distance?: number;
  avespeed?: number;
  date?: string;
  startTime?: string;
  endTime?: string;
  [key: string]: unknown;
}

export default function TripsPage() {
  const [sn, setSn] = useState('');
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

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

  const loadData = useCallback(async (serial: string, p: number) => {
    if (!serial) return;
    setLoading(true);
    try {
      const data = await getTracks(serial, p);
      setTracks(((data as Record<string, unknown[]>)?.items ?? []) as Track[]);
    } catch {
      /* handled */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching
    if (sn) void loadData(sn, page);
  }, [sn, page, loadData]);

  if (loading && tracks.length === 0) return <LoadingSpinner message="Loading trip history..." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Trip History</h1>
          <p className="text-text-muted text-sm mt-1">Past rides and route data</p>
        </div>
        <button
          onClick={() => void loadData(sn, page)}
          className="p-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {tracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Route className="w-16 h-16 text-text-muted" />
          <h2 className="text-xl font-semibold text-text-primary">No Trips Found</h2>
          <p className="text-text-muted">Take a ride and your trips will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tracks.map((track, idx) => (
            <div
              key={track.trackId || track.id || idx}
              className="bg-dark-800 rounded-2xl p-5 border border-dark-600 hover:border-dark-400 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-xl bg-niu-cyan/10 flex items-center justify-center">
                    <Route className="w-6 h-6 text-niu-cyan" />
                  </div>
                  <div className="grid grid-cols-3 gap-8">
                    <div>
                      <div className="flex items-center gap-1 text-text-muted text-xs mb-1">
                        <Route className="w-3 h-3" />
                        Distance
                      </div>
                      <span className="text-text-primary font-semibold">
                        {track.distance ? (track.distance / 1000).toFixed(1) : '--'} km
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-text-muted text-xs mb-1">
                        <Clock className="w-3 h-3" />
                        Duration
                      </div>
                      <span className="text-text-primary font-semibold">
                        {track.ridingTime ?? '--'} min
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-1 text-text-muted text-xs mb-1">
                        <Gauge className="w-3 h-3" />
                        Avg Speed
                      </div>
                      <span className="text-text-primary font-semibold">
                        {track.avespeed ?? '--'} km/h
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-text-muted text-xs">
                      <Calendar className="w-3 h-3" />
                      {track.date || '--'}
                    </div>
                    <p className="text-text-muted text-xs mt-1">
                      {track.startTime} - {track.endTime}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-niu-cyan transition-colors" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-center gap-3 mt-8">
        <button
          onClick={() => setPage(Math.max(1, page - 1))}
          disabled={page === 1}
          className="px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
        >
          Previous
        </button>
        <span className="px-4 py-2 text-text-muted text-sm">Page {page}</span>
        <button
          onClick={() => setPage(page + 1)}
          disabled={tracks.length === 0}
          className="px-4 py-2 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-text-primary disabled:opacity-30 transition-all"
        >
          Next
        </button>
      </div>
    </div>
  );
}
