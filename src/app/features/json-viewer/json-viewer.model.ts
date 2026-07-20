/**
 * Domain models for the JSON viewer feature.
 */

export type JsonViewerStatus = 'idle' | 'loading' | 'loaded' | 'error';

export interface JsonDocument {
  filePath: string;
  /** Pretty-printed JSON text ready to be displayed as plain text. */
  content: string;
  /** Parsed value, kept for future features (tree view, search, etc.). */
  parsed: unknown;
  sizeBytes: number;
  loadedAt: number;
}

export interface JsonViewerError {
  message: string;
  filePath?: string;
}
