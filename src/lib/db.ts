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
       release_date, parent_id, is_sample, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,0,$15,$16)`,
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
      input.parent_id,
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
       release_date = $13, parent_id = $14, updated_at = $15
     WHERE id = $16`,
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
      input.parent_id,
      nowIso(),
      id,
    ],
  );
}

/**
 * What deleting a game took with it, so the toast can say so rather than
 * leaving the user to notice.
 */
export interface GameDeletion {
  /** DLC deleted along with the base game. */
  dlc: number;
  /** Wishlist entries that named it and are now parentless, not deleted. */
  wishlistFreed: number;
  /** Cover files no longer referenced by any row, for the caller to remove. */
  covers: string[];
}

/**
 * Delete a game, and everything filed under it.
 *
 * Its DLC go with it: they are additions to a game that is no longer in the
 * library, and the confirm dialog says how many before anything happens.
 * Wishlist entries that named it do not - deleting something you own is not a
 * statement that you stopped wanting something else, so they lose their parent
 * and stay on the wishlist as ordinary entries.
 *
 * Done here rather than with `ON DELETE CASCADE` for two reasons. The wishlist
 * half reaches into another table and changes rather than deletes, which no
 * foreign key on `games` could express. And a declared cascade would only fire
 * with `PRAGMA foreign_keys` on for the pool, which this app does not set and
 * should not have to depend on. The `REFERENCES` in migration 7 is
 * documentation; this function is the behaviour.
 *
 * Two statements, and deliberately not wrapped in BEGIN/COMMIT - the same call
 * this file already makes in `buyWishlistEntry`. `execute` takes a connection
 * from a pool per call, so a hand-rolled transaction can issue its BEGIN on
 * one connection and its DELETE on another: the writes autocommit anyway and
 * the BEGIN is left holding a lock nothing will release. A transaction that is
 * only a transaction by accident of pool size is worse than none.
 *
 * So the order carries the safety instead. The wishlist is freed first, since
 * a failure after that leaves entries that lost a parent still sitting on the
 * wishlist, which is visible and fixable by hand. The two deletes are one
 * statement - `id = ?1 OR parent_id = ?1` - so a base game and its DLC can
 * never half-go.
 *
 * The cover files come back rather than being deleted here, because deleting
 * files is the Rust side's job - same split as `clearSamples`.
 */
export async function deleteGame(id: number): Promise<GameDeletion> {
  const handle = await db();

  const children = await handle.select<{ id: number; cover_file: string | null }[]>(
    "SELECT id, cover_file FROM games WHERE parent_id = $1",
    [id],
  );
  const own = await handle.select<{ cover_file: string | null }[]>(
    "SELECT cover_file FROM games WHERE id = $1",
    [id],
  );

  const freed = await handle.execute(
    "UPDATE wishlist SET parent_id = NULL, updated_at = $1 WHERE parent_id = $2",
    [nowIso(), id],
  );
  await handle.execute("DELETE FROM games WHERE id = $1 OR parent_id = $1", [id]);

  return {
    dlc: children.length,
    wishlistFreed: freed.rowsAffected,
    covers: [...own, ...children]
      .map((row) => row.cover_file)
      .filter((file): file is string => !!file),
  };
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
       summary, release_date, parent_id, is_sample, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,$11,$12)`,
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
      input.parent_id,
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
       release_date = $9, parent_id = $10, updated_at = $11
     WHERE id = $12`,
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
      input.parent_id,
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
  // Inserted one at a time rather than in a batch so that each row's id is
  // known before the next is written: a sample DLC names its base game by
  // title, and the id it needs is the one the insert just returned. Base games
  // come first in SAMPLE_GAMES for exactly this reason.
  const idsByTitle = new Map<string, number>();
  for (const game of SAMPLE_GAMES) {
    const result = await handle.execute(
      `INSERT INTO games (
         title, platform, status, achievement_pct, playtime_minutes, rating,
         critic_rating, genres, notes, summary, release_date, parent_id,
         is_sample, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,1,$13,$14)`,
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
        game.dlc_for ? (idsByTitle.get(game.dlc_for) ?? null) : null,
        timestamp,
        timestamp,
      ],
    );
    idsByTitle.set(game.title, Number(result.lastInsertId));
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
