import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';

/**
 * Placeholder for any Electron-related providers that need to be registered at
 * bootstrap (e.g. mock bridges for tests). `ElectronService` itself is already
 * tree-shakable and `providedIn: 'root'`, so by default this is a no-op kept
 * for symmetry with other `provide*` helpers in the app.
 */
export function provideElectron(): EnvironmentProviders {
  return makeEnvironmentProviders([]);
}
