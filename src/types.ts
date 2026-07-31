/** Shared vocabulary for the whole app. Mirrors the `games` table exactly. */

export const STATUSES = ["backlog", "playing", "completed", "abandoned"] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABELS: Record<Status, string> = {
  backlog: "Backlog",
  playing: "Playing",
  completed: "Completed",
  abandoned: "Abandoned",
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

export const SORT_KEYS = [
  "recent",
  "title",
  "rating",
  "critic",
  "playtime",
  "achievements",
] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  recent: "Recently added",
  title: "Title (A–Z)",
  rating: "Highest rated",
  critic: "Highest critic score",
  playtime: "Most played",
  achievements: "Most achievements",
};

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

export const isCompleted = (game: Game) => game.status === "completed";
