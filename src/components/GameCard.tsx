import type { Game } from "../types";
import { STATUS_LABELS } from "../types";
import { formatPlaytime, releaseYear } from "../lib/format";
import { CoverImage } from "./CoverImage";
import { StarRating } from "./StarRating";

interface GameCardProps {
  game: Game;
  onEdit: (game: Game) => void;
  onDelete: (game: Game) => void;
}

/** The colour language review aggregators have already taught people. */
function criticTone(score: number): string {
  if (score >= 75) return "good";
  if (score >= 50) return "mixed";
  return "poor";
}

export function GameCard({ game, onEdit, onDelete }: GameCardProps) {
  const year = releaseYear(game.release_date);

  return (
    <article className="card">
      <div className="card-cover">
        <CoverImage title={game.title} coverFile={game.cover_file} />
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
