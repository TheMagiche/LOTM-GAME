/**
 * Curated LOTM visual index for in-play matching.
 */

export type LotmPlaceVisual = {
  id: string;
  aliases: string[];
  backdrop: string;
};

export type LotmPortraitVisual = {
  id: string;
  aliases: string[];
  portrait: string;
};

export const LOTM_DEFAULT_BACKDROP = "image/backgrounds/tingen_city.webp";
export const LOTM_COVER = "image/cover.webp";
export const LOTM_LATE_VOLUME_CUTOFF = 4;

export const LOTM_PLACES: LotmPlaceVisual[] = [
  {
    id: "tingen",
    aliases: [
      "tingen",
      "tagen",
      "st. selena",
      "st selena",
      "dorge",
      "print-house",
      "print house",
    ],
    backdrop: "image/backgrounds/tingen_city.webp",
  },
  {
    id: "backlund",
    aliases: [
      "backlund",
      "loen",
      "east chester",
      "bridge district",
      "queens district",
      "west borough",
    ],
    backdrop: "image/backgrounds/backlund_city.webp",
  },
  {
    id: "divination-club",
    aliases: ["divination club", "divination club of tingen"],
    backdrop: "image/backgrounds/divination_club.webp",
  },
  {
    id: "sefirah-castle",
    aliases: [
      "sefirah",
      "sefirah castle",
      "grey fog",
      "above the grey fog",
      "the fool's palace",
    ],
    backdrop: "image/backgrounds/sefirah_castle.webp",
  },
  {
    id: "spirit-world",
    aliases: ["spirit world", "spirit-world", "spirit body"],
    backdrop: "image/backgrounds/spirit_world.webp",
  },
  {
    id: "mind-world",
    aliases: ["mind world", "dream world", "psychological alchemy"],
    backdrop: "image/backgrounds/mind_world.webp",
  },
  {
    id: "city-of-silver",
    aliases: ["city of silver", "forsaken land"],
    backdrop: "image/backgrounds/city_of_silver.webp",
  },
  {
    id: "calderon",
    aliases: ["calderon", "calderon city"],
    backdrop: "image/backgrounds/calderon_city.webp",
  },
  {
    id: "giant-kings-court",
    aliases: ["giant king", "giant king's court", "giant kings court"],
    backdrop: "image/backgrounds/giant_king_s_court.webp",
  },
  {
    id: "inverted-mausoleum",
    aliases: ["inverted mausoleum", "mausoleum"],
    backdrop: "image/backgrounds/inverted_mausoleum.webp",
  },
];

/** Playable PCs under `gamedata/image/players/` — staged like character portraits. */
export const LOTM_PLAYER_PORTRAITS: LotmPortraitVisual[] = [
  {
    id: "clara-whitlock",
    aliases: ["clara whitlock", "clara"],
    portrait: "image/players/clara_whitlock.webp",
  },
  {
    id: "benedict-faulkner",
    aliases: ["benedict faulkner", "benedict", "professor faulk"],
    portrait: "image/players/benedict_faulkner.webp",
  },
  {
    id: "arthur-pendel",
    aliases: ["arthur pendel", "arthur", "constable pendel"],
    portrait: "image/players/arthur_pendel.webp",
  },
  {
    id: "cassian-dray",
    aliases: ["cassian dray", "cassian", "brother cass"],
    portrait: "image/players/cassian_dray.webp",
  },
  {
    id: "delphine-roche",
    aliases: ["delphine roche", "delphine", "mademoiselle invention"],
    portrait: "image/players/delphine_roche.webp",
  },
  {
    id: "edmund-vale",
    aliases: ["edmund vale", "edmund"],
    portrait: "image/players/edmund_vale.webp",
  },
  {
    id: "emil-vasari",
    aliases: ["emil vasari", "emil", "doc"],
    portrait: "image/players/emil_vasari.webp",
  },
  {
    id: "evangeline-moss",
    aliases: ["evangeline moss", "evangeline", "sister evie"],
    portrait: "image/players/evangeline_moss.webp",
  },
  {
    id: "greta-ashdown",
    aliases: ["greta ashdown", "greta", "the iron widow"],
    portrait: "image/players/greta_ashdown.webp",
  },
  {
    id: "henrietta-stanley",
    aliases: ["henrietta stanley", "henrietta", "judge hen"],
    portrait: "image/players/henrietta_stanley.webp",
  },
  {
    id: "isadora-quill",
    aliases: ["isadora quill", "isadora"],
    portrait: "image/players/isadora_quill.webp",
  },
  {
    id: "jacob-thorne",
    aliases: ["jacob thorne", "jacob", "thorn"],
    portrait: "image/players/jacob_thorne.webp",
  },
  {
    id: "marcus-webb",
    aliases: ["marcus webb", "marcus", "webb the warden"],
    portrait: "image/players/marcus_webb.webp",
  },
  {
    id: "margaret-odell",
    aliases: ["margaret o'dell", "margaret odell", "margaret", "maggie"],
    portrait: "image/players/margaret_odell.webp",
  },
  {
    id: "mordecai-ash",
    aliases: ["mordecai ash", "mordecai", "the quiet partner"],
    portrait: "image/players/mordecai_ash.webp",
  },
  {
    id: "rosalind-hart",
    aliases: ["rosalind hart", "rosalind"],
    portrait: "image/players/rosalind_hart.webp",
  },
  {
    id: "sabine-vex",
    aliases: ["sabine vex", "sabine", "madame indulgence"],
    portrait: "image/players/sabine_vex.webp",
  },
  {
    id: "samuel-bright",
    aliases: ["samuel bright", "samuel", "brother samuel"],
    portrait: "image/players/samuel_bright.webp",
  },
  {
    id: "silas-croft",
    aliases: ["silas croft", "silas", "magpie"],
    portrait: "image/players/silas_croft.webp",
  },
  {
    id: "theo-vance",
    aliases: ["theo vance", "theo", "lucky vance"],
    portrait: "image/players/theo_vance.webp",
  },
  {
    id: "thomas-reiner",
    aliases: ["thomas reiner", "thomas"],
    portrait: "image/players/thomas_reiner.webp",
  },
  {
    id: "vivienne-noir",
    aliases: ["vivienne noir", "vivienne", "madame v"],
    portrait: "image/players/vivienne_noir.webp",
  },
];

export const LOTM_PORTRAITS: LotmPortraitVisual[] = [
  ...LOTM_PLAYER_PORTRAITS,
  {
    id: "dunn-smith",
    aliases: ["dunn smith", "dunn", "captain dunn"],
    portrait: "image/characters/dunn_smith.webp",
  },
  {
    id: "leonard-mitchell",
    aliases: ["leonard mitchell", "leonard"],
    portrait: "image/characters/leonard_mitchell.webp",
  },
  {
    id: "audrey-hall",
    aliases: ["audrey hall", "audrey", "miss justice"],
    portrait: "image/characters/audrey_hall.webp",
  },
  {
    id: "alger-wilson",
    aliases: ["alger wilson", "alger", "the hanged man"],
    portrait: "image/characters/alger_wilson.webp",
  },
  {
    id: "fors-wall",
    aliases: ["fors wall", "fors", "the magician"],
    portrait: "image/characters/fors_wall.webp",
  },
  {
    id: "xio-derecha",
    aliases: ["xio derecha", "xio", "judgment"],
    portrait: "image/characters/xio_derecha.webp",
  },
  {
    id: "azik-eggers",
    aliases: ["azik eggers", "azik"],
    portrait: "image/characters/azik_eggers.webp",
  },
  {
    id: "daly-simone",
    aliases: ["daly simone", "daly"],
    portrait: "image/characters/daly_simone.webp",
  },
  {
    id: "klein-nighthawk",
    aliases: ["klein moretti", "klein"],
    portrait: "image/characters/klein_moretti_nighthawk.webp",
  },
  {
    id: "zhou-mingrui",
    aliases: ["zhou mingrui"],
    portrait: "image/characters/zhou_mingrui.webp",
  },
  {
    id: "the-fool",
    aliases: ["the fool"],
    portrait: "image/characters/the_fool.webp",
  },
  {
    id: "gehrman-sparrow",
    aliases: ["gehrman sparrow", "gehrman"],
    portrait: "image/characters/gehrman_sparrow.webp",
  },
  {
    id: "sherlock-moriarty",
    aliases: ["sherlock moriarty", "sherlock"],
    portrait: "image/characters/sherlock_moriarty.webp",
  },
  {
    id: "merlin-hermes",
    aliases: ["merlin hermes", "merlin"],
    portrait: "image/characters/merlin_hermes.webp",
  },
  {
    id: "cattleya",
    aliases: ["cattleya", "the hermit"],
    portrait: "image/characters/cattleya.webp",
  },
  {
    id: "emlyn-white",
    aliases: ["emlyn white", "emlyn", "the moon"],
    portrait: "image/characters/emlyn_white.webp",
  },
  {
    id: "derrick-berg",
    aliases: ["derrick berg", "derrick", "the sun"],
    portrait: "image/characters/derrick_berg.webp",
  },
  // Public church title — not the spoiler true-name (Aucuses). Keep these
  // aliases longer than Derrick's tarot code "the sun" so longest-match wins.
  {
    id: "eternal-blazing-sun",
    aliases: [
      "the eternal blazing sun",
      "eternal blazing sun",
      "the sun god",
      "sun god",
    ],
    portrait: "image/characters/aucuses.webp",
  },
  {
    id: "sharron",
    aliases: ["sharron"],
    portrait: "image/characters/sharron.webp",
  },
  {
    id: "danitz",
    aliases: ["danitz dubois", "danitz"],
    portrait: "image/characters/danitz_dubois.webp",
  },
  {
    id: "edwina",
    aliases: ["edwina edwards", "edwina"],
    portrait: "image/characters/edwina_edwards.webp",
  },
  {
    id: "bernadette",
    aliases: ["bernadette gustav", "bernadette"],
    portrait: "image/characters/bernadette_gustav.webp",
  },
  {
    id: "roselle",
    aliases: ["roselle gustav", "roselle"],
    portrait: "image/characters/roselle_gustav.webp",
  },
  {
    id: "will-auceptin",
    aliases: ["will auceptin", "will"],
    portrait: "image/characters/will_auceptin.webp",
  },
  {
    id: "colin-iliad",
    aliases: ["colin iliad", "colin"],
    portrait: "image/characters/colin_iliad.webp",
  },
  {
    id: "frank-lee",
    aliases: ["frank lee", "frank"],
    portrait: "image/characters/frank_lee.webp",
  },
  {
    id: "reinette",
    aliases: ["reinette tinekerr", "reinette"],
    portrait: "image/characters/reinette_tinekerr.webp",
  },
  {
    id: "trissy",
    aliases: ["trissy"],
    portrait: "image/characters/trissy.webp",
  },
  {
    id: "ince-zangwill",
    aliases: ["ince zangwill", "ince"],
    portrait: "image/characters/ince_zangwill.webp",
  },
  {
    id: "cynthia",
    aliases: ["cynthia"],
    portrait: "image/characters/cynthia.webp",
  },
  {
    id: "true-creator",
    aliases: ["true creator"],
    portrait: "image/characters/true_creator.webp",
  },
  {
    id: "amon",
    aliases: ["amon"],
    portrait: "image/characters/amon.webp",
  },
  {
    id: "adam",
    aliases: ["adam"],
    portrait: "image/characters/adam.webp",
  },
  {
    id: "evernight",
    aliases: ["evernight goddess", "evernight", "goddess of the night"],
    portrait: "image/characters/evernight_goddess.webp",
  },
  {
    id: "ouroboros",
    aliases: ["ouroboros"],
    portrait: "image/characters/ouroboros.webp",
  },
  {
    id: "sasrir",
    aliases: ["sasrir"],
    portrait: "image/characters/sasrir.webp",
  },
  {
    id: "aucuses",
    aliases: ["aucuses"],
    portrait: "image/characters/aucuses.webp",
  },
  {
    id: "leodero",
    aliases: ["leodero"],
    portrait: "image/characters/leodero.webp",
  },
  {
    id: "herabergen",
    aliases: ["herabergen"],
    portrait: "image/characters/herabergen.webp",
  },
  {
    id: "medici",
    aliases: ["sauron einhorn medici", "medici"],
    portrait: "image/characters/sauron_einhorn_medici.webp",
  },
];

export const LOTM_PATHWAY_SYMBOLS: Record<string, string> = {
  fool: "assets/data/pathways/fool_pathway/Fool_Symbol2.webp",
  seer: "assets/data/pathways/fool_pathway/Fool_Symbol2.webp",
  door: "assets/data/pathways/door_pathway/Door_Symbol2.webp",
  error: "assets/data/pathways/error_pathway/Error_Symbol2.webp",
  darkness: "assets/data/pathways/darkness_pathway/Darkness_Symbol2.webp",
  sleepless: "assets/data/pathways/darkness_pathway/Darkness_Symbol2.webp",
  death: "assets/data/pathways/death_pathway/Death_Symbol2.webp",
  visionary: "assets/data/pathways/visionary_pathway/Visionary_Symbol2.webp",
  spectator: "assets/data/pathways/visionary_pathway/Visionary_Symbol2.webp",
  tyrant: "assets/data/pathways/tyrant_pathway/Tyrant_Symbol2.webp",
  sailor: "assets/data/pathways/tyrant_pathway/Tyrant_Symbol2.webp",
  sun: "assets/data/pathways/sun_pathway/Sun_Symbol2.webp",
  hermit: "assets/data/pathways/hermit_pathway/Hermit_Symbol2.webp",
  hanged_man: "assets/data/pathways/hanged_man_pathway/Hanged_Man_Symbol2.webp",
};

export const LOTM_CHURCH_EMBLEMS: Record<string, string> = {
  evernight:
    "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_Evernight_Goddess2.webp",
  storms:
    "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_Lord_of_Storms2.webp",
  steam:
    "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_God_of_Steam_and_Machinery2.webp",
  knowledge:
    "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_God_of_Knowledge_and_Wisdom2.webp",
  sun: "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_Eternal_Blazing_Sun2.webp",
  earth:
    "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_Earth_Mother2.webp",
  fool: "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_Fool2.webp",
  combat:
    "assets/data/churches/Emblems/Sacred_Emblem_-_Church_of_the_God_of_Combat2.webp",
};

export function normalizeAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
