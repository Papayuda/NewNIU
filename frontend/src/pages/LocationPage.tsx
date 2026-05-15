import { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, RefreshCw, Navigation } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import LoadingSpinner from '../components/LoadingSpinner';
import { getVehicles, getVehiclePosition } from '../api';

export default function LocationPage() {
  const [sn, setSn] = useState('');
  const [position, setPosition] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    (async () => {
      const v = (await getVehicles()) as { sn: string }[];
      if (v.length > 0) setSn(v[0].sn);
      setLoading(false);
    })();
  }, []);

  const loadData = useCallback(async () => {
    if (!sn) return;
    try {
      const pos = await getVehiclePosition(sn);
      setPosition(pos);
    } catch {
      /* handled */
    }
  }, [sn]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!mapRef.current) return;

    const lat = (position as Record<string, number>).lat ?? 0;
    const lng = (position as Record<string, number>).lng ?? 0;

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
      }).setView([lat || 40, lng || -74], lat ? 15 : 3);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB',
        maxZoom: 19,
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    if (lat && lng) {
      const map = mapInstanceRef.current;
      map.setView([lat, lng], 15);

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        const icon = L.divIcon({
          html: `<div style="width:32px;height:32px;background:linear-gradient(135deg,#e63946,#00f5d4);border-radius:50%;border:3px solid white;box-shadow:0 0 20px rgba(230,57,70,0.5);display:flex;align-items:center;justify-content:center;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
          </div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        });
        markerRef.current = L.marker([lat, lng], { icon }).addTo(map);
      }
    }

    return () => {};
  }, [position]);

  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  if (loading) return <LoadingSpinner message="Loading location..." />;

  const lat = (position as Record<string, number>).lat ?? 0;
  const lng = (position as Record<string, number>).lng ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Location</h1>
          <p className="text-text-muted text-sm mt-1">Vehicle GPS tracking</p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-dark-700 border border-dark-500 text-text-secondary hover:text-niu-cyan hover:border-niu-cyan/50 transition-all"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-800 rounded-2xl p-5 border border-dark-600 flex items-center gap-4">
          <MapPin className="w-8 h-8 text-niu-red" />
          <div>
            <p className="text-text-muted text-xs">Latitude</p>
            <p className="text-text-primary font-bold text-lg">{lat ? lat.toFixed(6) : '--'}</p>
          </div>
        </div>
        <div className="bg-dark-800 rounded-2xl p-5 border border-dark-600 flex items-center gap-4">
          <Navigation className="w-8 h-8 text-niu-cyan" />
          <div>
            <p className="text-text-muted text-xs">Longitude</p>
            <p className="text-text-primary font-bold text-lg">{lng ? lng.toFixed(6) : '--'}</p>
          </div>
        </div>
        <div className="bg-dark-800 rounded-2xl p-5 border border-dark-600 flex items-center gap-4">
          <MapPin className="w-8 h-8 text-violet-400" />
          <div>
            <p className="text-text-muted text-xs">GPS Accuracy</p>
            <p className="text-text-primary font-bold text-lg">
              {(position as Record<string, number>).gps ?? '--'}
            </p>
          </div>
        </div>
      </div>

      <div
        ref={mapRef}
        className="w-full h-[500px] rounded-2xl border border-dark-600 overflow-hidden"
      />
    </div>
  );
}
