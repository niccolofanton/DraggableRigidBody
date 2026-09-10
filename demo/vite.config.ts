import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const demoDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = path.resolve(demoDir, '..');

/**
 * The demo imports the component straight from the repository root
 * (`../DraggableRigidBody.tsx`) so it always exercises the published file
 * instead of a copy. That file sits outside `demo/`, so Node resolution walking
 * up from it never reaches `demo/node_modules` and its bare imports (`three`,
 * `react/jsx-runtime`, …) cannot be resolved. This re-resolves those specifiers
 * as if they had been imported from inside `demo/`.
 */
function resolveRepoRootImports(): Plugin {
  return {
    name: 'demo:resolve-repo-root-imports',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (!importer) return null;
      if (!importer.startsWith(repoRoot) || importer.startsWith(demoDir)) return null;
      if (source.startsWith('.') || source.startsWith('/') || path.isAbsolute(source)) return null;

      const resolved = await this.resolve(source, path.join(demoDir, 'index.html'), {
        ...options,
        skipSelf: true,
      });
      return resolved ?? null;
    },
  };
}

export default defineConfig({
  plugins: [resolveRepoRootImports(), react()],
  // Relative base: the build works from a domain root or from a subdirectory.
  base: './',
  server: {
    // the component lives one level above the Vite root
    fs: { allow: [repoRoot] },
  },
  build: {
    target: 'es2022',
    // Rapier ships as `@dimforge/rapier3d-compat`, which inlines its ~1.5 MB
    // WebAssembly module as base64 inside the JS bundle. Nothing is fetched at
    // runtime, but it does make the main chunk large by design.
    chunkSizeWarningLimit: 4000,
  },
});
