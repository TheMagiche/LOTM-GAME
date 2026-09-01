#19 4.772 ✗ Build failed in 1.66s
#19 4.774 error during build:
#19 4.774 Build failed with 8 errors:
#19 4.774 
#19 4.774 [UNRESOLVED_IMPORT] Could not resolve '../../mechanics/World_compendium/Lord of the Mysteries/item_catalog.json' in src/worldpacks/lotmItemCatalog.ts
#19 4.774    ╭─[ src/worldpacks/lotmItemCatalog.ts:1:33 ]
#19 4.774    │
#19 4.774  1 │ import compiledCatalogJson from "../../mechanics/World_compendium/Lord of the Mysteries/item_catalog.json";
#19 4.774    │                                 ─────────────────────────────────────┬────────────────────────────────────  
#19 4.774    │                                                                      ╰────────────────────────────────────── Module not found.
#19 4.774    │ 
#19 4.774    │ Help: 'src/worldpacks/lotmItemCatalog.ts' is imported by the following path:
#19 4.774    │         - src/worldpacks/lotmItemCatalog.ts
#19 4.774    │         - src/components/InventoryLedgerModal.tsx
#19 4.774    │         - src/App.tsx
#19 4.774    │         - src/main.tsx
#19 4.774    │         - index.html
#19 4.774 ───╯
#19 4.774 
#19 4.774 [UNRESOLVED_IMPORT] Could not resolve '../../mechanics/Ability Compendium/lotm_beyonder_pathways_compendium.json' in src/worldpacks/lotmAbilityCompendium.ts
#19 4.774     ╭─[ src/worldpacks/lotmAbilityCompendium.ts:39:20 ]
#19 4.774     │
#19 4.774  39 │        loading = import("../../mechanics/Ability Compendium/lotm_beyonder_pathways_compendium.json").then((mod) => {
#19 4.774     │                         ─────────────────────────────────────┬─────────────────────────────────────  
#19 4.774     │                                                              ╰─────────────────────────────────────── Module not found.
#19 4.774     │ 
#19 4.774     │ Help: 'src/worldpacks/lotmAbilityCompendium.ts' is imported by the following path:
#19 4.774     │         - src/worldpacks/lotmAbilityCompendium.ts
#19 4.774     │         - src/components/lotm/LotmPlayerGrimoire.tsx
#19 4.774     │         - src/App.tsx
#19 4.774     │         - src/main.tsx
#19 4.774     │         - index.html
#19 4.774 ────╯
#19 4.774 
#19 4.774 [UNRESOLVED_IMPORT] Could not resolve '../../mechanics/World_compendium/Lord of the Mysteries/world_lore_lord_of_the_mysteries.md?raw' in src/worldpacks/lordOfTheMysteries.ts
#19 4.774    ╭─[ src/worldpacks/lordOfTheMysteries.ts:1:20 ]
#19 4.774    │
#19 4.774  1 │ import loreMd from "../../mechanics/World_compendium/Lord of the Mysteries/world_lore_lord_of_the_mysteries.md?raw";
#19 4.774    │                    ────────────────────────────────────────────────┬───────────────────────────────────────────────  
#19 4.774    │                                                                    ╰───────────────────────────────────────────────── Module not found.
#19 4.774    │ 
#19 4.774    │ Help: 'src/worldpacks/lordOfTheMysteries.ts' is imported by the following path:
#19 4.774    │         - src/worldpacks/lordOfTheMysteries.ts
#19 4.774    │         - src/components/lotm/LotmTitleHub.tsx
#19 4.774    │         - src/components/CampaignHub.tsx
#19 4.774    │         - src/App.tsx
#19 4.774    │         - src/main.tsx
#19 4.774    │         - index.html
#19 4.774 ───╯
#19 4.774 
#19 4.774 [UNRESOLVED_IMPORT] Could not resolve '../../mechanics/Ruleset/AI_GM_OS_LOTM_v1.md?raw' in src/worldpacks/lordOfTheMysteries.ts
#19 4.774    ╭─[ src/worldpacks/lordOfTheMysteries.ts:2:21 ]
#19 4.774    │
#19 4.774  2 │ import rulesMd from "../../mechanics/Ruleset/AI_GM_OS_LOTM_v1.md?raw";
#19 4.774    │                     ────────────────────────┬────────────────────────  
#19 4.774    │                                             ╰────────────────────────── Module not found.
#19 4.774    │ 
#19 4.774    │ Help: 'src/worldpacks/lordOfTheMysteries.ts' is imported by the following path:
#19 4.774    │         - src/worldpacks/lordOfTheMysteries.ts
#19 4.774    │         - src/components/lotm/LotmTitleHub.tsx
#19 4.774    │         - src/components/CampaignHub.tsx
#19 4.774    │         - src/App.tsx
#19 4.774    │         - src/main.tsx
#19 4.774    │         - index.html
#19 4.774 ───╯
#19 4.774 
#19 4.774 [UNRESOLVED_IMPORT] Could not resolve '../../mechanics/World_compendium/Lord of the Mysteries/loot.json?raw' in src/worldpacks/lordOfTheMysteries.ts
#19 4.774    ╭─[ src/worldpacks/lordOfTheMysteries.ts:3:22 ]
#19 4.774    │
#19 4.774  3 │ import lootJson from "../../mechanics/World_compendium/Lord of the Mysteries/loot.json?raw";
#19 4.774    │                      ───────────────────────────────────┬──────────────────────────────────  
#19 4.774    │                                                         ╰──────────────────────────────────── Module not found.
#19 4.774    │ 
#19 4.774    │ Help: 'src/worldpacks/lordOfTheMysteries.ts' is imported by the following path:
#19 4.774    │         - src/worldpacks/lordOfTheMysteries.ts
#19 4.774    │         - src/components/lotm/LotmTitleHub.tsx
#19 4.774    │         - src/components/CampaignHub.tsx
#19 4.774    │         - src/App.tsx
#19 4.774    │         - src/main.tsx
#19 4.774    │         - index.html
#19 4.774 ───╯
#19 4.774 
#19 4.774 ...
#19 4.774     at aggregateBindingErrorsIntoJsError (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:48:18)
#19 4.774     at unwrapBindingResult (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:18:128)
#19 4.774     at #build (file:///app/node_modules/rolldown/dist/shared/rolldown-DiYVDns9.mjs:132:34)
#19 4.774     at async buildEnvironment (file:///app/node_modules/vite/dist/node/chunks/node.js:33730:66)
#19 4.774     at async Object.build (file:///app/node_modules/vite/dist/node/chunks/node.js:34150:19)
#19 4.774     at async Object.buildApp (file:///app/node_modules/vite/dist/node/chunks/node.js:34147:153)
#19 4.774     at async CAC.<anonymous> (file:///app/node_modules/vite/dist/node/cli.js:776:3) {
#19 4.774   errors: [Getter/Setter]
#19 4.774 }
#19 ERROR: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 1
------
 > [builder 6/6] RUN npm run build --prefix packages/engine   && if [ "" = "demo" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev:
4.774 ...
4.774     at aggregateBindingErrorsIntoJsError (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:48:18)
4.774     at unwrapBindingResult (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:18:128)
4.774     at #build (file:///app/node_modules/rolldown/dist/shared/rolldown-DiYVDns9.mjs:132:34)
4.774     at async buildEnvironment (file:///app/node_modules/vite/dist/node/chunks/node.js:33730:66)
4.774     at async Object.build (file:///app/node_modules/vite/dist/node/chunks/node.js:34150:19)
4.774     at async Object.buildApp (file:///app/node_modules/vite/dist/node/chunks/node.js:34147:153)
4.774     at async CAC.<anonymous> (file:///app/node_modules/vite/dist/node/cli.js:776:3) {
4.774   errors: [Getter/Setter]
4.774 }
------
Dockerfile:35
--------------------
  34 |     # which currently fails on pre-existing errors and would abort the image build.
  35 | >>> RUN npm run build --prefix packages/engine \
  36 | >>>   && if [ "$VITE_DEPLOYMENT_MODE" = "demo" ]; then npm run build:demo; else npx vite build; fi \
  37 | >>>   && npm prune --omit=dev
  38 |     
--------------------
ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 1
Reference
Check build summary support
Error: buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 1