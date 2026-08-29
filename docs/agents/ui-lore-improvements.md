# LOTM UI and lore-context improvements

- **Audience:** a UI agent in a **different** context window. Read [`gameplay-runtime.md`](./gameplay-runtime.md) first for what already exists.
- **Goal:** surface gameplay and lore the engine already knows. Players should see Beyonder status, Standing, and chronicle context without opening operator screens.
- **Sister docs:**
  - [gameplay-runtime.md](./gameplay-runtime.md) — chronicle host runtime.
  - [lotm-combat-runtime.md](./lotm-combat-runtime.md) — in-world Beyonder combat runtime.
  - [lotm-loot-and-artifacts.md](./lotm-loot-and-artifacts.md) — characteristics and Sealed Artifacts.
  - [lotm-ui-combat-restructuring.md](./lotm-ui-combat-restructuring.md) — combat HUD and modal restructuring spec.
- **Do not change:** [`turnOrchestrator.ts`](../../src/services/turn/turnOrchestrator.ts), the loot tree walker, Sequence math in [`lotmBeyonderState.ts`](../../src/worldpacks/lotmBeyonderState.ts), NPC agency, loot root keys, or hydrator church/geo merge (stays `isLotmCampaign`-gated).
- **Do not replace** Grimoire novel JSON with a second lore parser. Link to it; do not fork it.

This is an implementation brief, not a visual redesign. Prefer the illustrated shell over new GM-OS chrome.

---

## Current surfaces

Inventory of what already ships. Do not rebuild these; extend them.

### Play (illustrated)

| Surface | Path | Player sees |
|---------|------|-------------|
| Shell | [`LotmIllustratedShell.tsx`](../../src/components/lotm/LotmIllustratedShell.tsx) | HUD + chat + chapter toast + index lock |
| HUD | [`LotmPlayerHud.tsx`](../../src/components/lotm/LotmPlayerHud.tsx), [`lotmPlayerHudModel.ts`](../../src/components/lotm/lotmPlayerHudModel.ts) | Name, emblem, pathway · sequence, Spirit meter, Sequence ladder, Sequence ability names. Expanded: location, bounty when posted, **digestion %**, stats, carried items including coins. No Acting Method, separate purse line, potion art, or next-Sequence preview. HP is `null`. Click identity → Character Ledger. |
| Dialogue | [`LotmDialoguePlate.tsx`](../../src/components/lotm/LotmDialoguePlate.tsx) | GM beat carousel, location nameplate, scene modal |
| Stage | [`LotmSceneModal.tsx`](../../src/components/lotm/LotmSceneModal.tsx), [`LotmStage.tsx`](../../src/components/lotm/LotmStage.tsx) | Backdrop + on-stage portraits via [`lotmVisualMatcher.ts`](../../src/services/lotm/lotmVisualMatcher.ts) |
| Header | [`LotmPlayHeader.tsx`](../../src/components/lotm/LotmPlayHeader.tsx) | Menu, Grimoire, Illustrated / Chronicle toggle, AI tier |
| Chat | [`ChatArea.tsx`](../../src/components/ChatArea.tsx) | Composer; [`DiceRollModal.tsx`](../../src/components/chat/DiceRollModal.tsx); [`LootRollModal.tsx`](../../src/components/chat/LootRollModal.tsx) (labels from [`lotmLootLabels.ts`](../../src/worldpacks/lotmLootLabels.ts)) |

Chronicle toggle shows the classic transcript instead of the dialogue plate. Dice and loot still arm on the composer.

### Reference

[`LotmGrimoire.tsx`](../../src/components/lotm/LotmGrimoire.tsx) + [`lotmGrimoireCatalog.ts`](../../src/worldpacks/lotmGrimoireCatalog.ts): Volumes, Epochs, Pathways, World (geography / languages / creatures / food / currency), Churches.

That catalog is **novel reference**. It explicitly excludes potion formulas, abilities, items, and live campaign state.

World map: [`LotmWorldMap.tsx`](../../src/components/location-ledger/LotmWorldMap.tsx) / [`LotmWorldMapView.tsx`](../../src/components/location-ledger/LotmWorldMapView.tsx). Shown as the default pane in the **Location Ledger** when no place is selected — not in the HUD or Grimoire.

Potion art lives under `gamedata/assets/data/pathways/*/potions/*.webp` and has **no UI references** in `src/`.

### Sheet

[`CharacterLedgerModal.tsx`](../../src/components/character/CharacterLedgerModal.tsx):

| Tab | Path | LOTM fields |
|-----|------|-------------|
| Sheet | [`SheetTab.tsx`](../../src/components/character/tabs/SheetTab.tsx), [`LotmPathwayKitFields.tsx`](../../src/components/lotm/LotmPathwayKitFields.tsx) | Pathway / Sequence kit, portrait |
| Record | [`RecordTab.tsx`](../../src/components/character/tabs/RecordTab.tsx), [`pcBonds.ts`](../../src/components/character/pcBonds.ts) | Identity; **Standing** = non-zero `pcRelation` bars (read-only) |
| Stats | [`StatsTab.tsx`](../../src/components/character/tabs/StatsTab.tsx) | Origin, Pathway, Sequence, Spirit, Spirituality / Physique / Reasoning; Acting Method as skills; **next** sequence acting + formula |
| Inventory | [`InventoryTab.tsx`](../../src/components/character/tabs/InventoryTab.tsx) | Generic grid; no Loen purse summary row |

HP is hidden on the LOTM Stats path. Digestion and LoC are **not** on any tab.

### Operator drawer

[`ContextNavigationDrawer.tsx`](../../src/components/ContextNavigationDrawer.tsx): Character, ledgers, Ask GM, dice/loot, then Engine (Rules, Lore, Engines, Chapter, Memory). Rules / Lore tabs are GM-OS admin, not player lore.

Ask GM ([`AskGmPanel.tsx`](../../src/components/ooc/AskGmPanel.tsx)) is the only player-facing semantic lore search and is buried in that menu. [`WorldPrimerPanel.tsx`](../../src/components/character/WorldPrimerPanel.tsx) is **orphaned** (no play-shell imports).

Lore RAG hits go to the GM prompt only. Indexing status is [`LotmWorldIndexOverlay.tsx`](../../src/components/lotm/LotmWorldIndexOverlay.tsx) / [`IndexingBanner.tsx`](../../src/components/IndexingBanner.tsx).

---

## Prioritized work

Each item: engine source of truth already exists. Wire UI. Do not recompute in the client.

### 1. HUD as Beyonder status

**Player-visible outcome:** LoC stage and digestion sit beside Spirit without opening Inventory. After a fairness roll, the player can see the engine Sequence band (Advantage vs mundanes, etc.). Current Acting Method and current formula are readable. Ability names can expand to costs/limits.

| | |
|--|--|
| Current files | [`LotmPlayerHud.tsx`](../../src/components/lotm/LotmPlayerHud.tsx), [`lotmPlayerHudModel.ts`](../../src/components/lotm/lotmPlayerHudModel.ts), [`StatsTab.tsx`](../../src/components/character/tabs/StatsTab.tsx) |
| Engine source | [`lotmBeyonderState.ts`](../../src/worldpacks/lotmBeyonderState.ts) `readLossOfControl`, `readDigestion`, `resolveSequenceAdvantage`, `LOC_STAGE_LABELS`; [`lotmPathways.ts`](../../src/worldpacks/lotmPathways.ts) `getLotmSequence`; [`lotmAbilityCompendium.ts`](../../src/worldpacks/lotmAbilityCompendium.ts) |
| Tests | [`LotmPlayerHud.test.tsx`](../../src/components/lotm/__tests__/LotmPlayerHud.test.tsx), [`lotmPlayerHudModel.test.ts`](../../src/components/lotm/__tests__/lotmPlayerHudModel.test.ts) |

Do not show HP. Do not let the HUD pick a dice band — display what `resolveEngineRolls` already collapsed.

### 2. Grimoire ↔ live chronicle

**Player-visible outcome:** Grimoire stays the encyclopedia. “Your Tingen” is live: current place on the map, church/faction from the **faction ledger**, your pathway’s Acting Method + next formula from `getLotmSequence` (already on Stats “To advance”). HUD emblem opens that pathway page. Geography cards can focus the Location Ledger map. Optional: in-play Codex from divergence `rules_lore` — separate from novel volumes.

| | |
|--|--|
| Current files | [`LotmGrimoire.tsx`](../../src/components/lotm/LotmGrimoire.tsx), [`lotmGrimoireCatalog.ts`](../../src/worldpacks/lotmGrimoireCatalog.ts), [`LotmWorldMap.tsx`](../../src/components/location-ledger/LotmWorldMap.tsx), Location Ledger modal |
| Engine source | `context.currentPlaceId` + `locationLedger`; faction ledger from [`lotmChurches.ts`](../../src/worldpacks/lotmChurches.ts); `getLotmSequence` |
| Tests | [`LotmGrimoire.test.tsx`](../../src/components/lotm/__tests__/LotmGrimoire.test.tsx) |

Do not dump full novel spoilers into the HUD. Do not load a second copy of world lore markdown into Grimoire.

### 3. Potion / advancement as a player action

**Player-visible outcome:** current + next sequence potion art and formula on Stats/HUD. A drink/commit control that writes `pcMeta.digestion`, Sequence, and `characterProfileData.abilities` through **existing store setters** (`updatePlayerCharacter`, `setCharacterProfileData`).

| | |
|--|--|
| Current files | Stats “To advance” block; kit fields on Sheet |
| Engine source | `*_advancement.json` via [`lotmPathways.ts`](../../src/worldpacks/lotmPathways.ts) (`actingMethod`, `formula`, `consumptionBacklash`); potion webp under `gamedata/assets/data/pathways/*/potions/` |
| Tests | [`StatsTab`](../../src/components/character/tabs/StatsTab.tsx) coverage if present; otherwise add a small HUD/Stats test around the drink writer |

No brewing simulator. No new digestion tick in `turnStages` unless gameplay-runtime is extended first. Sequence promotion remains gated by digestion 100% in the rules; the UI must not silently increment Sequence.

### 4. Standing and lore context in play

**Player-visible outcome:** on-stage NPC relation **bands** (words, not raw −3..+3) on the dialogue plate or scene modal. Ask GM on the play header beside Grimoire. Optional player-safe “what you know” strip from on-stage item/faction injection — not the Lore tab RAG dump.

| | |
|--|--|
| Current files | [`RecordTab.tsx`](../../src/components/character/tabs/RecordTab.tsx), [`pcBonds.ts`](../../src/components/character/pcBonds.ts), [`LotmDialoguePlate.tsx`](../../src/components/lotm/LotmDialoguePlate.tsx), [`LotmPlayHeader.tsx`](../../src/components/lotm/LotmPlayHeader.tsx), [`AskGmPanel.tsx`](../../src/components/ooc/AskGmPanel.tsx) |
| Engine source | `npcLedger` `pcRelation` + [`agencyBands.ts`](../../src/services/npc/agency/agencyBands.ts) `relationBand`; `onStageNpcIds`; Ask GM already retrieves lore/archive |
| Tests | [`ledgerParity.test.tsx`](../../src/components/character/__tests__/ledgerParity.test.tsx), [`LotmPlayerHud.test.tsx`](../../src/components/lotm/__tests__/LotmPlayerHud.test.tsx) for header if you add Ask GM there |

Do not let the UI write `pcRelation`. Standing is engine-owned.

Candidate (not required): wire orphaned [`WorldPrimerPanel.tsx`](../../src/components/character/WorldPrimerPanel.tsx) into title hub / first session as a digest, not a second RAG engine.

### 5. Vocabulary consistency

**Player-visible outcome:** Illustrated mode never says Race, Class, HP, Bonds, mundane/named/uncanny, or common→legendary rarity. Operator screens may keep GM-OS names.

| | |
|--|--|
| Current files | Loot modal already uses `labelLotmLootCategory`. Stats Origin / Pathway / Sequence. Record Standing. Dice modal still uses generic category names (Combat / Mundane). Context drawer still “System Context.” |
| Engine source | N/A — copy only |
| Tests | [`ledgerParity.test.tsx`](../../src/components/character/__tests__/ledgerParity.test.tsx); loot label tests in [`lotmGamedataWiring.test.ts`](../../src/worldpacks/__tests__/lotmGamedataWiring.test.ts) |

Sweep: [`DiceRollModal.tsx`](../../src/components/chat/DiceRollModal.tsx), [`ContextNavigationDrawer.tsx`](../../src/components/ContextNavigationDrawer.tsx), Stats leftover “Mundane” if any, Inventory tab. Prefer splitting nav **Play** (Character, Grimoire, Map, Ask GM) vs **Chronicle tools** (Lore / Rules admin) without deleting the admin tabs.

**Loot/dice receipts (same priority band):** the loot modal arms weights; resolved items appear only in chat. Add a post-drop receipt from the armed-loot merge already done in `resolveEngineRolls`. Dice modal: read-only Sequence-band line from `resolveSequenceAdvantage`. Inventory tab: pence / soli / pounds row matching [`lotmPurse.ts`](../../src/worldpacks/lotmPurse.ts) `formatLotmPurseLine`.

---

## Out of scope

- Rewriting `runTurn` or `resolveEngineRolls` Sequence math.
- Changing loot.json root keys or the walker in `@narrative/engine`.
- NPC agency, tone meter, or allowing the LLM to set `pcRelation`.
- Replacing Grimoire gamedata JSON with parsed `world_lore_*.md`.
- Ungating hydrator church/geography merge onto non-LOTM campaigns.
- Tactical combat UI, brewing simulation, or auto-incrementing digestion.

If a change needs a new engine field, stop and extend gameplay-runtime first.

---

## Suggested order

1. HUD LoC + digestion + Sequence band (highest leverage; data is already on the PC).
2. Vocabulary sweep so Illustrated copy matches LOTM.
3. Grimoire “your pathway” + map link.
4. Standing on the dialogue plate + Ask GM on the header.
5. Potion art + drink/commit writer.
6. Loot receipt + Inventory purse row.

Verify illustrated play in the browser: HUD meters, Grimoire shortcut, Record Standing still read-only, dice/loot still arm without breaking commit.
