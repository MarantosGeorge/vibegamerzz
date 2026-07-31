/**
 * Database access.
 *
 * Reads are deliberately unfiltered - the whole library is loaded once and
 * searching, filtering and sorting happen in memory. A personal collection is
 * hundreds of rows, not millions, so this is instant, and it keeps SQL out of
 * the parts of the UI that change most often.
 */

import Database from "@tauri-apps/plugin-sql";
import type { Game, GameInput } from "../types";
import { SAMPLE_GAMES } from "./sampleData";

const DB_URL = "sqlite:gamerzz.db";

let connection: Promise<Database> | null = null;

function db(): Promise<Database> {
  if (!connection) connection = Database.load(DB_URL);
  return connection;
}

const nowIso = () => new Date().toISOString();

/** A row exactly as SQLite hands it over, before `genres` is parsed. */
type GameRow = Omit<Game, "genres"> & { genres: string | null };

/**
 * Genres live in one TEXT column as a JSON array. A hand-edited or truncated
 * database should not take the whole library down, so anything unparseable
 * degrades to "no genres" instead of throwing.
 */
function parseGenres(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

const serialiseGenres = (genres: string[]) =>
  genres.length > 0 ? JSON.stringify(genres) : null;

export async function listGames(): Promise<Game[]> {
  const handle = await db();
  const rows = await handle.select<GameRow[]>("SELECT * FROM games");
  return rows.map((row) => ({ ...row, genres: parseGenres(row.genres) }));
}

export async function createGame(input: GameInput): Promise<number> {
  const handle = await db();
  const timestamp = nowIso();
  const result = await handle.execute(
    `INSERT INTO games (
       title, platform, status, achievement_pct, playtime_minutes, rating,
       critic_rating, genres, cover_file, notes, igdb_id, summary,
       release_date, is_sample, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,$14,$15)`,
    [
      input.title,
      input.platform,
      input.status,
      input.achievement_pct,
      input.playtime_minutes,
      input.rating,
      input.critic_rating,
      serialiseGenres(input.genres),
      input.cover_file,
      input.notes,
      input.igdb_id,
      input.summary,
      input.release_date,
      timestamp,
      timestamp,
    ],
  );
  return Number(result.lastInsertId);
}

export async function updateGame(id: number, input: GameInput): Promise<void> {
  const handle = await db();
  await handle.execute(
    `UPDATE games SET
       title = $1, platform = $2, status = $3, achievement_pct = $4,
       playtime_minutes = $5, rating = $6, critic_rating = $7, genres = $8,
       cover_file = $9, notes = $10, igdb_id = $11, summary = $12,
       release_date = $13, updated_at = $14
     WHERE id = $15`,
    [
      input.title,
      input.platform,
      input.status,
      input.achievement_pct,
      input.playtime_minutes,
      input.rating,
      input.critic_rating,
      serialiseGenres(input.genres),
      input.cover_file,
      input.notes,
      input.igdb_id,
      input.summary,
      input.release_date,
      nowIso(),
      id,
    ],
  );
}

export async function deleteGame(id: number): Promise<void> {
  const handle = await db();
  await handle.execute("DELETE FROM games WHERE id = $1", [id]);
}

/** Used by the card grid to jump a game between statuses without opening the form. */
export async function setStatus(id: number, status: string): Promise<void> {
  const handle = await db();
  await handle.execute("UPDATE games SET status = $1, updated_at = $2 WHERE id = $3", [
    status,
    nowIso(),
    id,
  ]);
}

export async function listStorefronts(): Promise<string[]> {
  const handle = await db();
  const rows = await handle.select<{ name: string }[]>(
    "SELECT name FROM storefronts ORDER BY sort_order, name",
  );
  return rows.map((row) => row.name);
}

export async function addStorefront(name: string): Promise<void> {
  const handle = await db();
  // Slots new entries just above "Other" so the list stays readable.
  await handle.execute(
    "INSERT OR IGNORE INTO storefronts (name, sort_order) VALUES ($1, 500)",
    [name],
  );
}

export async function loadSampleGames(): Promise<void> {
  const handle = await db();
  const timestamp = nowIso();
  for (const game of SAMPLE_GAMES) {
    await handle.execute(
      `INSERT INTO games (
         title, platform, status, achievement_pct, playtime_minutes, rating,
         critic_rating, genres, notes, summary, release_date, is_sample,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,1,$12,$13)`,
      [
        game.title,
        game.platform,
        game.status,
        game.achievement_pct,
        game.playtime_minutes,
        game.rating,
        game.critic_rating,
        serialiseGenres(game.genres),
        game.notes,
        game.summary,
        game.release_date,
        timestamp,
        timestamp,
      ],
    );
  }
}

export async function countSampleGames(): Promise<number> {
  const handle = await db();
  const rows = await handle.select<{ n: number }[]>(
    "SELECT COUNT(*) AS n FROM games WHERE is_sample = 1",
  );
  return rows[0]?.n ?? 0;
}

/** Returns the cover files that were orphaned, so the caller can delete them. */
export async function clearSampleGames(): Promise<string[]> {
  const handle = await db();
  const rows = await handle.select<{ cover_file: string | null }[]>(
    "SELECT cover_file FROM games WHERE is_sample = 1",
  );
  await handle.execute("DELETE FROM games WHERE is_sample = 1");
  return rows.map((row) => row.cover_file).filter((file): file is string => !!file);
}
