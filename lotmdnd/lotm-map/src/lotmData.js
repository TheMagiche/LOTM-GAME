import continents from './Geography/continents_realms.json';
import nations from './Geography/nations.json';
import seas from './Geography/seas_and_oceans.json';

export const LOTM_MAP_DIMENSIONS = {
  width: 7400,
  height: 3800
};

const loreByName = new Map(
  [
    ...continents.continents_and_realms.list,
    ...nations.major_nations_and_cities.list,
    ...seas.seas_and_oceans.list
  ].map((item) => [item.name, item])
);

const loreAliases = {
  'Western Continent': 'Western Continent',
  'Forsaken Land of the Gods': 'Eastern Continent (Forsaken Land of the Gods)',
  Tingen: 'Tingen'
};

function loreFor(name) {
  return loreByName.get(name) || loreByName.get(loreAliases[name]);
}

function pin({ id, name, type, category, coordinates, loreName = name }) {
  const lore = loreFor(loreName);
  return {
    id,
    name,
    type,
    category,
    coordinates,
    description: lore?.description ?? '',
    details: lore?.type ?? type
  };
}

// Coordinates are [lat, lng] = [-y, x] in Lotm_World_Map.webp pixels (7400 x 3800).
export const INITIAL_LOCATIONS = [
  pin({
    id: 'western-continent',
    name: 'Western Continent',
    type: 'region',
    category: 'Kingdoms',
    coordinates: [-1250, 1100]
  }),
  pin({
    id: 'northern-continent',
    name: 'Northern Continent',
    type: 'region',
    category: 'Kingdoms',
    coordinates: [-1050, 3450]
  }),
  pin({
    id: 'southern-continent',
    name: 'Southern Continent',
    type: 'region',
    category: 'Kingdoms',
    coordinates: [-2350, 3650]
  }),
  pin({
    id: 'forsaken-land',
    name: 'Forsaken Land of the Gods',
    type: 'region',
    category: 'Kingdoms',
    coordinates: [-1280, 6450]
  }),
  pin({
    id: 'loen-kingdom',
    name: 'Loen Kingdom',
    type: 'nation',
    category: 'Kingdoms',
    coordinates: [-1180, 3850]
  }),
  pin({
    id: 'intis-republic',
    name: 'Intis Republic',
    type: 'nation',
    category: 'Kingdoms',
    coordinates: [-1120, 3050]
  }),
  pin({
    id: 'feynapotter-kingdom',
    name: 'Feynapotter Kingdom',
    type: 'nation',
    category: 'Kingdoms',
    coordinates: [-1480, 3180]
  }),
  pin({
    id: 'feysac-empire',
    name: 'Feysac Empire',
    type: 'nation',
    category: 'Kingdoms',
    coordinates: [-680, 3500]
  }),
  pin({
    id: 'rorsted-archipelago',
    name: 'Rorsted Archipelago',
    type: 'region',
    category: 'Kingdoms',
    coordinates: [-1680, 4380]
  }),
  pin({
    id: 'backlund',
    name: 'Backlund',
    type: 'city',
    category: 'Cities',
    coordinates: [-1260, 3920]
  }),
  pin({
    id: 'tingen',
    name: 'Tingen',
    type: 'city',
    category: 'Cities',
    coordinates: [-1080, 3720]
  }),
  pin({
    id: 'trier',
    name: 'Trier',
    type: 'city',
    category: 'Cities',
    coordinates: [-1140, 2980]
  }),
  pin({
    id: 'cordu-village',
    name: 'Cordu Village',
    type: 'village',
    category: 'Cities',
    coordinates: [-1320, 2780]
  }),
  pin({
    id: 'bayam',
    name: 'Bayam',
    type: 'city',
    category: 'Cities',
    coordinates: [-1700, 4420]
  }),
  pin({
    id: 'city-of-silver',
    name: 'City of Silver',
    type: 'landmark',
    category: 'Cities',
    coordinates: [-1380, 6380]
  }),
  pin({
    id: 'sonia-sea',
    name: 'Sonia Sea',
    type: 'sea',
    category: 'Seas',
    coordinates: [-1150, 4800]
  }),
  pin({
    id: 'fog-sea',
    name: 'Fog Sea',
    type: 'sea',
    category: 'Seas',
    coordinates: [-1650, 2100]
  }),
  pin({
    id: 'berserk-sea',
    name: 'Berserk Sea',
    type: 'sea',
    category: 'Seas',
    coordinates: [-1780, 3480]
  })
];

export const EXPLORATION_PATHS = [
  {
    id: 'klein-journey',
    name: 'Exploration Path (Backlund → Southern Seas → Forsaken Land)',
    color: '#38bdf8',
    dashArray: '5, 10',
    coordinates: [
      [-1260, 3920],
      [-1780, 3480],
      [-2350, 3650],
      [-1680, 4380],
      [-1280, 6450]
    ]
  }
];
