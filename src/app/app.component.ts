import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ElectronService } from './core/electron/electron.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app-shell">
      <header class="app-shell__header">
        <h1 class="app-shell__title">Docker Project Manager</h1>
        <span class="app-shell__status">
          {{ electron.isElectron() ? 'Desktop' : 'Web' }} mode
        </span>
      </header>
      <main class="app-shell__main">
        <router-outlet />
      </main>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
      }

      .app-shell {
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      .app-shell__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
        background: var(--app-surface);
        border-bottom: 1px solid var(--app-border);
      }

      .app-shell__title {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
      }

      .app-shell__status {
        font-size: 0.75rem;
        color: var(--app-muted);
      }

      .app-shell__main {
        flex: 1 1 auto;
        overflow: auto;
      }
    `,
  ],
})
export class AppComponent {
  protected readonly electron = inject(ElectronService);
}
