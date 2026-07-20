import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from } from 'rxjs';

import { ElectronService } from '../../core/electron/electron.service';
import { JsonDocument, JsonViewerError, JsonViewerStatus } from './json-viewer.model';

@Component({
  selector: 'app-json-viewer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './json-viewer.component.html',
  styleUrl: './json-viewer.component.scss',
})
export class JsonViewerComponent implements OnInit, OnDestroy {
  private readonly electron = inject(ElectronService);
  private readonly destroyRef = inject(DestroyRef);

  // --- State (signals) -----------------------------------------------------
  private readonly _status = signal<JsonViewerStatus>('idle');
  private readonly _document = signal<JsonDocument | null>(null);
  private readonly _error = signal<JsonViewerError | null>(null);

  // --- Public read-only views ---------------------------------------------
  readonly status = this._status.asReadonly();
  readonly document = this._document.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isLoading = computed(() => this._status() === 'loading');
  readonly hasDocument = computed(() => this._document() !== null);
  readonly hasError = computed(() => this._error() !== null);
  readonly isElectron = computed(() => this.electron.isElectron());

  private menuTeardown: (() => void) | null = null;

  ngOnInit(): void {
    // Wire the "Open JSON…" application menu to the same handler as the button.
    this.menuTeardown = this.electron.onOpenJsonMenu(() => {
      void this.openFile();
    });
  }

  ngOnDestroy(): void {
    this.menuTeardown?.();
  }

  // --- Actions -------------------------------------------------------------

  async openFile(): Promise<void> {
    if (!this.electron.isElectron()) {
      this._error.set({
        message: 'This feature requires the Electron desktop shell. Run `npm run dev`.',
      });
      this._status.set('error');
      return;
    }

    try {
      this._status.set('loading');
      this._error.set(null);

      const filePath = await this.electron.openJsonDialog();
      if (!filePath) {
        // User cancelled the dialog — return to the previous state.
        this._status.set(this._document() ? 'loaded' : 'idle');
        return;
      }

      await this.loadFile(filePath);
    } catch (err) {
      this.setError(err);
    }
  }

  async loadFile(filePath: string): Promise<void> {
    this._status.set('loading');
    this._error.set(null);

    from(this.electron.readJsonFile(filePath))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: ({ filePath: path, content }) => {
          const parsed = JSON.parse(content) as unknown;
          const pretty = JSON.stringify(parsed, null, 2);
          this._document.set({
            filePath: path,
            content: pretty,
            parsed,
            sizeBytes: new Blob([content]).size,
            loadedAt: Date.now(),
          });
          this._status.set('loaded');
        },
        error: (err) => this.setError(err, filePath),
      });
  }

  copyToClipboard(): void {
    const doc = this._document();
    if (!doc) {
      return;
    }
    void navigator.clipboard.writeText(doc.content);
  }

  clear(): void {
    this._document.set(null);
    this._error.set(null);
    this._status.set('idle');
  }

  // --- Template helpers ----------------------------------------------------

  formatBytes(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  formatTime(timestamp: number): string {
    return new Date(timestamp).toLocaleTimeString();
  }

  private setError(err: unknown, filePath?: string): void {
    const message = err instanceof Error ? err.message : String(err);
    this._error.set({ message, filePath });
    this._status.set('error');
  }
}
