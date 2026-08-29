import { useState, useMemo, useEffect, useCallback } from 'react';
import { Layers, Crosshair, Download, Copy, Check, X, FileCode, FileJson, Save, RefreshCw } from 'lucide-react';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import { useAppStore } from '../../store/useAppStore';
import {
    INITIAL_LOCATIONS,
    LOTM_MAP_IMAGE,
    exportPinsToJson,
    exportPinsToTypeScript,
    type LotmMapLayerKey,
    type LotmMapPin,
} from '../../worldpacks/lotmMapData';
import { fetchLotmMapPins, saveLotmMapPins } from '../../services/lotm/lotmMapPinsClient';
import { LotmWorldMap } from './LotmWorldMap';
import type { LocationEntry } from '../../types';

const LAYER_FILTERS: Array<{ key: LotmMapLayerKey; label: string }> = [
    { key: 'kingdoms', label: 'Kingdoms' },
    { key: 'cities', label: 'Cities' },
    { key: 'seas', label: 'Seas' },
];

type Props = {
    onSelectName?: (name: string) => void;
    onPickCoordinates?: (coords: [number, number]) => void;
    isPicking?: boolean;
    pickingLabel?: string;
    onCancelPick?: () => void;
    highlightCoords?: [number, number] | null;
    customLocations?: LocationEntry[];
    readOnly?: boolean;
};

export function LotmWorldMapView({
    onSelectName,
    onPickCoordinates,
    isPicking = false,
    pickingLabel,
    onCancelPick,
    highlightCoords,
    customLocations,
    readOnly = false,
}: Props) {
    const storeLocationLedger = useAppStore(s => s.locationLedger);
    const updateLocation = useAppStore(s => s.updateLocation);
    const locationLedger = customLocations || storeLocationLedger;

    const [serverPins, setServerPins] = useState<LotmMapPin[]>(INITIAL_LOCATIONS);
    const [isLoadingPins, setIsLoadingPins] = useState(false);
    const [isSavingPins, setIsSavingPins] = useState(false);
    const [saveFeedback, setSaveFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const [activeLayers, setActiveLayers] = useState<Record<LotmMapLayerKey, boolean>>({
        kingdoms: true,
        cities: true,
        seas: true,
    });

    const [cursorCoords, setCursorCoords] = useState<[number, number] | null>(null);
    const [calibrationMode, setCalibrationMode] = useState(false);
    const [calibratedCoords, setCalibratedCoords] = useState<Record<string, [number, number]>>({});
    const [exportModalOpen, setExportModalOpen] = useState(false);
    const [exportFormat, setExportFormat] = useState<'json' | 'ts'>('json');
    const [copied, setCopied] = useState(false);

    const loadPins = useCallback(async () => {
        setIsLoadingPins(true);
        try {
            const fetched = await fetchLotmMapPins();
            if (fetched && fetched.length > 0) {
                setServerPins(fetched);
            }
        } catch (err) {
            console.warn('Failed to load server map pins:', err);
        } finally {
            setIsLoadingPins(false);
        }
    }, []);

    useEffect(() => {
        loadPins();
    }, [loadPins]);

    // Merge server / static pins with store location ledger and real-time calibration drag overrides
    const combinedPins = useMemo<LotmMapPin[]>(() => {
        const pinMap = new Map<string, LotmMapPin>();
        const basePins = serverPins.length > 0 ? serverPins : INITIAL_LOCATIONS;

        for (const pin of basePins) {
            const override = calibratedCoords[pin.name.toLowerCase()] || calibratedCoords[pin.id];
            pinMap.set(pin.name.toLowerCase(), {
                ...pin,
                coordinates: override || pin.coordinates,
            });
        }
        for (const loc of locationLedger) {
            const override = calibratedCoords[loc.name.toLowerCase()] || calibratedCoords[loc.id];
            const coords = override || loc.coordinates;
            if (coords) {
                const existing = pinMap.get(loc.name.toLowerCase());
                pinMap.set(loc.name.toLowerCase(), {
                    id: loc.id,
                    name: loc.name,
                    type: existing?.type ?? 'landmark',
                    category: loc.broadLocation || existing?.category || 'Cities',
                    coordinates: coords,
                    description: loc.description || existing?.description || '',
                    details: loc.aliases || existing?.details,
                });
            }
        }
        return Array.from(pinMap.values());
    }, [serverPins, locationLedger, calibratedCoords]);

    const handleMapClick = (coords: [number, number]) => {
        if (readOnly) return;
        if (isPicking && onPickCoordinates) {
            onPickCoordinates(coords);
            return;
        }
    };

    const handlePinMove = (pinId: string, pinName: string, newCoords: [number, number]) => {
        if (readOnly) return;

        setCalibratedCoords(prev => ({
            ...prev,
            [pinId]: newCoords,
            [pinName.toLowerCase()]: newCoords,
        }));

        if (isPicking && onPickCoordinates) {
            onPickCoordinates(newCoords);
        }

        const hit = locationLedger.find(l => l.id === pinId || l.name.toLowerCase() === pinName.toLowerCase());
        if (hit) {
            updateLocation(hit.id, { coordinates: newCoords });
        }
    };

    const handleSaveToFile = async () => {
        if (readOnly) return;
        setIsSavingPins(true);
        setSaveFeedback(null);
        try {
            const res = await saveLotmMapPins(combinedPins);
            setSaveFeedback({ type: 'success', message: `Saved ${res.count ?? combinedPins.length} pins to file!` });
            setServerPins(combinedPins);
            setTimeout(() => setSaveFeedback(null), 3000);
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Unknown save error';
            setSaveFeedback({ type: 'error', message: `Failed to save: ${msg}` });
            setTimeout(() => setSaveFeedback(null), 4000);
        } finally {
            setIsSavingPins(false);
        }
    };

    const exportData = useMemo(() => {
        return exportFormat === 'json'
            ? exportPinsToJson(combinedPins)
            : exportPinsToTypeScript(combinedPins);
    }, [exportFormat, combinedPins]);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(exportData);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
        }
    };

    const handleDownload = () => {
        const filename = exportFormat === 'json' ? 'lotm_map_pins.json' : 'lotmMapPinsExport.ts';
        const mime = exportFormat === 'json' ? 'application/json' : 'text/typescript';
        const blob = new Blob([exportData], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const isCalibrationActive = !readOnly && calibrationMode;
    const isPickingActive = !readOnly && isPicking;

    return (
        <div className="lotm-world-map-view relative w-full h-full" aria-label="World map">
            {/* Picking Banner */}
            {isPickingActive && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-void/90 border border-terminal text-terminal px-4 py-2 rounded shadow-lg flex items-center gap-3 backdrop-blur-sm animate-pulse">
                    <Crosshair size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                        {pickingLabel || 'Click anywhere on the map to set coordinates'}
                    </span>
                    {onCancelPick && (
                        <button
                            onClick={onCancelPick}
                            className="p-1 hover:bg-terminal/20 rounded text-text-dim hover:text-terminal transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            )}

            {/* Calibration Mode Banner */}
            {isCalibrationActive && !isPickingActive && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] bg-void/90 border border-terminal text-terminal px-4 py-2 rounded shadow-lg flex items-center gap-3 backdrop-blur-sm">
                    <Crosshair size={16} />
                    <span className="text-xs font-bold uppercase tracking-wider">
                        Calibration Mode Active: Drag any pin to reposition its coordinates
                    </span>
                    <button
                        onClick={() => setCalibrationMode(false)}
                        className="p-1 hover:bg-terminal/20 rounded text-text-dim hover:text-terminal transition-colors"
                        title="Close calibration mode"
                    >
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Save Feedback Banner */}
            {!readOnly && saveFeedback && (
                <div
                    className={`absolute top-12 left-1/2 -translate-x-1/2 z-[1000] px-3.5 py-1.5 rounded text-xs font-medium shadow-lg flex items-center gap-2 backdrop-blur-sm border ${
                        saveFeedback.type === 'success'
                            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300'
                            : 'bg-rose-950/90 border-rose-500/50 text-rose-300'
                    }`}
                >
                    {saveFeedback.type === 'success' ? <Check size={14} /> : <X size={14} />}
                    <span>{saveFeedback.message}</span>
                </div>
            )}

            {/* Main Interactive Map */}
            <LotmWorldMap
                imageUrl={lotmAssetUrl(LOTM_MAP_IMAGE)}
                locations={combinedPins}
                activeLayers={activeLayers}
                onSelectName={onSelectName}
                onMapClick={handleMapClick}
                onMouseMoveCoords={!readOnly ? setCursorCoords : undefined}
                onPinMove={handlePinMove}
                highlightCoords={highlightCoords}
                isPicking={isPickingActive}
                isDraggable={isCalibrationActive}
            />

            {/* Top-Left HUD: Live Cursor Coordinates (GM mode only) */}
            {!readOnly && (
                <div className="absolute top-3 left-3 z-[1000] bg-surface/80 border border-border/80 px-2.5 py-1 rounded text-[11px] font-mono text-text-dim backdrop-blur-sm pointer-events-none select-none">
                    {cursorCoords ? (
                        <span>Lat: {cursorCoords[0]} &nbsp; Lng: {cursorCoords[1]}</span>
                    ) : (
                        <span>Move cursor over map</span>
                    )}
                </div>
            )}

            {/* Top-Right Action Toolbar (GM mode only) */}
            {!readOnly && (
                <div className="absolute top-3 right-12 z-[1000] flex items-center gap-2">
                    <button
                        onClick={handleSaveToFile}
                        disabled={isSavingPins}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 border backdrop-blur-sm transition-colors shadow-sm ${
                            isSavingPins
                                ? 'bg-terminal/20 border-terminal text-terminal opacity-60'
                                : 'bg-surface/80 border-border text-text-dim hover:text-text-primary hover:border-terminal'
                        }`}
                        title="Save calibrated map pins directly to JSON file on disk"
                    >
                        <Save size={13} />
                        <span>{isSavingPins ? 'Saving...' : 'Save to File'}</span>
                    </button>
                    <button
                        onClick={loadPins}
                        disabled={isLoadingPins}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 border backdrop-blur-sm transition-colors shadow-sm ${
                            isLoadingPins
                                ? 'bg-surface/50 border-border text-text-dim opacity-60'
                                : 'bg-surface/80 border-border text-text-dim hover:text-text-primary hover:border-text-dim'
                        }`}
                        title="Reload map pins from file"
                    >
                        <RefreshCw size={13} className={isLoadingPins ? 'animate-spin' : ''} />
                        <span>{isLoadingPins ? 'Loading...' : 'Load Data'}</span>
                    </button>
                    <button
                        onClick={() => setCalibrationMode(prev => !prev)}
                        className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 border backdrop-blur-sm transition-colors shadow-sm ${
                            calibrationMode
                                ? 'bg-terminal/20 border-terminal text-terminal'
                                : 'bg-surface/80 border-border text-text-dim hover:text-text-primary hover:border-text-dim'
                        }`}
                        title="Toggle pin calibration (drag pins to reposition)"
                    >
                        <Crosshair size={13} />
                        <span>{calibrationMode ? 'Calibrating...' : 'Calibrate'}</span>
                    </button>
                    <button
                        onClick={() => setExportModalOpen(true)}
                        className="px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 bg-surface/80 border border-border text-text-dim hover:text-text-primary hover:border-terminal backdrop-blur-sm transition-colors shadow-sm"
                        title="Export map pins as JSON or TypeScript"
                    >
                        <Download size={13} />
                        <span>Export Pins</span>
                    </button>
                </div>
            )}

            {/* Bottom-Left: Layer Toggles */}
            <div className="lotm-world-map-layers">
                <p className="lotm-world-map-layers-title">
                    <Layers size={12} /> Layers
                </p>
                {LAYER_FILTERS.map(layer => (
                    <label key={layer.key}>
                        <input
                            type="checkbox"
                            checked={activeLayers[layer.key]}
                            onChange={() => setActiveLayers(prev => ({ ...prev, [layer.key]: !prev[layer.key] }))}
                        />
                        {layer.label}
                    </label>
                ))}
            </div>

            {/* Pin Export Modal */}
            {!readOnly && exportModalOpen && (
                <div className="absolute inset-0 z-[1200] bg-void/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-surface border border-border rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Download size={16} className="text-terminal" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-text-primary">
                                    Export Map Pins ({combinedPins.length} Locations)
                                </h3>
                            </div>
                            <button
                                onClick={() => setExportModalOpen(false)}
                                className="p-1 text-text-dim hover:text-text-primary rounded transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Format Tabs */}
                        <div className="px-4 pt-3 flex items-center justify-between border-b border-border/50">
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setExportFormat('json')}
                                    className={`px-3 py-1.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                                        exportFormat === 'json'
                                            ? 'border-terminal text-terminal'
                                            : 'border-transparent text-text-dim hover:text-text-primary'
                                    }`}
                                >
                                    <FileJson size={14} /> JSON Format
                                </button>
                                <button
                                    onClick={() => setExportFormat('ts')}
                                    className={`px-3 py-1.5 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
                                        exportFormat === 'ts'
                                            ? 'border-terminal text-terminal'
                                            : 'border-transparent text-text-dim hover:text-text-primary'
                                    }`}
                                >
                                    <FileCode size={14} /> TypeScript
                                </button>
                            </div>
                            <div className="flex gap-2 pb-2">
                                <button
                                    onClick={handleCopy}
                                    className="px-2.5 py-1 bg-surface border border-border hover:border-terminal text-text-dim hover:text-terminal rounded text-xs flex items-center gap-1.5 transition-colors"
                                >
                                    {copied ? <Check size={12} className="text-terminal" /> : <Copy size={12} />}
                                    <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                                </button>
                                <button
                                    onClick={handleDownload}
                                    className="px-2.5 py-1 bg-terminal/10 border border-terminal/30 hover:border-terminal text-terminal rounded text-xs flex items-center gap-1.5 transition-colors"
                                >
                                    <Download size={12} />
                                    <span>Download</span>
                                </button>
                            </div>
                        </div>

                        {/* Code Display Area */}
                        <div className="p-4 flex-1 overflow-auto bg-void/50">
                            <pre className="text-[11px] font-mono text-text-dim whitespace-pre leading-relaxed select-all">
                                {exportData}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
