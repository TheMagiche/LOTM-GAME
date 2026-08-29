import { useEffect, useMemo } from 'react';
import {
    MapContainer,
    ImageOverlay,
    Marker,
    Popup,
    Tooltip,
    useMap,
    useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import type { LotmMapPin, LotmMapPinType } from '../../worldpacks/lotmMapData';
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

function MapEventHandler({
    onMapClick,
    onMouseMoveCoords,
}: {
    onMapClick?: (coords: [number, number]) => void;
    onMouseMoveCoords?: (coords: [number, number]) => void;
}) {
    useMapEvents({
        click(e) {
            const lat = Math.round(e.latlng.lat);
            const lng = Math.round(e.latlng.lng);
            onMapClick?.([lat, lng]);
        },
        mousemove(e) {
            const lat = Math.round(e.latlng.lat);
            const lng = Math.round(e.latlng.lng);
            onMouseMoveCoords?.([lat, lng]);
        },
    });
    return null;
}

type Props = {
    imageUrl: string;
    locations?: LotmMapPin[];
    activeLayers?: Record<string, boolean>;
    onSelectName?: (name: string) => void;
    onMapClick?: (coords: [number, number]) => void;
    onMouseMoveCoords?: (coords: [number, number]) => void;
    onPinMove?: (pinId: string, pinName: string, newCoords: [number, number]) => void;
    highlightCoords?: [number, number] | null;
    isPicking?: boolean;
    isDraggable?: boolean;
};

export function LotmWorldMap({
    imageUrl,
    locations = [],
    activeLayers = {},
    onSelectName,
    onMapClick,
    onMouseMoveCoords,
    onPinMove,
    highlightCoords,
    isPicking = false,
    isDraggable = false,
}: Props) {
    const bounds = useMemo<L.LatLngBoundsExpression>(
        () => [[-LOTM_MAP_DIMENSIONS.height, 0], [0, LOTM_MAP_DIMENSIONS.width]],
        [],
    );

    const highlightIcon = useMemo(() => {
        return L.divIcon({
            className: 'custom-lotm-highlight-pin',
            html: `<div style="width:20px;height:20px;border-radius:50%;background:#38bdf8;border:3px solid #fff;box-shadow:0 0 16px #38bdf8;animation:pulse 1.5s infinite"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10],
        });
    }, []);

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
            className={`lotm-world-map ${isPicking ? 'cursor-crosshair' : ''}`}
            style={{ height: '100%', width: '100%', backgroundColor: '#090d16' }}
        >
            <FitImage bounds={bounds} />
            <ImageOverlay url={imageUrl} bounds={bounds} />
            <MapEventHandler onMapClick={onMapClick} onMouseMoveCoords={onMouseMoveCoords} />

            {/* Render Active / Highlight Pin */}
            {highlightCoords && (
                <Marker
                    position={highlightCoords}
                    icon={highlightIcon}
                    interactive={false}
                />
            )}

            {/* Render Location Pins */}
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
                        draggable={isDraggable}
                        icon={createPin(ICON_PALETTE[loc.type] ?? ICON_PALETTE.default)}
                        eventHandlers={{
                            click: () => {
                                if (!isDraggable) {
                                    onSelectName?.(loc.name);
                                }
                            },
                            dragend: (e) => {
                                const marker = e.target as L.Marker;
                                const latLng = marker.getLatLng();
                                const rounded: [number, number] = [Math.round(latLng.lat), Math.round(latLng.lng)];
                                onPinMove?.(loc.id, loc.name, rounded);
                            },
                        }}
                    >
                        <Tooltip
                            direction="top"
                            offset={[0, -8]}
                            opacity={1}
                            className="lotm-map-tooltip"
                        >
                            <div className="lotm-map-tooltip-inner">
                                <div className="lotm-map-tooltip-title">{loc.name}</div>
                                {(loc.category || loc.details) && (
                                    <div className="lotm-map-tooltip-meta">
                                        {loc.category}
                                        {loc.details ? ` · ${loc.details}` : ''}
                                    </div>
                                )}
                            </div>
                        </Tooltip>
                        {!isDraggable && (
                            <Popup className="lotm-map-popup">
                                <div>
                                    <h4>{loc.name}</h4>
                                    <p className="lotm-map-popup-meta">
                                        {loc.category}
                                        {loc.details ? ` · ${loc.details}` : ''}
                                    </p>
                                    <p className="text-[10px] text-text-dim mt-0.5 font-mono">
                                        [{loc.coordinates[0]}, {loc.coordinates[1]}]
                                    </p>
                                    {loc.description && <p className="lotm-map-popup-body">{loc.description}</p>}
                                </div>
                            </Popup>
                        )}
                    </Marker>
                ))}
        </MapContainer>
    );
}
