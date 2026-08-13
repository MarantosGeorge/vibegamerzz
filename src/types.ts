/** Shared vocabulary for the whole app. Mirrors the `games` table exactly. */

/**
 * The seven shelves a game can sit on. Independent, not a ranking - Platinum is
 * not a stronger Completed, and Above and Beyond does not count as either. See
 * docs/adr/0001 and docs/adr/0007. The order here is the order the chips and
 * the dropdown render in, and means nothing beyond that.
 *
 * It reads: the two shelves that answer "what is going on right now" first,
 * then the five that describe how far a game got, shortest journey to longest.
 * That is a reading order and not a ranking - a game is on one shelf and the
 * app knows nothing else about it.
 */
export const STATUSES = [
  "playing",
  "abandoned",
  "backlog",
  "attempted",
  "completed",
  "platinum",
  "above-and-beyond",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  playing: "Playing",
  abandoned: "Abandoned",
  backlog: "Backlog",
  attempted: "Attempted",
  completed: "Completed",
  platinum: "Platinum",
  "above-and-beyond": "Above and Beyond",
};

/**
 * What each shelf means, in the app's own voice, for the `?` on the status
 * chips. A second rendering of the seven definitions in `CONTEXT.md` - that
 * file stays canonical, and if a definition moves there it moves here too.
 *
 * Two rules these lines hold to, both from the glossary. Nothing reads as a
 * ranking: the seven are shelves, and Above and Beyond is described by what it
 * measures rather than as a rung above Platinum. And Platinum carries the
 * achievement-less carve-out, because a game that counts nothing can never
 * reach 100% and is Platinum anyway. See docs/adr/0002.
 *
 * Where a shelf restates a number, the number is in the prose - "zero minutes
 * played" is what actually separates Backlog from Attempted.
 */
export const STATUS_BLURBS: Record<Status, string> = {
  playing:
    "On your desk right now. Says nothing about how far in you are — could be your first hour, could be your last achievement.",
  abandoned:
    "You played it, and you're not going back. The reason doesn't matter and nobody's asking.",
  backlog: "Bought it, never opened it. Zero minutes played. We've all got a shelf like this.",
  attempted:
    "You played it, credits never rolled, and you genuinely mean to go back. Genuinely.",
  completed:
    "The main credits rolled — story done, plus whatever side stuff you picked up along the way. Where most people stop.",
  platinum:
    "Done by the game's own yardstick: every achievement, or whatever else it counts. Some games count nothing at all — those can still be Platinum.",
  "above-and-beyond":
    "Done past what the game bothers to measure. Nobody made you fight the Nameless King. You did it anyway. Rare on purpose.",
};

/** A game as it comes back from SQLite. */
export interface Game {
  id: number;
  title: string;
  platform: string;
  status: Status;
  /** Percentage of achievements earned, or null when the game has none. */
  achievement_pct: number | null;
  playtime_minutes: number;
  /** Your own score, 0–5 in halves. `0` means unrated. */
  rating: number;
  /** Aggregated critic score out of 100, or null when nobody has scored it. */
  critic_rating: number | null;
  /** Stored in the database as a JSON array; parsed on the way out. */
  genres: string[];
  cover_file: string | null;
  notes: string | null;
  igdb_id: number | null;
  summary: string | null;
  release_date: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

/** The editable subset - everything the form owns. */
export interface GameInput {
  title: string;
  platform: string;
  status: Status;
  achievement_pct: number | null;
  playtime_minutes: number;
  rating: number;
  critic_rating: number | null;
  genres: string[];
  cover_file: string | null;
  notes: string | null;
  igdb_id: number | null;
  summary: string | null;
  release_date: string | null;
}

/**
 * How much you want a wishlist entry. Unlike `STATUSES`, this order is load
 * bearing: it is the ranking, and it is the order the three sections of the
 * wishlist render in, top to bottom. See docs/adr/0006.
 */
export const PRIORITIES = ["must-have", "interested", "someday"] as const;
export type Priority = (typeof PRIORITIES)[number];

/**
 * What an entry lands on when you add one. Not a placeholder for a missing
 * answer - putting a title on the wishlist already said this much.
 */
export const DEFAULT_PRIORITY: Priority = "interested";

export const PRIORITY_LABELS: Record<Priority, string> = {
  "must-have": "Must have",
  interested: "Interested",
  someday: "Someday",
};

/**
 * The section headings, which say what each tier means rather than repeat it.
 * Same voice as `STATUS_BLURBS` on purpose - the wishlist and the library
 * should not sound like two different apps. These stay on screen rather than
 * hiding behind a `?`: a description you cannot help reading beats one you
 * have to know to hover for, which is why the priorities never grew a `?`.
 */
export const PRIORITY_BLURBS: Record<Priority, string> = {
  "must-have": "You'd buy these today, full price, no flinching.",
  interested: "You want these. You haven't thought harder than that.",
  someday: "You still want these — and you've decided, deliberately, that today is not the day.",
};

/**
 * A wishlist entry: a title you want and do not own. Mirrors the `wishlist`
 * table exactly. Deliberately not a `Game` - there is no storefront, no status,
 * no playtime and no completion here, because all four are facts about owning
 * something. See docs/adr/0005.
 */
export interface WishlistEntry {
  id: number;
  title: string;
  priority: Priority;
  /** Aggregated critic score out of 100, or null when nobody has scored it. */
  critic_rating: number | null;
  genres: string[];
  cover_file: string | null;
  notes: string | null;
  igdb_id: number | null;
  summary: string | null;
  release_date: string | null;
  is_sample: number;
  created_at: string;
  updated_at: string;
}

/** The editable subset - everything the wishlist form owns. */
export interface WishlistInput {
  title: string;
  priority: Priority;
  critic_rating: number | null;
  genres: string[];
  cover_file: string | null;
  notes: string | null;
  igdb_id: number | null;
  summary: string | null;
  release_date: string | null;
}

/**
 * Whether a title is not out yet. Derived from the release date and stored
 * nowhere, so an entry stops being unreleased on its own as the date passes.
 *
 * It answers why you do not own a game; priority answers how much you want it.
 * Neither constrains the other - an unreleased game can sit on any tier.
 */
export function isUnreleased(releaseDate: string | null, today = new Date()): boolean {
  if (!releaseDate) return false;
  const released = new Date(`${releaseDate}T00:00:00`);
  if (Number.isNaN(released.getTime())) return false;
  return released.getTime() > today.getTime();
}

/**
 * What the wishlist is ordered by, within each priority section. Three of the
 * library's six keys are missing because they are facts about owning a game:
 * you cannot have rated, played or made progress in something you do not have.
 * `release` is the one key the library has no use for and the wishlist does.
 */
export const WISHLIST_SORT_KEYS = ["added", "title", "critic", "release"] as const;
export type WishlistSortKey = (typeof WISHLIST_SORT_KEYS)[number];

export const WISHLIST_SORT_LABELS: Record<WishlistSortKey, string> = {
  added: "Date added",
  title: "Title",
  critic: "Critic score",
  release: "Release date",
};

export const WISHLIST_SORT_DIRECTION_LABELS: Record<
  WishlistSortKey,
  Record<SortDirection, string>
> = {
  added: { natural: "Newest first", reversed: "Oldest first" },
  title: { natural: "A–Z", reversed: "Z–A" },
  critic: { natural: "Highest first", reversed: "Lowest first" },
  // Soonest-first is what a wishlist wants from a release date - the thing
  // coming out next week is the thing worth knowing about - so it is natural
  // here even though it ascends, exactly as Title does.
  release: { natural: "Soonest first", reversed: "Latest first" },
};

/** Title and release date both run A–Z / earliest-first in their natural order. */
export function isWishlistAscending(
  key: WishlistSortKey,
  direction: SortDirection,
): boolean {
  const naturalAscends = key === "title" || key === "release";
  return direction === "natural" ? naturalAscends : !naturalAscends;
}

/**
 * ADR-0004's absence rule, applied to the wishlist's two nullable keys. Priority
 * is not among them and never will be: it cannot be absent.
 */
export function hasWishlistSortValue(entry: WishlistEntry, key: WishlistSortKey): boolean {
  if (key === "critic") return entry.critic_rating !== null;
  if (key === "release") return entry.release_date !== null;
  return true;
}

/**
 * IGDB's genre vocabulary, for picking genres by hand on a game that was not
 * imported. Anything IGDB returns that is not on this list is merged in at
 * runtime, so the picker self-heals if IGDB renames or adds one.
 */
export const IGDB_GENRES = [
  "Adventure",
  "Arcade",
  "Card & Board Game",
  "Fighting",
  "Hack and slash/Beat 'em up",
  "Indie",
  "MOBA",
  "Music",
  "Pinball",
  "Platform",
  "Point-and-click",
  "Puzzle",
  "Quiz/Trivia",
  "Racing",
  "Real Time Strategy (RTS)",
  "Role-playing (RPG)",
  "Shooter",
  "Simulator",
  "Sport",
  "Strategy",
  "Tactical",
  "Turn-based strategy (TBS)",
  "Visual Novel",
] as const;

/**
 * Critic-score filter bands. Thresholds follow the convention review
 * aggregators have taught people to read: 90+ acclaimed, 80+ great, 70+ good.
 */
export const CRITIC_BANDS = ["all", "90", "80", "70", "unrated"] as const;
export type CriticBand = (typeof CRITIC_BANDS)[number];

export const CRITIC_BAND_LABELS: Record<CriticBand, string> = {
  all: "Any critic score",
  "90": "90+ · Acclaimed",
  "80": "80+ · Great",
  "70": "70+ · Good",
  unrated: "No critic score",
};

export function matchesCriticBand(critic: number | null, band: CriticBand): boolean {
  if (band === "all") return true;
  if (band === "unrated") return critic === null;
  return critic !== null && critic >= Number(band);
}

/**
 * What the library is ordered by. Every key is a plain noun - which way round
 * it runs is the other axis, `SortDirection`. See docs/adr/0003.
 */
export const SORT_KEYS = [
  "added",
  "title",
  "rating",
  "critic",
  "playtime",
  "achievements",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

/**
 * Which way round a sort runs, read relative to its key rather than as a raw
 * ascending/descending flag: `natural` is A–Z for Title and highest-first for
 * every score, so it is the app's original behaviour on all six keys.
 */
export const SORT_DIRECTIONS = ["natural", "reversed"] as const;
export type SortDirection = (typeof SORT_DIRECTIONS)[number];

/** The neutral noun each key goes by in the dropdown. */
export const SORT_LABELS: Record<SortKey, string> = {
  added: "Date added",
  title: "Title",
  rating: "Your rating",
  critic: "Critic score",
  playtime: "Playtime",
  achievements: "Completion",
};

/**
 * How each key reads in each direction. These are the words the direction
 * toggle wears, and the reason direction is not labelled with bare arrows:
 * "ascending playtime" means nothing, "Least played" does.
 */
export const SORT_DIRECTION_LABELS: Record<SortKey, Record<SortDirection, string>> = {
  added: { natural: "Newest first", reversed: "Oldest first" },
  title: { natural: "A–Z", reversed: "Z–A" },
  rating: { natural: "Highest rated", reversed: "Lowest rated" },
  critic: { natural: "Highest first", reversed: "Lowest first" },
  playtime: { natural: "Most played", reversed: "Least played" },
  achievements: { natural: "Most complete", reversed: "Least complete" },
};

/**
 * Whether the list currently runs upward, for the toggle's arrow. Title is the
 * only key whose natural order ascends - A–Z - while every score, duration and
 * date reads highest-first, which is the whole reason direction is `natural` /
 * `reversed` rather than `asc` / `desc`. The arrow still points the way the
 * list actually runs, because on narrow screens it is all there is to go on.
 */
export function isAscending(key: SortKey, direction: SortDirection): boolean {
  const naturalAscends = key === "title";
  return direction === "natural" ? naturalAscends : !naturalAscends;
}

/**
 * Whether a game carries a value for this key at all. The ones that don't sort
 * last in both directions - no score is not a low score, and floating every
 * unrated game to the top is not what "Lowest rated" is asking for.
 *
 * Three keys can be absent: `critic_rating` is null when nobody has scored a
 * game, `rating` uses 0 to mean unrated, and `achievement_pct` is null when the
 * game has no achievements to earn. Playtime is excluded on purpose - a 0 there
 * is an honest zero, and belongs at the bottom of "Most played" like any other
 * number. So is a 0 in completion, which is why absence had to stop being
 * spelled 0 before this could work at all. See docs/adr/0004.
 */
export function hasSortValue(game: Game, key: SortKey): boolean {
  if (key === "critic") return game.critic_rating !== null;
  if (key === "rating") return game.rating > 0;
  if (key === "achievements") return game.achievement_pct !== null;
  return true;
}

/** A single search result from IGDB, already normalised by the Rust side. */
export interface IgdbGame {
  igdb_id: number;
  name: string;
  summary: string | null;
  release_date: string | null;
  critic_rating: number | null;
  genres: string[];
  cover_url: string | null;
  thumb_url: string | null;
}

/**
 * The status the numbers suggest, when they disagree with the status chosen.
 * Advice only - the form prints it and does nothing else. See docs/adr/0002 for
 * why Platinum, Abandoned and Playing are silent under every condition, and why
 * Backlog is judged on playtime alone.
 *
 * A game with no achievements passes null and is silent too, which needs no
 * branch of its own: null is never 100. That is ADR 0002's achievement-less
 * carve-out finally saying itself in the data rather than in prose.
 *
 * Above and Beyond is silent in both directions and needs no branch either.
 * Nothing suggests it, because it is defined by content the game does not
 * count, so no number stored here could imply it - and a game already sitting
 * on it matches no condition below. See docs/adr/0007.
 */
export function statusHint(
  status: Status,
  playtimeMinutes: number,
  achievementPct: number | null,
): string | null {
  if (status === "backlog" && playtimeMinutes > 0) {
    return "You've played this — Attempted?";
  }
  if ((status === "attempted" || status === "completed") && achievementPct === 100) {
    return "100% achievements — Platinum?";
  }
  return null;
}
