/**
 * Database access.
 *
 * Reads are deliberately unfiltered - the whole library is loaded once and
 * searching, filtering and sorting happen in memory. A personal collection is
 * hundreds of rows, not millions, so this is instant, and it keeps SQL out of
 * the parts of the UI that change most often.
 */

import Database from "@tauri-apps/plugin-sql";
import type { Game, GameInput, WishlistEntry, WishlistInput } from "../types";
import { SAMPLE_GAMES, SAMPLE_WISHLIST } from "./sampleData";

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

/* ---------- Wishlist ------------------------------------------------------
 *
 * A separate table because a wishlist entry is not a game - see docs/adr/0005.
 * These read the same way the game functions do: everything at once, filtered
 * and sorted in memory.
 */

type WishlistRow = Omit<WishlistEntry, "genres"> & { genres: string | null };

export async function listWishlist(): Promise<WishlistEntry[]> {
  const handle = await db();
  const rows = await handle.select<WishlistRow[]>("SELECT * FROM wishlist");
  return rows.map((row) => ({ ...row, genres: parseGenres(row.genres) }));
}

export async function createWishlistEntry(input: WishlistInput): Promise<number> {
  const handle = await db();
  const timestamp = nowIso();
  const result = await handle.execute(
    `INSERT INTO wishlist (
       title, priority, critic_rating, genres, cover_file, notes, igdb_id,
       summary, release_date, is_sample, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11)`,
    [
      input.title,
      input.priority,
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

export async function updateWishlistEntry(
  id: number,
  input: WishlistInput,
): Promise<void> {
  const handle = await db();
  await handle.execute(
    `UPDATE wishlist SET
       title = $1, priority = $2, critic_rating = $3, genres = $4,
       cover_file = $5, notes = $6, igdb_id = $7, summary = $8,
       release_date = $9, updated_at = $10
     WHERE id = $11`,
    [
      input.title,
      input.priority,
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

export async function deleteWishlistEntry(id: number): Promise<void> {
  const handle = await db();
  await handle.execute("DELETE FROM wishlist WHERE id = $1", [id]);
}

/**
 * Buying an entry: the game is written, then the entry is dropped.
 *
 * The cover file is handed over rather than copied - it is a file on disk with a
 * name, and the new row points at the same name. Nothing is written and nothing
 * is orphaned, which is why the caller must not run its usual delete-the-old-
 * cover cleanup over this one.
 *
 * The two statements are not in a transaction. If the delete somehow failed
 * after the insert, the entry would still be sitting there to be removed by
 * hand, which is a far better failure than an entry silently vanishing with no
 * game to show for it.
 */
export async function buyWishlistEntry(
  entryId: number,
  input: GameInput,
): Promise<number> {
  const gameId = await createGame(input);
  await deleteWishlistEntry(entryId);
  return gameId;
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

/**
 * Seeds both tables from one action. The wishlist groups by priority, so an
 * empty one demonstrates nothing about itself - not even its three headings.
 */
export async function loadSamples(): Promise<void> {
  const handle = await db();
  const timestamp = nowIso();
  for (const entry of SAMPLE_WISHLIST) {
    await handle.execute(
      `INSERT INTO wishlist (
         title, priority, critic_rating, genres, notes, summary, release_date,
         is_sample, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,1,$8,$9)`,
      [
        entry.title,
        entry.priority,
        entry.critic_rating,
        serialiseGenres(entry.genres),
        entry.notes,
        entry.summary,
        entry.release_date,
        timestamp,
        timestamp,
      ],
    );
  }
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

/** Counted separately rather than summed: they are different kinds of thing. */
export interface SampleCounts {
  games: number;
  wishlist: number;
}

export async function countSamples(): Promise<SampleCounts> {
  const handle = await db();
  const [games, wishlist] = await Promise.all([
    handle.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM games WHERE is_sample = 1"),
    handle.select<{ n: number }[]>("SELECT COUNT(*) AS n FROM wishlist WHERE is_sample = 1"),
  ]);
  return { games: games[0]?.n ?? 0, wishlist: wishlist[0]?.n ?? 0 };
}

/**
 * Clears both tables, and returns the cover files that were orphaned across the
 * two so the caller can delete them.
 */
export async function clearSamples(): Promise<string[]> {
  const handle = await db();
  const [games, wishlist] = await Promise.all([
    handle.select<{ cover_file: string | null }[]>(
      "SELECT cover_file FROM games WHERE is_sample = 1",
    ),
    handle.select<{ cover_file: string | null }[]>(
      "SELECT cover_file FROM wishlist WHERE is_sample = 1",
    ),
  ]);
  await handle.execute("DELETE FROM games WHERE is_sample = 1");
  await handle.execute("DELETE FROM wishlist WHERE is_sample = 1");
  return [...games, ...wishlist]
    .map((row) => row.cover_file)
    .filter((file): file is string => !!file);
}
