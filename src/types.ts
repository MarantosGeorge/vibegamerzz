/** Shared vocabulary for the whole app. Mirrors the `games` table exactly. */

/**
 * The six shelves a game can sit on. Independent, not a ranking - Platinum is
 * not a stronger Completed. See docs/adr/0001. The order here is the order the
 * chips and the dropdown render in, and means nothing beyond that.
 */
export const STATUSES = [
  "backlog",
  "attempted",
  "completed",
  "platinum",
  "abandoned",
  "playing",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  attempted: "Attempted",
  completed: "Completed",
  platinum: "Platinum",
  abandoned: "Abandoned",
  playing: "Playing",
};

/** A game as it comes back from SQLite. */
export interface Game {
  id: number;
  title: string;
  platform: string;
  status: Status;
  achievement_pct: number;
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
  achievement_pct: number;
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
 * Only two keys can be absent: `critic_rating` is genuinely null when nobody
 * has scored a game, and `rating` uses 0 to mean unrated. Playtime and
 * completion are excluded on purpose - a 0 there is an honest zero, and belongs
 * at the bottom of "Most played" like any other number.
 */
export function hasSortValue(game: Game, key: SortKey): boolean {
  if (key === "critic") return game.critic_rating !== null;
  if (key === "rating") return game.rating > 0;
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
 */
export function statusHint(
  status: Status,
  playtimeMinutes: number,
  achievementPct: number,
): string | null {
  if (status === "backlog" && playtimeMinutes > 0) {
    return "You've played this — Attempted?";
  }
  if ((status === "attempted" || status === "completed") && achievementPct === 100) {
    return "100% achievements — Platinum?";
  }
  return null;
}
