import { STATUS_LABELS, isAscending } from "../types";
import type { Game, SortDirection, SortKey } from "../types";
import { formatPlaytime, formatTimestamp } from "../lib/format";
import { CoverImage } from "./CoverImage";
import { StarRating } from "./StarRating";

/**
 * The library as a directory listing: one row per game, columns you can read
 * down and compare, the way a file manager lists folders.
 *
 * It shows every fact a `GameCard` shows except the genres and the notes. Both
 * are free text of any length, and a column of it destroys the alignment the
 * table exists for - so the genres move into the title cell's tooltip, where
 * they cost nothing.
 */

/** The colour language review aggregators have already taught people. */
function criticTone(score: number): string {
  if (score >= 75) return "good";
  if (score >= 50) return "mixed";
  return "poor";
}

/**
 * The columns, in order. A `key` makes the header clickable and names the sort
 * it sets; `null` is an honest inert header - Storefront and Status are not in
 * `SORT_KEYS`, so there is nothing for a click to do and pretending otherwise
 * would be worse than a plain label.
 */
const COLUMNS: { key: SortKey | null; label: string; className: string }[] = [
  { key: "title", label: "Title", className: "col-title" },
  { key: null, label: "Storefront", className: "col-storefront" },
  { key: null, label: "Status", className: "col-status" },
  { key: "rating", label: "Your rating", className: "col-rating" },
  { key: "critic", label: "Critic", className: "col-critic" },
  { key: "playtime", label: "Playtime", className: "col-playtime" },
  { key: "achievements", label: "Completion", className: "col-completion" },
  { key: "added", label: "Date added", className: "col-added" },
];

interface GameTableProps {
  games: Game[];
  sort: SortKey;
  direction: SortDirection;
  /** Writes the toolbar's own sort state - see `onSort` below. */
  onSortChange: (sort: SortKey, direction: SortDirection) => void;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
}

export function GameTable({
  games,
  sort,
  direction,
  onSortChange,
  onEdit,
  onDelete,
}: GameTableProps) {
  /**
   * A header click drives the sort the toolbar's dropdown already owns, rather
   * than a second ordering of its own: the dropdown visibly follows your click,
   * and there is one answer to "how is this sorted".
   *
   * Clicking the column already sorted reverses it, which is what a file
   * manager does. Clicking another column keeps the direction you were in,
   * because direction is sticky across a change of key. See docs/adr/0003.
   */
  const onSort = (key: SortKey) => {
    if (key === sort) {
      onSortChange(key, direction === "natural" ? "reversed" : "natural");
    } else {
      onSortChange(key, direction);
    }
  };

  return (
    /* The scroller, not the table, so the sticky header scrolls sideways with
       its columns. Seven columns want about 800px; below that the row scrolls
       rather than shedding columns, because a column quietly vanishing - the
       one you just sorted by, say - is worse than a scrollbar. */
    <div className="table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {COLUMNS.map(({ key, label, className }) => {
              const active = key !== null && key === sort;
              return (
                <th
                  key={label}
                  className={className}
                  scope="col"
                  aria-sort={
                    active
                      ? isAscending(sort, direction)
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  {key === null ? (
                    label
                  ) : (
                    <button type="button" className="th-sort" onClick={() => onSort(key)}>
                      {label}
                      {/* Only the active column wears an arrow. One per column
                          would read as eight controls rather than one state. */}
                      {active && (
                        <span className="th-arrow" aria-hidden="true">
                          {isAscending(sort, direction) ? "↑" : "↓"}
                        </span>
                      )}
                    </button>
                  )}
                </th>
              );
            })}
            <th className="col-actions" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {games.map((game) => (
            <tr key={game.id}>
              <td className="col-title">
                <div
                  className="row-title"
                  title={[game.title, game.genres.join(" · ")].filter(Boolean).join("\n")}
                >
                  <span className="row-thumb">
                    <CoverImage title={game.title} coverFile={game.cover_file} />
                  </span>
                  <span className="row-title-text">{game.title}</span>
                </div>
              </td>

              <td className="col-storefront">{game.platform}</td>

              <td className="col-status">
                <span className={`badge badge-inline status-${game.status}`}>
                  {STATUS_LABELS[game.status]}
                </span>
              </td>

              <td className="col-rating">
                <StarRating value={game.rating} size="sm" />
              </td>

              {/* The score keeps the colour it wears on a card, as text rather
                  than as a filled pill - a column of pills next to a column of
                  status badges is two loud things fighting. */}
              <td className="col-critic">
                {game.critic_rating === null ? (
                  <span className="cell-absent" title="Nobody has scored this game">
                    —
                  </span>
                ) : (
                  <span className={`critic-num critic-${criticTone(game.critic_rating)}`}>
                    {game.critic_rating}
                  </span>
                )}
              </td>

              <td className="col-playtime">{formatPlaytime(game.playtime_minutes)}</td>

              {/* No bar here, unlike the card. In a column this narrow it is a
                  sliver, and sorting the column is the comparison the bar was
                  standing in for. Absence stays a dash: a 0% is the other fact
                  entirely. */}
              <td className="col-completion">
                {game.achievement_pct === null ? (
                  <span className="cell-absent" title="This game has no achievements">
                    —
                  </span>
                ) : (
                  <span>🏆 {game.achievement_pct}%</span>
                )}
              </td>

              <td className="col-added">{formatTimestamp(game.created_at)}</td>

              {/* Always visible, never hover-only: a control that appears on
                  hover is a control a touch or keyboard user cannot find. */}
              <td className="col-actions">
                <div className="row-actions">
                  <button
                    type="button"
                    className="icon-button"
                    aria-label={`Edit ${game.title}`}
                    title="Edit"
                    onClick={() => onEdit(game)}
                  >
                    <span aria-hidden="true">✎</span>
                  </button>
                  <button
                    type="button"
                    className="icon-button danger"
                    aria-label={`Delete ${game.title}`}
                    title="Delete"
                    onClick={() => onDelete(game)}
                  >
                    <span aria-hidden="true">🗑</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
