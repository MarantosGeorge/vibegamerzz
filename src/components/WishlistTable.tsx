import { isUnreleased, isWishlistAscending } from "../types";
import type { SortDirection, WishlistEntry, WishlistSortKey } from "../types";
import { formatReleaseDate, formatTimestamp, releaseYear } from "../lib/format";
import { CoverImage } from "./CoverImage";

/**
 * The wishlist as a directory listing. The library's table minus the four
 * ownership facts - no storefront, no status, no playtime, no completion,
 * because none of them exist for a title you do not own - and minus the
 * priority, which is the section you are reading rather than a column in it.
 * See docs/adr/0005 and docs/adr/0006.
 */

function criticTone(score: number): string {
  if (score >= 75) return "good";
  if (score >= 50) return "mixed";
  return "poor";
}

/** Every column here sorts: the wishlist has no inert facts to show. */
const COLUMNS: { key: WishlistSortKey; label: string; className: string }[] = [
  { key: "title", label: "Title", className: "col-title" },
  { key: "critic", label: "Critic", className: "col-critic" },
  { key: "release", label: "Release date", className: "col-release" },
  { key: "added", label: "Date added", className: "col-added" },
];

interface WishlistTableProps {
  entries: WishlistEntry[];
  sort: WishlistSortKey;
  direction: SortDirection;
  onSortChange: (sort: WishlistSortKey, direction: SortDirection) => void;
  onEdit: (entry: WishlistEntry) => void;
  onBuy: (entry: WishlistEntry) => void;
  onDelete: (entry: WishlistEntry) => void;
  /** Hidden from the accessibility tree on all but the first of a stack of
      tables, so a screen reader is not read the same four headers three times
      over while moving down the three priority tiers. */
  labelledBy?: string;
}

export function WishlistTable({
  entries,
  sort,
  direction,
  onSortChange,
  onEdit,
  onBuy,
  onDelete,
  labelledBy,
}: WishlistTableProps) {
  const onSort = (key: WishlistSortKey) => {
    if (key === sort) {
      onSortChange(key, direction === "natural" ? "reversed" : "natural");
    } else {
      onSortChange(key, direction);
    }
  };

  return (
    <div className="table-scroll">
      <table className="data-table" aria-labelledby={labelledBy}>
        <thead>
          <tr>
            {COLUMNS.map(({ key, label, className }) => {
              const active = key === sort;
              return (
                <th
                  key={key}
                  className={className}
                  scope="col"
                  aria-sort={
                    active
                      ? isWishlistAscending(sort, direction)
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <button type="button" className="th-sort" onClick={() => onSort(key)}>
                    {label}
                    {active && (
                      <span className="th-arrow" aria-hidden="true">
                        {isWishlistAscending(sort, direction) ? "↑" : "↓"}
                      </span>
                    )}
                  </button>
                </th>
              );
            })}
            <th className="col-actions" scope="col">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>

        <tbody>
          {entries.map((entry) => {
            const unreleased = isUnreleased(entry.release_date);
            const year = releaseYear(entry.release_date);
            return (
              <tr key={entry.id}>
                {/* The note joins the genres in the tooltip. On a wishlist the
                    note is usually the reason you have not bought it, so it is
                    worth keeping reachable even though it cannot be a column. */}
                <td className="col-title">
                  <div
                    className="row-title"
                    title={[entry.title, entry.genres.join(" · "), entry.notes]
                      .filter(Boolean)
                      .join("\n")}
                  >
                    <span className="row-thumb">
                      <CoverImage title={entry.title} coverFile={entry.cover_file} />
                    </span>
                    <span className="row-title-text">{entry.title}</span>
                  </div>
                </td>

                <td className="col-critic">
                  {entry.critic_rating === null ? (
                    <span className="cell-absent" title="Nobody has scored this game">
                      —
                    </span>
                  ) : (
                    <span className={`critic-num critic-${criticTone(entry.critic_rating)}`}>
                      {entry.critic_rating}
                    </span>
                  )}
                </td>

                {/* The same three statements the card makes, in the same words.
                    Not out yet is written in full, because it is the one of the
                    three that explains why you do not own this. */}
                <td className="col-release">
                  {unreleased ? (
                    <span className="unreleased">
                      Out {formatReleaseDate(entry.release_date)}
                    </span>
                  ) : year ? (
                    <span>{formatReleaseDate(entry.release_date)}</span>
                  ) : (
                    <span className="cell-absent">No release date</span>
                  )}
                </td>

                <td className="col-added">{formatTimestamp(entry.created_at)}</td>

                {/* "I bought this" keeps its words. It is the one action here
                    that changes what a title *is* - it moves out of the
                    wishlist and into the library - and no glyph says that. */}
                <td className="col-actions">
                  <div className="row-actions">
                    <button
                      type="button"
                      className="button primary tiny"
                      onClick={() => onBuy(entry)}
                    >
                      I bought this
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={`Edit ${entry.title}`}
                      title="Edit"
                      onClick={() => onEdit(entry)}
                    >
                      <span aria-hidden="true">✎</span>
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Remove ${entry.title} from your wishlist`}
                      title="Remove"
                      onClick={() => onDelete(entry)}
                    >
                      <span aria-hidden="true">🗑</span>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
