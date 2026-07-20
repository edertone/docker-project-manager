import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/json-viewer/json-viewer.component').then((m) => m.JsonViewerComponent),
    title: 'JSON Viewer',
  },
  {
    path: '**',
    redirectTo: '',
  },
];
