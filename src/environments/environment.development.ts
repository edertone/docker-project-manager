/**
 * Development environment.
 * Use `import { environment } from 'src/environments/environment';` and let the
 * CLI swap to `environment.prod.ts` via `fileReplacements` if you wire it up.
 */
export const environment = {
  production: false,
  appName: 'Docker Project Manager (Dev)',
  version: '0.1.0-dev',
} as const;
