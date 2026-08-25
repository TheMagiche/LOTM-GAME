import { useEffect, useMemo } from 'react';
import {
    MapContainer,
    ImageOverlay,
    Marker,
    Popup,
    Polyline,
    useMap,
} from 'react-leaflet';
import L from 'leaflet';
import type { LotmMapPath, LotmMapPin, LotmMapPinType } from '../../worldpacks/lotmMapData';
import { LOTM_MAP_DIMENSIONS } from '../../worldpacks/lotmMapData';

const ICON_PALETTE: Record<LotmMapPinType | 'default', string> = {
    region: '#eab308',
    nation: '#f97316',
    city: '#ef4444',
    village: '#fb7185',
    harbor: '#14b8a6',
    landmark: '#a855f7',
    sea: '#3b82f6',
    default: '#ffffff',
};

const iconCache = new Map<string, L.DivIcon>();

function createPin(color: string): L.DivIcon {
    const cached = iconCache.get(color);
    if (cached) return cached;
    const icon = L.divIcon({
        className: 'custom-lotm-pin',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color};cursor:pointer"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });
    iconCache.set(color, icon);
    return icon;
}

function FitImage({ bounds }: { bounds: L.LatLngBoundsExpression }) {
    const map = useMap();
    useEffect(() => {
        const frame = requestAnimationFrame(() => {
            map.invalidateSize();
            map.fitBounds(bounds, { padding: [16, 16], animate: false });
        });
        const later = window.setTimeout(() => {
            map.invalidateSize();
            map.fitBounds(bounds, { padding: [16, 16], animate: false });
        }, 150);
        return () => {
            cancelAnimationFrame(frame);
            window.clearTimeout(later);
        };
    }, [map, bounds]);
    return null;
}

type Props = {
    imageUrl: string;
    locations?: LotmMapPin[];
    paths?: LotmMapPath[];
    activeLayers?: Record<string, boolean>;
    onSelectName?: (name: string) => void;
};

export function LotmWorldMap({
    imageUrl,
    locations = [],
    paths = [],
    activeLayers = {},
    onSelectName,
}: Props) {
    const bounds = useMemo<L.LatLngBoundsExpression>(
        () => [[-LOTM_MAP_DIMENSIONS.height, 0], [0, LOTM_MAP_DIMENSIONS.width]],
        [],
    );

    return (
        <MapContainer
            crs={L.CRS.Simple}
            bounds={bounds}
            maxBounds={bounds}
            maxBoundsViscosity={1}
            minZoom={-3}
            maxZoom={3}
            zoomSnap={0.25}
            zoomDelta={0.5}
            attributionControl={false}
            className="lotm-world-map"
            style={{ height: '100%', width: '100%', backgroundColor: '#090d16' }}
        >
            <FitImage bounds={bounds} />
            <ImageOverlay url={imageUrl} bounds={bounds} />

            {activeLayers.paths !== false &&
                paths.map(path => (
                    <Polyline
                        key={path.id}
                        positions={path.coordinates}
                        pathOptions={{
                            color: path.color || '#38bdf8',
                            dashArray: path.dashArray || '4, 8',
                            weight: 2,
                        }}
                    />
                ))}

            {locations
                .filter(loc => {
                    const key = loc.category?.toLowerCase();
                    if (!key) return true;
                    return activeLayers[key] !== false;
                })
                .map(loc => (
                    <Marker
                        key={loc.id}
                        position={loc.coordinates}
                        icon={createPin(ICON_PALETTE[loc.type] ?? ICON_PALETTE.default)}
                        eventHandlers={{
                            click: () => onSelectName?.(loc.name),
                        }}
                    >
                        <Popup className="lotm-map-popup">
                            <div>
                                <h4>{loc.name}</h4>
                                <p className="lotm-map-popup-meta">
                                    {loc.category}
                                    {loc.details ? ` · ${loc.details}` : ''}
                                </p>
                                {loc.description && <p className="lotm-map-popup-body">{loc.description}</p>}
                            </div>
                        </Popup>
                    </Marker>
                ))}
        </MapContainer>
    );
}
