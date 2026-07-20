import { contextBridge, ipcRenderer } from 'electron';

/**
 * Surface exposed to the Angular renderer under `window.electronAPI`.
 * Uses `contextIsolation: true` so the renderer never touches Node directly.
 */
const electronAPI = {
  /**
   * Opens the native open-file dialog filtered to JSON files.
   * @returns The selected absolute path, or `null` if the user cancelled.
   */
  openJsonDialog: (): Promise<string | null> => ipcRenderer.invoke('dialog:open-json'),

  /**
   * Reads and validates a JSON file from disk.
   * @param filePath Absolute path to the file.
   * @returns The raw file content (already validated as JSON).
   */
  readJsonFile: (filePath: string): Promise<{ filePath: string; content: string }> =>
    ipcRenderer.invoke('file:read-json', filePath),

  /**
   * Subscribes to the "Open JSON…" application menu event.
   * @param callback Invoked when the user clicks the menu item.
   * @returns A teardown function that removes the listener.
   */
  onOpenJsonMenu: (callback: () => void): (() => void) => {
    const listener = (): void => callback();
    ipcRenderer.on('menu:open-json', listener);
    return () => ipcRenderer.removeListener('menu:open-json', listener);
  },
} as const;

export type ElectronAPI = typeof electronAPI;

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
