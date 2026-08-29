# LOTM Grimoire Separation: Player Grimoire and World Lore Grimoire

- **Audience:** Frontend UI and engineering agents working on the Lord of the Mysteries (LOTM) theme, player HUD, navigation menus, and world reference systems in Narrative Engine / LOTM Desktop.
- **Goal:** Document the architectural split of the singular legacy grimoire into two dedicated components: the **Lord of the Mysteries (World Lore) Grimoire** (home screen encyclopedia) and the **Player Grimoire** (in-game protagonist dossier mounted on the top play menu).
- **Sister docs:**
  - [lotm-ui-combat-restructuring.md](./lotm-ui-combat-restructuring.md) — LOTM UI, combat meters, and player HUD architecture.
  - [lotm-loot-and-artifacts.md](./lotm-loot-and-artifacts.md) — Loot, characteristics, purse currency, and Sealed Artefacts.
  - [gameplay-runtime.md](./gameplay-runtime.md) — Chronicle host runtime.
  - [ui-view-modes.md](./ui-view-modes.md) — UI view modes and permission boundaries.

---

## 1. Overview & Architectural Data Flow

Prior to this separation, a single monolithic `LotmGrimoire` mixed novel world lore (volumes, epochs, pathways, world geography, churches) with player-specific live session data (`ChronicleStrip`).

The refactored architecture establishes two clean, distinct boundaries:
1. **Lord of the Mysteries Grimoire (`LotmGrimoire.tsx`)**: Pure world lore and novel reference encyclopedia accessible from the title hub / home screen (`LotmTitleHub.tsx`). Contains no player or session state.
2. **Player Grimoire (`LotmPlayerGrimoire.tsx`)**: In-game player dossier mounted on the top header menu (`LotmPlayHeader.tsx`). Provides potion progression, location shifting with an interactive world map, read-only Game Master character data, filtered inventory with sealed artefact flaw warnings, and standing/chronicle relations.

```mermaid
flowchart TD
    subgraph StorageAndStore ["Zustand Store (uiSlice.ts & campaignSlice.ts)"]
        uiSlice["UI Slice: grimoireOpen & playerGrimoireOpen"]
        playerData["PlayerCharacter, SignatureKit, ProfileData, Inventory, LocationLedger, NPC Ledger"]
    end

    subgraph HomeScreen ["Home Screen / Title Hub"]
        TitleHub["LotmTitleHub.tsx"]
        TitleHub -->|"Click Grimoire"| OpenWorldLore["openGrimoire()"]
        OpenWorldLore --> LotmWorldGrimoire["LotmGrimoire.tsx\n(Volumes, Epochs, Pathways, World, Churches)"]
    end

    subgraph PlaySession ["In-Game Play Session"]
        PlayHeader["LotmPlayHeader.tsx\n(Top Menu)"]
        PlayHeader -->|"Click Grimoire"| OpenPlayerGrimoire["openPlayerGrimoire()"]
        OpenPlayerGrimoire --> LotmPlayerGrimoire["LotmPlayerGrimoire.tsx\n(Player Grimoire Modal)"]
        playerData --> LotmPlayerGrimoire
    end

    subgraph PlayerGrimoirePanes ["Player Grimoire Sections"]
        LotmPlayerGrimoire --> PotionPane["Potion & Pathway:\nSequence ladder, acting method, next formula, drink potion"]
        LotmPlayerGrimoire --> LocationPane["Location & Travel:\nCurrent place, shift location action, embedded LotmWorldMapView"]
        LotmPlayerGrimoire --> CharacterPane["Character Record (Read-Only GM View):\nIdentity, Personality Hexagon, Traits, Wants, Boundaries, Visuals"]
        LotmPlayerGrimoire --> InventoryPane["Inventory & Belongings:\nEquipped gear, sealed artefacts, downsides, purse currency"]
        LotmPlayerGrimoire --> ChroniclePane["Chronicle & Standing:\nActive/superseded traits, NPC relations, chronicle events"]
    end
```

---

## 2. Store State & Actions (`src/store/slices/uiSlice.ts`)

The UI slice maintains independent open/close states and navigation section pointers for both grimoires.

```ts
export type GrimoireFocus = {
    section: 'volumes' | 'epochs' | 'pathways' | 'world' | 'churches';
    id?: string | null;
};

export type PlayerGrimoireSection = 'character' | 'pathway' | 'location' | 'inventory' | 'chronicle';

export type UISlice = {
    // ── Lord of the Mysteries (World Lore) Grimoire ──
    grimoireOpen: boolean;
    grimoireFocus: GrimoireFocus | null;
    openGrimoire: (focus?: GrimoireFocus) => void;
    closeGrimoire: () => void;
    toggleGrimoire: () => void;
    clearGrimoireFocus: () => void;

    // ── In-Game Player Grimoire ──
    playerGrimoireOpen: boolean;
    playerGrimoireSection: PlayerGrimoireSection;
    openPlayerGrimoire: (section?: PlayerGrimoireSection) => void;
    closePlayerGrimoire: () => void;
    togglePlayerGrimoire: () => void;
    setPlayerGrimoireSection: (section: PlayerGrimoireSection) => void;
};
```

---

## 3. Lord of the Mysteries Grimoire (`LotmGrimoire.tsx`)

- **Placement:** Title Hub / Home Screen (`LotmTitleHub.tsx`).
- **Data Model:** Sourced entirely from static lore catalogs in `src/worldpacks/lotmGrimoireCatalog.ts`.
- **Sections:**
  - `Volumes`: Summaries and chapter spans for Volumes 1 through 8 (e.g., Clown, Faceless, Traveler, Undying, Red Priest, Lightseeker, The Hanged Man, Fool).
  - `Epochs`: Pre-Epoch (Chaos Epoch), First Epoch (Epoch of Chaos), Second Epoch (Dark Epoch), Third Epoch (Cataclysm Epoch), Fourth Epoch (Epoch of the Gods), and Fifth Epoch (Epoch of Iron).
  - `Pathways`: All 22 Beyonder pathways, tarot correlations, sequence titles, and deities.
  - `World`: Geography, languages, currencies, food & drink, and mystical flora/fauna.
  - `Churches`: Orthodox churches, deities worshiped, Beyonder execution squads (e.g., Nighthawks, Mandated Punishers, Machinery Hivemind), and hierarchical structures.
- **Purity:** Pure reference encyclopedia; zero rendering of player character, current place, or active campaign state.

---

## 4. Player Grimoire (`LotmPlayerGrimoire.tsx`)

Mounted in `App.tsx` and opened via the "Grimoire" button on `LotmPlayHeader.tsx`. Styled with the occult dark-gold aesthetic (`.lotm-grimoire*`).

### 4.1 Character Record Section (`section: 'character'`)
Provides a comprehensive read-only Game Master dossier for the protagonist:
- **Identity & Backstory:** Protagonist name, aliases, tier badge, status (`Alive`), faction/church allegiance, and backstory narrative.
- **Personality & Persona:** Disposition summary, speech tone/accent, and iconic dialogue examples.
- **Personality Hexagon (Agency Axes):** Normalized score meters and text band labels for all six axes (`drive`, `diligence`, `boldness`, `warmth`, `empathy`, `composure`).
- **Core Traits & Wants:** Core trait tags with tier tags (`default` / `mature`); short-term, medium-term, and long-term wants.
- **Boundaries & Behavioral Triggers:** Hard boundaries, soft boundaries, and conditional action triggers (`When X → Behavior Y`).
- **Visual Attributes:** Gender, age, build, hair, eye color, skin complexion, clothing description, and distinguishing marks.

### 4.2 Potion & Pathway Section (`section: 'pathway'`)
- **Pathway Banner:** Displays the protagonist's active pathway emblem, pathway name, tarot card association, digestion meter (0–100%), and Loss of Control severity badge.
- **Sequence Ladder:** Interactive ladder representing Sequence 9 down to Sequence 0. Allows inspecting past (digested), current, and upcoming sequences.
- **Acting Principles & Abilities:** Displays current sequence acting method guidelines and full ability compendium details with costs/limits.
- **Advancement Formula & Drink Action:**
  - Previews next Sequence potion art (`potionSrc`), main ingredients, supplementary ingredients, and ritual prerequisites.
  - Includes a "Drink Next Sequence Potion" button invoking `commitLotmPotionDrink()`. Enabled only when digestion is at 100%.

### 4.3 Location & Travel Section (`section: 'location'`)
- **Current Position Card:** Displays current place name, parent region, in-game day counter, and current active feature/room locale.
- **Embedded World Map:** Hosts `<LotmWorldMapView />` with selectable pins for kingdoms, cities, harbors, landmarks, and exploration routes.
- **Available Locations Directory:** Searchable list unifying `locationLedger` entries and canonical world map locales.
- **Shift Location / Travel Action:** Selecting any location or clicking a map pin enables a one-click travel button that updates `context.currentPlaceId` and clears `context.currentFeature`, triggering feedback toasts.

### 4.4 Inventory & Belongings Section (`section: 'inventory'`)
- **Purse Summary:** Header line with formatted Loen monetary units (Pounds, Soli, Pence).
- **Category Tabs:** `All`, `Equipped`, `Weapons`, `Medicines`, `Mystical Items`, `Sealed Artefacts`, `Currency`, and `Misc`.
- **Sealed Artefact Callouts:** Artefacts highlight Grade classification (`Grade 0` to `Grade 3`, `Unique`) and render mandatory negative downsides / flaws with amber alert callouts.

### 4.5 Chronicle & Standing Section (`section: 'chronicle'`)
- **Active Traits:** Dynamic traits established in the chronicle narrative, categorized with scene provenance.
- **Superseded Traits:** Collapsible historical log of evolved or retired character traits.
- **NPC Standing:** Read-only relational affinity meters (`-3` to `+3`) and relationship tier bands (`Devoted`, `Close`, `Friendly`, `Neutral`, `Cold`, `Hostile`, `Arch-enemy`) for all known non-PC NPCs.
- **Divergence Log:** Established chronicle events and history logs affecting the protagonist.

---

## 5. UI Integration & Mount Points

| Component | Responsibility | Action / Trigger |
| :--- | :--- | :--- |
| `src/components/lotm/LotmTitleHub.tsx` | Home screen / title screen | Calls `openGrimoire()` to open the World Lore Grimoire. |
| `src/components/lotm/LotmPlayHeader.tsx` | Top in-game play header | Calls `openPlayerGrimoire()` from the header Grimoire action button. |
| `src/components/lotm/LotmPlayerHud.tsx` | In-game player HUD (Identity & Beyonder details) | Calls `openPlayerGrimoire('character')` to open the Player Grimoire Character Record. |
| `src/components/lotm/LotmPlayerHud.tsx` | In-game player HUD (Pathway emblem) | Calls `openPlayerGrimoire('pathway')` to open the Player Grimoire Potion & Pathway view. |
| `src/components/lotm/LotmPlayHeader.tsx` (`exitLotmCampaign`) | Exiting campaign to Title Hub | Calls both `closeGrimoire()` and `closePlayerGrimoire()`. |
| `src/components/lotm/LotmWorldIndexOverlay.tsx` | World embedding indexing lock | Sets both `grimoireOpen: false` and `playerGrimoireOpen: false`. |
| `src/App.tsx` | Root application shell | Mounts `<LotmGrimoire />` and `<LotmPlayerGrimoire />` when `LOTM_EXCLUSIVE_UI` is active. |

---

## 6. Testing & Regression Suite

Unit test suites validate the isolation and functional parity of both grimoires:

- `src/components/lotm/__tests__/LotmGrimoire.test.tsx`:
  - Validates opening, closing, section switching (Volumes, Epochs, Pathways, World, Churches), search query filtering, and volume detail navigation.
  - Asserts that no player-specific chronicle strip is rendered inside the world lore grimoire.
- `src/components/lotm/__tests__/LotmPlayerGrimoire.test.tsx`:
  - Validates default opening to Potion & Pathway.
  - Tests sequence ladder inspection and advancing sequence levels via `commitLotmPotionDrink()`.
  - Verifies location directory searching, map interaction, and shifting current location.
  - Verifies read-only GM character dossier rendering (identity, hex axes, traits, visual profile).
  - Verifies inventory tab filtering and sealed artefact downside warnings.
  - Tests chronicle standing and bond meters with NPCs.
