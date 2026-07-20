import { Injectable } from '@angular/core';

import { ElectronAPI, JsonFileResult } from './electron-api.model';

/**
 * Thin Angular wrapper around the `window.electronAPI` bridge exposed by the
 * preload script. In a pure-web context (e.g. `ng serve` without Electron)
 * the bridge is absent and the service gracefully reports `isElectron() === false`.
 */
@Injectable({ providedIn: 'root' })
export class ElectronService {
  private readonly api = this.resolveApi();

  /** True when running inside an Electron renderer. */
  isElectron(): boolean {
    return this.api !== null;
  }

  /** Opens the native open-file dialog filtered to JSON files. */
  openJsonDialog(): Promise<string | null> {
    this.requireBridge();
    return this.api!.openJsonDialog();
  }

  /** Reads and validates a JSON file from disk. */
  readJsonFile(filePath: string): Promise<JsonFileResult> {
    this.requireBridge();
    return this.api!.readJsonFile(filePath);
  }

  /** Subscribes to the "Open JSON…" application menu event. */
  onOpenJsonMenu(callback: () => void): () => void {
    if (!this.api) {
      return () => undefined;
    }
    return this.api.onOpenJsonMenu(callback);
  }

  private resolveApi(): ElectronAPI | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.electronAPI ?? null;
  }

  private requireBridge(): void {
    if (!this.api) {
      throw new Error(
        'Electron bridge is not available. Run the app with `npm run dev` instead of `npm start`.',
      );
    }
  }
}
