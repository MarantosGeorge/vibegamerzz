import type { Game } from "../types";
import { STATUS_LABELS } from "../types";
import { formatPlaytime, releaseYear } from "../lib/format";
import { CoverImage } from "./CoverImage";
import { StarRating } from "./StarRating";

interface GameCardProps {
  game: Game;
  /** How many DLC are filed under this game. Zero draws no badge at all. */
  dlcCount?: number;
  /**
   * How many of those passed the active filter. Equal to `dlcCount` when
   * nothing is filtering, which is what lets the badge print a bare count then
   * and "1 of 3" only when the two differ and the difference means something.
   */
  dlcMatched?: number;
  onOpenDlc?: (game: Game) => void;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
}

/** The colour language review aggregators have already taught people. */
function criticTone(score: number): string {
  if (score >= 75) return "good";
  if (score >= 50) return "mixed";
  return "poor";
}

export function GameCard({
  game,
  dlcCount = 0,
  dlcMatched = 0,
  onOpenDlc,
  onEdit,
  onDelete,
}: GameCardProps) {
  const year = releaseYear(game.release_date);
  // A grid cannot indent, so the badge is how a card says it has DLC - and
  // under a filter it is also how the card says a DLC inside it matched. That
  // second job is why this card can be on screen at all while failing the
  // filter itself: it is the address of something that did match, and the
  // badge is what stops it reading as a match of its own. See docs/adr/0008.
  const partial = dlcMatched > 0 && dlcMatched < dlcCount;

  return (
    <article className="card">
      <div className="card-cover">
        <CoverImage title={game.title} coverFile={game.cover_file} />
        {dlcCount > 0 && (
          <button
            type="button"
            className={partial ? "dlc-badge dlc-badge-match" : "dlc-badge"}
            onClick={() => onOpenDlc?.(game)}
            aria-label={
              partial
                ? `${dlcMatched} of ${dlcCount} DLC match, open them`
                : `Open the ${dlcCount} DLC filed under ${game.title}`
            }
            title={partial ? `${dlcMatched} of ${dlcCount} DLC match` : "DLC"}
          >
            <span aria-hidden="true">📁</span>
            {partial ? `${dlcMatched} of ${dlcCount}` : dlcCount}
          </button>
        )}
        <span className={`badge status-${game.status}`}>{STATUS_LABELS[game.status]}</span>
        {game.critic_rating !== null && (
          <span
            className={`critic-badge critic-${criticTone(game.critic_rating)}`}
            title={`Critic score ${game.critic_rating} out of 100`}
          >
            {game.critic_rating}
          </span>
        )}
      </div>

      <div className="card-body">
        <h3 className="card-title" title={game.title}>
          {game.title}
        </h3>

        <p className="card-meta">
          <span className="storefront">{game.platform}</span>
          {year && <span className="dot">·</span>}
          {year && <span>{year}</span>}
        </p>

        {game.genres.length > 0 && (
          <p className="card-genres" title={game.genres.join(", ")}>
            {game.genres.join(" · ")}
          </p>
        )}

        <StarRating value={game.rating} />

        {/* No bar at all when there are no achievements: an empty track reads
            as 0%, which is the other fact entirely. The stat says which. */}
        {game.achievement_pct !== null && (
          <div className="progress" aria-hidden="true">
            <div className="progress-bar" style={{ width: `${game.achievement_pct}%` }} />
          </div>
        )}
        <p className="card-stats">
          {game.achievement_pct === null ? (
            <span aria-label="This game has no achievements">🏆 No achievements</span>
          ) : (
            <span aria-label={`${game.achievement_pct} percent of achievements`}>
              🏆 {game.achievement_pct}%
            </span>
          )}
          <span aria-label={`Played for ${formatPlaytime(game.playtime_minutes)}`}>
            ⏱ {formatPlaytime(game.playtime_minutes)}
          </span>
        </p>
      </div>

      <div className="card-actions">
        <button type="button" className="button subtle" onClick={() => onEdit(game)}>
          Edit
        </button>
        <button type="button" className="button danger-subtle" onClick={() => onDelete(game)}>
          Delete
        </button>
      </div>
    </article>
  );
}
