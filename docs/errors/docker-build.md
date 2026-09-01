#19 ERROR: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 127
------
 > [builder 6/6] RUN npm run build --prefix packages/engine   && if [ "" = "demo" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev:
5.758 - Adjust chunk size limit for this warning via build.chunkSizeWarningLimit.
5.764 ✓ built in 2.85s
14.60 npm error code 127
14.60 npm error path /app/packages/engine
14.60 npm error command failed
14.60 npm error command sh -c npm run build
14.60 npm error > @narrative/engine@0.1.0 build
14.60 npm error > tsc -p tsconfig.json
14.60 npm error sh: 1: tsc: not found
14.60 npm error A complete log of this run can be found in: /root/.npm/_logs/2026-09-01T18_57_14_131Z-debug-0.log
------
Dockerfile:37
--------------------
  36 |     # which currently fails on pre-existing errors and would abort the image build.
  37 | >>> RUN npm run build --prefix packages/engine \
  38 | >>>   && if [ "$VITE_DEPLOYMENT_MODE" = "demo" ]; then npm run build:demo; else npx vite build; fi \
  39 | >>>   && npm prune --omit=dev
  40 |     
--------------------
ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 127
Reference
Check build summary support
Error: buildx failed with: ERROR: failed to build: failed to solve: process "/bin/sh -c npm run build --prefix packages/engine   && if [ \"$VITE_DEPLOYMENT_MODE\" = \"demo\" ]; then npm run build:demo; else npx vite build; fi   && npm prune --omit=dev" did not complete successfully: exit code: 127