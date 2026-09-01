#19 4.823 ✗ Build failed in 1.83s
#19 4.824 error during build:
#19 4.824 Build failed with 1 error:
#19 4.824 
#19 4.824 [UNRESOLVED_IMPORT] Could not resolve '../../../docs/MODDING.md?raw' in src/components/settings-modal/ExtensionsTab.tsx
#19 4.824    ╭─[ src/components/settings-modal/ExtensionsTab.tsx:5:30 ]
#19 4.824    │
#19 4.824  5 │ import modGuideMarkdown from "../../../docs/MODDING.md?raw";
#19 4.824    │                              ───────────────┬──────────────  
#19 4.824    │                                             ╰──────────────── Module not found.
#19 4.824    │ 
#19 4.824    │ Help: 'src/components/settings-modal/ExtensionsTab.tsx' is imported by the following path:
#19 4.824    │         - src/components/settings-modal/ExtensionsTab.tsx
#19 4.824    │         - src/components/SettingsModal.tsx
#19 4.824    │         - src/App.tsx
#19 4.824    │         - src/main.tsx
#19 4.824    │         - index.html
#19 4.824 ───╯
#19 4.824 
#19 4.824     at aggregateBindingErrorsIntoJsError (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:48:18)
#19 4.824     at unwrapBindingResult (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:18:128)
#19 4.824     at #build (file:///app/node_modules/rolldown/dist/shared/rolldown-DiYVDns9.mjs:132:34)
#19 4.824     at async buildEnvironment (file:///app/node_modules/vite/dist/node/chunks/node.js:33730:66)
#19 4.824     at async Object.build (file:///app/node_modules/vite/dist/node/chunks/node.js:34150:19)
#19 4.824     at async Object.buildApp (file:///app/node_modules/vite/dist/node/chunks/node.js:34147:153)
#19 4.824     at async CAC.<anonymous> (file:///app/node_modules/vite/dist/node/cli.js:776:3) {
#19 4.824   errors: [Getter/Setter]
#19 4.824 }
#19 ERROR: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 1
------
 > [builder 6/6] RUN npm run build --prefix packages/engine   && if [ "" = "demo" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev:
4.824 
4.824     at aggregateBindingErrorsIntoJsError (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:48:18)
4.824     at unwrapBindingResult (file:///app/node_modules/rolldown/dist/shared/error-CVc7IgvG.mjs:18:128)
4.824     at #build (file:///app/node_modules/rolldown/dist/shared/rolldown-DiYVDns9.mjs:132:34)
4.824     at async buildEnvironment (file:///app/node_modules/vite/dist/node/chunks/node.js:33730:66)
4.824     at async Object.build (file:///app/node_modules/vite/dist/node/chunks/node.js:34150:19)
4.824     at async Object.buildApp (file:///app/node_modules/vite/dist/node/chunks/node.js:34147:153)
4.824     at async CAC.<anonymous> (file:///app/node_modules/vite/dist/node/cli.js:776:3) {
4.824   errors: [Getter/Setter]
4.824 }
------
Dockerfile:37
--------------------
  36 |     # which currently fails on pre-existing errors and would abort the image build.
  37 | >>> RUN npm run build --prefix packages/engine \
  38 | >>>   && if [ "$VITE_DEPLOYMENT_MODE" = "demo" ]; then npm run build:demo; else npx vite build; fi \
  39 | >>>   && npm prune --omit=dev
  40 |     
--------------------
ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 1