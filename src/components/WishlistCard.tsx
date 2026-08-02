import type { WishlistEntry } from "../types";
import { PRIORITY_LABELS, isUnreleased } from "../types";
import { formatReleaseDate, releaseYear } from "../lib/format";
import { CoverImage } from "./CoverImage";

interface WishlistCardProps {
  entry: WishlistEntry;
  onEdit: (entry: WishlistEntry) => void;
  onBuy: (entry: WishlistEntry) => void;
  onDelete: (entry: WishlistEntry) => void;
}

/** The same colour language the library's cards use for critic scores. */
function criticTone(score: number): string {
  if (score >= 75) return "good";
  if (score >= 50) return "mixed";
  return "poor";
}

export function WishlistCard({ entry, onEdit, onBuy, onDelete }: WishlistCardProps) {
  const unreleased = isUnreleased(entry.release_date);
  const year = releaseYear(entry.release_date);

  return (
    <article className="card">
      <div className="card-cover">
        <CoverImage title={entry.title} coverFile={entry.cover_file} />
        <span className={`badge priority-${entry.priority}`}>
          {PRIORITY_LABELS[entry.priority]}
        </span>
        {entry.critic_rating !== null && (
          <span
            className={`critic-badge critic-${criticTone(entry.critic_rating)}`}
            title={`Critic score ${entry.critic_rating} out of 100`}
          >
            {entry.critic_rating}
          </span>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title" title={entry.title}>
          {entry.title}
        </h3>

        {/* The date says one of three different things, so it is written out
            rather than reduced to a year: not out yet, out in a given year, or
            nobody has said. Only the first is a reason you do not own it. */}
        <p className="card-meta">
          {unreleased ? (
            <span className="unreleased">Out {formatReleaseDate(entry.release_date)}</span>
          ) : year ? (
            <span>{year}</span>
          ) : (
            <span className="faint">No release date</span>
          )}
        </p>

        {entry.genres.length > 0 && (
          <p className="card-genres" title={entry.genres.join(", ")}>
            {entry.genres.join(" · ")}
          </p>
        )}

        {/* The library card has no room for notes; this one does, because none
            of playtime, completion, stars or storefront exist here. On a
            wishlist the note is usually the reason you have not bought it. */}
        {entry.notes && (
          <p className="card-note" title={entry.notes}>
            {entry.notes}
          </p>
        )}
      </div>

      <div className="card-actions stacked">
        <button type="button" className="button primary" onClick={() => onBuy(entry)}>
          I bought this
        </button>
        <div className="card-actions-row">
          <button type="button" className="button subtle" onClick={() => onEdit(entry)}>
            Edit
          </button>
          <button
            type="button"
            className="button danger-subtle"
            onClick={() => onDelete(entry)}
          >
            Remove
          </button>
        </div>
      </div>
    </article>
  );
}
