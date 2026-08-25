import { useEffect, useMemo } from 'react';
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';

const iconPalette = {
  region: '#eab308',
  nation: '#f97316',
  city: '#ef4444',
  village: '#fb7185',
  harbor: '#14b8a6',
  landmark: '#a855f7',
  sea: '#3b82f6'
};

const iconCache = new Map();

function createPin(color) {
  if (iconCache.has(color)) return iconCache.get(color);

  const icon = L.divIcon({
    className: 'custom-lotm-pin',
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color};cursor:pointer"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });

  iconCache.set(color, icon);
  return icon;
}

function CursorTracker({ onCursorMove, onMapClick }) {
  useMapEvents({
    mousemove(e) {
      onCursorMove?.([Math.round(e.latlng.lat), Math.round(e.latlng.lng)]);
    },
    click(e) {
      onMapClick?.([Math.round(e.latlng.lat), Math.round(e.latlng.lng)]);
    }
  });
  return null;
}

function FitImage({ bounds }) {
  const map = useMap();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: [16, 16], animate: false });
    });
    return () => cancelAnimationFrame(frame);
  }, [map, bounds]);

  return null;
}

/**
 * Reusable CRS.Simple image map.
 * Coordinates are [lat, lng] = [-y, x] in image pixels from the top-left.
 */
export default function LotmMap({
  imageUrl,
  dimensions,
  locations = [],
  paths = [],
  activeLayers = {},
  onCursorMove,
  onMapClick,
  minZoom = -3,
  maxZoom = 3
}) {
  const bounds = useMemo(
    () => [
      [-dimensions.height, 0],
      [0, dimensions.width]
    ],
    [dimensions.height, dimensions.width]
  );

  return (
    <MapContainer
      crs={L.CRS.Simple}
      bounds={bounds}
      maxBounds={bounds}
      maxBoundsViscosity={1}
      minZoom={minZoom}
      maxZoom={maxZoom}
      zoomSnap={0.25}
      zoomDelta={0.5}
      attributionControl={false}
      style={{ height: '100%', width: '100%', backgroundColor: '#090d16' }}
    >
      <FitImage bounds={bounds} />
      <CursorTracker onCursorMove={onCursorMove} onMapClick={onMapClick} />
      <ImageOverlay url={imageUrl} bounds={bounds} />

      {activeLayers.paths !== false &&
        paths.map((path) => (
          <Polyline
            key={path.id}
            positions={path.coordinates}
            pathOptions={{
              color: path.color || '#38bdf8',
              dashArray: path.dashArray || '4, 8',
              weight: 2
            }}
          />
        ))}

      {locations
        .filter((loc) => {
          const key = loc.category?.toLowerCase();
          if (!key) return true;
          return activeLayers[key] !== false;
        })
        .map((loc) => (
          <Marker
            key={loc.id}
            position={loc.coordinates}
            icon={createPin(iconPalette[loc.type] || '#ffffff')}
          >
            <Popup className="lotm-popup">
              <div className="font-sans text-slate-800">
                <h4 className="m-0 border-b border-slate-200 pb-1 text-base font-bold text-slate-900">
                  {loc.name}
                </h4>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                  {loc.category}
                  {loc.details ? ` · ${loc.details}` : ''}
                </p>
                <p className="mt-1 text-sm text-slate-600">{loc.description}</p>
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
