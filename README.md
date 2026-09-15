# Lord of the Mysteries

## Version 2.0.0

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Platform: Desktop](https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue)]()
[![Self-Hosted](https://img.shields.io/badge/Self--Hosted-100%25%20Local-brightgreen)]()
[![Discord](https://img.shields.io/badge/Discord-Join%20Server-7289da?logo=discord&logoColor=white)](https://discord.gg/gf3Ntw6pUY)

**A self-hosted Lord of the Mysteries AI RPG.** Play a Fifth Epoch chronicle of gaslight, steam, and hidden gods — an AI Game Master runs the world while you write what your Beyonder does next.

Campaigns stay on your machine. Bring your own OpenAI-compatible key or a local Ollama model. There is no cloud account and no subscription.

This game is built on [Narrative Engine](https://github.com/Sagesheep/NarrativeEngine-P) (MIT). Desktop only — there is no mobile client.

> 💬 **Join the community:** [Discord](https://discord.gg/gf3Ntw6pUY)

---

## Getting Started

1. **Clone the repo**
   ```bash
   git clone https://github.com/TheMagiche/LOTM-GAME.git
   cd LOTM-GAME
   ```

2. **Install & run**

   **Windows** — double-click `Start_Narrative_Engine.bat`

   **Linux / macOS** — run `start.sh`

   **Or manually:**
   ```bash
   npm install
   npm run build --prefix packages/engine
   npm run dev
   ```

3. **Open your browser** at `http://localhost:5173`

4. **Configure your LLM** — open Settings and add your API key + endpoint. Supports OpenAI, Ollama, DeepSeek, OpenRouter, and any OpenAI-compatible API.

That's it. Use **Quick Start** or the LOTM title hub to begin a chronicle.

---

## Updating to the Latest Version

When a new version comes out, you can update your local copy without losing campaigns or settings.

**Windows** — double-click `Update_Narrative_Engine.bat`

It will:

- Download the newest app files from GitHub (`git pull`)
- Run `npm install` to keep dependencies in sync
- Leave saved campaigns, lore, and API keys untouched (the `data/` folder is not tracked by Git)

**Manual:**
```bash
git pull
npm install
```

**Notes**

- Close the app completely before updating (close any terminal windows titled "Narrative Engine").
- If you downloaded the app as a ZIP instead of cloning it, the updater won't work — download the newest ZIP from GitHub instead.
- If you edited any app files directly, the update may ask before overwriting them. Edits inside `data/` are never touched.

After updating, start the app the same way as before (`Start_Narrative_Engine.bat` / `start.sh` / `npm run dev`).

---

## Troubleshooting

**"Node.js is not installed"** when running the start script
Install the LTS version from https://nodejs.org/ and run the script again.

**"needs Node 20 or newer"** when running the start script
Your Node.js is too old. Upgrade to the LTS version at https://nodejs.org/.

**"NODE_MODULE_VERSION mismatch"** error after upgrading Node
Your database module was built for the old Node version. Run the repair script and choose **option 1 (Quick fix)**:

- **Windows** — double-click `Repair_Narrative_Engine.bat`
- **Linux / macOS** — run `./Repair_Narrative_Engine.sh`

If the repair fails on Windows with a C++ build tools error, install the [Visual C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) (select "Desktop development with C++") and run the repair again. Alternatively, run the repair script and choose **option 2 (Full clean reinstall)** — it may succeed without needing the C++ build tools.

**"Cannot find native binding" / "rolldown" / "is not a valid Win32 application"** when starting the app
Your dependency install was incomplete (a known [npm bug](https://github.com/npm/cli/issues/4828) with optional dependencies). Run the repair script and choose **option 2 (Full clean reinstall)**:

- **Windows** — double-click `Repair_Narrative_Engine.bat`
- **Linux / macOS** — run `./Repair_Narrative_Engine.sh`

---

## Playing Lord of the Mysteries

The `mechanics/` folder ships the full LOTM campaign — world lore, GM ruleset, item catalog, starter PCs, and starter prompt.

### Quick start

1. Create a new campaign — or use **Quick Start** / the LOTM title hub (this concatenates the lore author sources automatically)
2. If starting **manually**, open **World Info (Lore)** and paste the compiled file `mechanics/World_compendium/Lord of the Mysteries/world_lore_lord_of_the_mysteries.md` — not the individual files under `lore/`
3. Open **Campaign Settings** and paste `mechanics/Ruleset/AI_GM_OS_LOTM_v1.md` into the **System Prompt** field
4. Start a new chat and paste `mechanics/World_compendium/Lord of the Mysteries/lotm_starterPrompt.md` as your first message
5. The GM will walk you through character creation and then drop you into Tingen — or another Fifth Epoch city, depending on your starter

Existing campaigns do not pick up lore-file edits until you re-upload World Info or create a new campaign.

### What you play

- **Acting Method** — digest potions by living your Sequence. Roleplay the principles behind your Pathway, or risk Loss of Control.
- **Spiritual Actions** — Divination, Spirit Vision, Ritual Magic, Beyonder Power, or the mundane. Sequence Advantage and Spirituality cost shape every d20.
- **Mystical Harvest** — Extraordinary Characteristics, Sealed Artefacts with dangerous flaws, formulas, and Loen coin under the Law of Convergence.
- **Living churches and NPCs** — Nighthawks, Punishers, secret organizations, and named figures from the novel pursue their own goals while the Masquerade holds.

### Lore layout

The engine indexes **one** markdown string per campaign. LOTM is authored as several files and concatenated before import:

| Path | Role |
|---|---|
| `mechanics/World_compendium/Lord of the Mysteries/lore/overview.md` | World premise |
| `…/lore/factions.md` | Churches, secret orgs, noble houses (`## 2a` / `## 2b` / `## 2c` so RAG can retrieve one of each per turn) |
| `…/lore/locations.md` | Geography (seeds the location ledger; RAG-disabled on import) |
| `…/lore/characters_gameplay.md` | Curated gameplay cast (seeds the NPC ledger; RAG-disabled on import) |
| `…/lore/power_economy_events.md` | Pathways, economy, history |
| `…/lore/engine_seeds.md` | Surprise / encounter / quest-hook tables |
| `…/world_lore_lord_of_the_mysteries.md` | Compiled paste target (tests, README, manual upload) |
| `…/characters.md` | Wiki-crawled reference roster — **not loaded** into the engine |
| `…/people/lotm_pc_*.json` | Playable Sequence 9 starter PCs |

Edit the files under `lore/`, then run `npm run lore:compile` so the compiled markdown stays in sync. Format rules (required character fields, engine seeds, RAG hints) live in [`mechanics/World_compendium/CLAUDE.md`](mechanics/World_compendium/CLAUDE.md).

On import, **character** and **location** chunks seed ledgers (the prompt path for people and places). **Factions**, power system, economy, and events stay in RAG (~1200 tokens/turn). Extra wiki fields (`Summary`, `Wiki`, `Fate`) are ignored; use parser fields such as `PersonalityHex`, `Traits`, `Pathway`, `Sequence`, `AlliedWith`, `ConnectedTo`.

---

## Memory That Never Forgets

Long campaigns usually collapse when the LLM runs out of context. This game keeps the Fifth Epoch coherent across sessions.

### Lossless Scene Archive

Every turn — dice, dialogue, narrative beats — is archived verbatim. Nothing is summarised away.

### Two-Phase Deep Archive Search

When the GM needs to recall a sealed chapter:

1. **Chapter scan** — chapter overviews identify which sealed chapters are relevant
2. **Scene retrieval** — specific scenes are retrieved with local vector embeddings (`@huggingface/transformers` ONNX models, stored in `sqlite-vec` via `better-sqlite3`) and injected verbatim

The GM can recall that a Nighthawk promised you something in Chapter 3 — even fifty chapters later.

### Auto-Condensation

When approaching the token limit, older turns compress automatically:

| Strategy | Compression | Best for |
|---|---|---|
| **Tight** | ~50% | Long-running campaigns, smaller context windows |
| **Smart** | ~75% | Balanced play (default) |
| **Deep** | Maximum detail | Short campaigns, large context windows |

The most recent 8 messages stay verbatim. Dice rolls, Spirit values, and proper names are preserved. Dramatic moments are tagged and survive re-compression.

### Pinned Memories & Divergence Register

Pin any passage so it stays in every GM call. The Divergence Register tracks who is where, who holds what, alliances, deaths, promises, and debts — with `knownBy` permissions so NPCs cannot metagame secrets they should not know.

---

## Living NPCs

NPCs are simulated characters, not static blurbs.

- Detected as they appear; profiles include personality, voice, goals, faction, and (for the curated cast) portraits from `gamedata/image/characters/`
- **Personality hexagon** on six axes (−3 to +3): Drive, Diligence, Boldness, Warmth, Empathy, Composure — values drift as events land
- Short-, medium-, and long-term goals advance in the background; colliding goals surface as rumours or events
- PC relation meters, pressure (`ignored` / `engaged`), boundaries, and skill rungs
- Inactive NPCs archive and restore when they return

Generate extra portraits on the fly if you want (Realistic, Anime Realistic, Anime, Western RPG, Chibi) via any OpenAI-compatible image API. Images stay local.

---

## World Simulation

- **World Arcs** — 5-to-12 rung background storylines (coups, plagues, church purges) that advance by dice whether or not you engage
- **Surprise / Encounter / World Event engines** — configurable probability tables; the longer nothing happens, the more likely something will
- **Timeskip** — write *"three weeks later"* and NPC goals, faction conflicts, and world state move forward
- **Witness tracking** — scenes record who was present vs merely mentioned, so recall prefers what an NPC actually saw

The **Overworld Map** is the Fifth Epoch geography (Loen, Intis, Feysac, the Sonia Sea, the Forsaken Land of the Gods). Custom pins mark locations, events, and points of interest.

---

## Dice, Combat & Consistency

The **Dice Fairness** system pre-rolls d20 pools each turn for Combat, Perception, Stealth, Social, Movement, Knowledge, and Mundane — Disadvantage / Normal / Advantage — so the GM uses real rolls. Mid-response `roll_dice` returns tier results (Catastrophe → Failure → Success → Triumph → Critical).

**Lore Check** flags a passage against your world bible and archive (wrong fact, contradicts lore, wrong NPC/place, tone, out of character) and can suggest a one-click rewrite.

The GM can also query campaign lore, update the scene notebook, propose inventory changes, and initiate combat via tool calls (OpenAI function calling and DeepSeek DSML fallback).

---

## Security & Privacy

- **Encrypted API key vault** — AES-256-GCM, password-optional
- **Machine-key mode** — keys auto-unlock on your device
- **Password mode** — PBKDF2 with 100K iterations
- **Client-side encryption** — keys are encrypted in the browser before they touch the server
- **100% local vector search** — no campaign text is sent to third-party vector providers
- Campaign data lives as local files — export and import your vault for backups
- Automatic backups before risky operations; scene-level rollback restores world state to that point

---

## Supported LLM Providers

Any OpenAI-compatible API works. Configure up to 5 endpoints per preset:

| Role | Purpose |
|---|---|
| **Story AI** | Main GM narration — required |
| **Summarizer AI** | Condensing old history (can use a cheaper/faster model) |
| **Utility AI** | Lore checks, divergence structuring, archive reranking, rule indexing |
| **Image AI** | Portrait and scene illustration generation |
| **Auxiliary AI** | Witness capture, NPC intro engine, scene analysis fallback |

Each endpoint has its own model, API key, base URL, and sampling config. Thinking/reasoning effort is supported where the provider offers it.

Works with Ollama for fully local play — no internet required after setup.

---

## Quick Reference

| Action | Command |
|---|---|
| Install & run (Windows) | Double-click `Start_Narrative_Engine.bat` |
| Install & run (Linux / macOS) | Run `start.sh` |
| Update to latest (Windows) | Double-click `Update_Narrative_Engine.bat` |
| Update to latest (manual) | `git pull` then `npm install` |
| Install manually | `npm install` |
| Start the app | `npm run dev` |
| Recompile LOTM lore after editing `lore/` | `npm run lore:compile` |
| Run tests | `npm run test` |
| Lint | `npm run lint` |

---

## License

This project is licensed under the [MIT License](LICENSE) — Copyright (c) 2026 Sagesheep.

The core engine is [Narrative Engine](https://github.com/Sagesheep/NarrativeEngine-P). Lord of the Mysteries characters, settings, and terminology are intellectual property of their respective owners (Cuttlefish That Loves Diving / the official rights holders). This project is unofficial fan content and is not affiliated with or endorsed by the rights holders.
