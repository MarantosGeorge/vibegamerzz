/**
 * Thin wrappers over the Rust commands.
 *
 * Everything that touches the filesystem or the network lives on the Rust
 * side; this file is the only place the frontend reaches across that boundary.
 */

import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import type { IgdbGame } from "../types";

let coversDir: string | null = null;

/** Called once at startup so `coverSrc` can stay synchronous afterwards. */
export async function initCovers(): Promise<void> {
  coversDir = await invoke<string>("covers_dir_path");
}

/** A URL the webview can render for a stored cover file. */
export function coverSrc(fileName: string | null): string | null {
  if (!fileName || !coversDir) return null;
  const separator = coversDir.includes("\\") ? "\\" : "/";
  // A cache-buster is unnecessary: file names are unique per save.
  return convertFileSrc(`${coversDir}${separator}${fileName}`);
}

export function dataDir(): Promise<string> {
  return invoke<string>("data_dir");
}

export function saveCoverFromUrl(url: string): Promise<string> {
  return invoke<string>("save_cover_from_url", { url });
}

export function saveCoverFromFile(path: string): Promise<string> {
  return invoke<string>("save_cover_from_file", { path });
}

export function deleteCover(fileName: string): Promise<void> {
  return invoke("delete_cover", { fileName });
}

export function igdbConfigured(): Promise<boolean> {
  return invoke<boolean>("igdb_configured");
}

/** Saving and testing are the same call: credentials are verified before they land on disk. */
export function saveIgdbCredentials(
  clientId: string,
  clientSecret: string,
): Promise<void> {
  return invoke("save_igdb_credentials", { clientId, clientSecret });
}

export function clearIgdbCredentials(): Promise<void> {
  return invoke("clear_igdb_credentials");
}

export function igdbSearch(query: string): Promise<IgdbGame[]> {
  return invoke<IgdbGame[]>("igdb_search", { query });
}

/**
 * Rust commands reject with a plain string; anything else is a genuine crash.
 * Either way the user gets a sentence rather than an object.
 */
export function errorMessage(error: unknown): string {
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}
