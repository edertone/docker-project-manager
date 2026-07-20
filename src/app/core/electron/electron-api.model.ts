/**
 * Shape of the bridge exposed by `electron/preload.ts` under `window.electronAPI`.
 * Mirrors the runtime contract so the renderer stays fully typed.
 */
export interface ElectronAPI {
  openJsonDialog(): Promise<string | null>;
  readJsonFile(filePath: string): Promise<JsonFileResult>;
  onOpenJsonMenu(callback: () => void): () => void;
}

export interface JsonFileResult {
  filePath: string;
  content: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
