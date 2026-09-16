import * as esbuild from 'esbuild';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

const importMetaUrlPlugin = {
  name: 'import-meta-url',
  setup(build) {
    build.onLoad({ filter: /\.[cm]?js$/ }, async (args) => {
      if (args.path.includes(`${path.sep}node_modules${path.sep}`)) return undefined;
      const source = await readFile(args.path, 'utf8');
      if (!source.includes('import.meta.url')) return undefined;
      return {
        contents: source.replaceAll('import.meta.url', '__import_meta_url'),
        loader: 'js',
      };
    });
  },
};

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['server.js'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outfile: 'server.bundle.cjs',
  target: 'node20',
  sourcemap: false,
  logLevel: 'info',
  banner: {
    js: "var __import_meta_url = require('url').pathToFileURL(__filename).href;",
  },
  loader: {
    '.json': 'json',
  },
  external: [
    'better-sqlite3',
    'sqlite-vec',
    'onnxruntime-node',
    'sharp',
    'kokoro-js',
    '@huggingface/transformers',
    'electron',
  ],
  plugins: [importMetaUrlPlugin],
});

console.log('[build-server] wrote server.bundle.cjs');
