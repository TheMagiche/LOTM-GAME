import { useState } from 'react';
import {
  Layers,
  MapPin,
  Compass,
  Database,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import LotmMap from './lotmMap';
import {
  INITIAL_LOCATIONS,
  EXPLORATION_PATHS,
  LOTM_MAP_DIMENSIONS
} from './lotmData';
import mapImage from './Lotm_World_Map.webp';

const LAYER_FILTERS = ['Kingdoms', 'Cities', 'Seas', 'Paths'];

export default function App() {
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [activeLayers, setActiveLayers] = useState({
    kingdoms: true,
    cities: true,
    seas: true,
    paths: true
  });
  const [currentCoords, setCurrentCoords] = useState([-1050, 3450]);
  const [isDataOpen, setIsDataOpen] = useState(false);
  const [draftLocations, setDraftLocations] = useState(
    JSON.stringify(INITIAL_LOCATIONS, null, 2)
  );

  const toggleLayer = (layerKey) => {
    setActiveLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-950 font-sans text-slate-100">
      <aside className="z-10 flex h-full w-80 shrink-0 flex-col border-r border-slate-800 bg-slate-900/90 backdrop-blur">
        <header className="flex items-center gap-2 border-b border-slate-800 p-4">
          <Compass className="h-6 w-6 animate-pulse text-amber-500" />
          <h1 className="text-sm font-bold tracking-wide text-slate-200 uppercase">
            LoTM World Map Atlas
          </h1>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 text-sm">
          <section className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-slate-400">
              <MapPin className="h-4 w-4 text-emerald-400" /> Cursor Coordinates
            </h3>
            <div className="rounded bg-black/40 p-2 font-mono text-xs text-emerald-300">
              [Lat: {currentCoords[0]}, Lng: {currentCoords[1]}]
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              Pixel coords on the sample map: lat = -y, lng = x from the top-left.
            </p>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-slate-400">
              <Layers className="h-4 w-4 text-amber-400" /> Layer Filters
            </h3>
            <div className="space-y-2">
              {LAYER_FILTERS.map((layer) => {
                const key = layer.toLowerCase();
                return (
                  <label
                    key={layer}
                    className="flex cursor-pointer items-center gap-2 text-slate-300 select-none hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked={activeLayers[key]}
                      onChange={() => toggleLayer(key)}
                      className="cursor-pointer rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                    />
                    <span>{layer}</span>
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-lg border border-slate-800 bg-slate-800/40 p-3">
            <button
              type="button"
              onClick={() => setIsDataOpen((open) => !open)}
              className="flex w-full items-center justify-between font-semibold text-slate-400"
            >
              <span className="flex items-center gap-2">
                <Database className="h-4 w-4 text-cyan-400" /> Data Source Editor
              </span>
              {isDataOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
            {isDataOpen && (
              <textarea
                className="mt-3 h-48 w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[11px] text-slate-300 focus:border-amber-500 focus:outline-none"
                value={draftLocations}
                onChange={(event) => {
                  const next = event.target.value;
                  setDraftLocations(next);
                  try {
                    setLocations(JSON.parse(next));
                  } catch {
                    // JSON is still being typed
                  }
                }}
              />
            )}
          </section>
        </div>

        <footer className="border-t border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
          <div className="flex items-center justify-between">
            <span>Points: {locations.length}</span>
            <span>
              Scale: {LOTM_MAP_DIMENSIONS.width} &times; {LOTM_MAP_DIMENSIONS.height} px
            </span>
          </div>
        </footer>
      </aside>

      <main className="relative h-full min-w-0 flex-1">
        <LotmMap
          imageUrl={mapImage}
          dimensions={LOTM_MAP_DIMENSIONS}
          locations={locations}
          paths={EXPLORATION_PATHS}
          activeLayers={activeLayers}
          onCursorMove={setCurrentCoords}
        />
      </main>
    </div>
  );
}
