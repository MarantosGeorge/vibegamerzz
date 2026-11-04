/**
 * The library as base games with DLC filed under them.
 *
 * Nesting is structural, not a layout: both views draw it, identically, and
 * there is no flat option to turn it off. That is what keeps `CONTEXT.md`'s
 * rule about views true - "the day a view hides a game is the day it has
 * become a filter" - because what collapses a DLC out of the top level is the
 * parent it names, not the view drawing it. See docs/adr/0008.
 *
 * Depth is one. `games.parent_id` could express a chain, so this is where the
 * cap is actually enforced on the way out: anything whose parent is not itself
 * a base game is drawn at the top level rather than dropped. Both of the shapes
 * that reaches - a parent that no longer exists, and a parent that is itself
 * DLC - are states the app does not create. Degrading to "visible at the top"
 * is the right failure for both, because a game you own vanishing from your
 * library is the one outcome worth ruling out.
 */

import type { Game } from "../types";

/** A base game and everything filed under it. */
export interface GameNode {
  game: Game;
  /**
   * Every DLC this game has, in the active sort order - not just the ones that
   * matched. The panel and the list tree show a whole folder once you have
   * opened it, the way a file manager does; `matched` below is what says
   * whether it was worth opening.
   */
  dlc: Game[];
  /**
   * How many of `dlc` passed the active filter. Equal to `dlc.length` when
   * nothing is filtering, which is what lets the badge print a bare count then
   * and "1 of 2" only when the distinction means something.
   */
  matched: number;
}

/** A game with no parent. Being DLC is having a parent; there is no flag. */
export const isDlc = (game: Game): boolean => game.parent_id !== null;

/**
 * Build the top level of the library.
 *
 * `matchedIds` is the set that passed the filters and the search, computed per
 * game the way it always has been - nesting changes which games are *drawn*
 * together, never which ones match. A base game is drawn when it matched or
 * when any of its DLC did, which is the one place a tile on screen can fail
 * the active filter: it is there as the address of something that matched, and
 * the badge says so rather than letting it read as a match of its own.
 *
 * `compare` orders both levels, so the toolbar's key and direction mean the
 * same thing inside a folder as outside it. There is one answer to "how is
 * this sorted".
 */
export function nest(
  games: Game[],
  matchedIds: Set<number>,
  compare: (a: Game, b: Game) => number,
): GameNode[] {
  const baseIds = new Set(games.filter((game) => !isDlc(game)).map((game) => game.id));

  const children = new Map<number, Game[]>();
  const tops: Game[] = [];

  for (const game of games) {
    // A parent that is missing, or that is itself DLC, is not a parent we can
    // draw under - the game comes to the top level instead of disappearing.
    if (game.parent_id !== null && baseIds.has(game.parent_id)) {
      const siblings = children.get(game.parent_id);
      if (siblings) siblings.push(game);
      else children.set(game.parent_id, [game]);
    } else {
      tops.push(game);
    }
  }

  const nodes: GameNode[] = [];
  for (const game of tops) {
    const dlc = (children.get(game.id) ?? []).sort(compare);
    const matched = dlc.reduce((n, child) => n + (matchedIds.has(child.id) ? 1 : 0), 0);
    if (matchedIds.has(game.id) || matched > 0) {
      nodes.push({ game, dlc, matched });
    }
  }

  return nodes.sort((a, b) => compare(a.game, b.game));
}

/**
 * The games something may be filed under: base games, never itself.
 *
 * Half of the one-level cap on the way in. A game that already has DLC is a
 * perfectly good parent and stays on this list - what is excluded is DLC
 * itself, because filing something under a DLC is what would make a
 * grandchild.
 */
export function parentOptions(games: Game[], excludeId: number | null): Game[] {
  return games
    .filter((game) => !isDlc(game) && game.id !== excludeId)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
}

/**
 * Whether this game may be filed under another at all - the other half of the
 * cap. A base game with DLC of its own cannot become DLC, because it would
 * take its children down to a level that does not exist. The form disables the
 * dropdown and says why rather than offering a choice that cannot be saved.
 *
 * `null` is a game that does not exist yet, which never has children.
 */
export function hasDlc(games: Game[], id: number | null): boolean {
  return id !== null && games.some((game) => game.parent_id === id);
}
