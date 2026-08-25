import { useState } from 'react';
import { Layers } from 'lucide-react';
import { lotmAssetUrl } from '../../services/lotm/lotmAssetUrl';
import {
    EXPLORATION_PATHS,
    INITIAL_LOCATIONS,
    LOTM_MAP_IMAGE,
    type LotmMapLayerKey,
} from '../../worldpacks/lotmMapData';
import { LotmWorldMap } from './LotmWorldMap';

const LAYER_FILTERS: Array<{ key: LotmMapLayerKey; label: string }> = [
    { key: 'kingdoms', label: 'Kingdoms' },
    { key: 'cities', label: 'Cities' },
    { key: 'seas', label: 'Seas' },
    { key: 'paths', label: 'Paths' },
];

type Props = {
    onSelectName?: (name: string) => void;
};

export function LotmWorldMapView({ onSelectName }: Props) {
    const [activeLayers, setActiveLayers] = useState<Record<LotmMapLayerKey, boolean>>({
        kingdoms: true,
        cities: true,
        seas: true,
        paths: true,
    });

    return (
        <div className="lotm-world-map-view" aria-label="World map">
            <LotmWorldMap
                imageUrl={lotmAssetUrl(LOTM_MAP_IMAGE)}
                locations={INITIAL_LOCATIONS}
                paths={EXPLORATION_PATHS}
                activeLayers={activeLayers}
                onSelectName={onSelectName}
            />
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
        </div>
    );
}
