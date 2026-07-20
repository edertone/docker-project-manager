import { ApplicationConfig, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { provideElectron } from './core/electron/provide-electron';

export const appConfig: ApplicationConfig = {
  providers: [
    // Zoneless change detection is the modern Angular default for signal-based apps.
    provideZonelessChangeDetection(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideElectron(),
  ],
};
