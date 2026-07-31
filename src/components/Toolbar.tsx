import {
  CRITIC_BANDS,
  CRITIC_BAND_LABELS,
  SORT_KEYS,
  SORT_LABELS,
  STATUSES,
  STATUS_LABELS,
} from "../types";
import type { CriticBand, SortKey, Status } from "../types";

export interface Filters {
  search: string;
  status: Status | "all";
  platform: string | "all";
  genre: string | "all";
  critic: CriticBand;
  sort: SortKey;
}

interface ToolbarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  storefronts: string[];
  /** Only the genres actually present in the library, so the filter never
      offers a choice that can only return nothing. */
  genres: string[];
  /** Counts per status across the whole library, not the filtered view. */
  statusCounts: Record<Status, number>;
  total: number;
}

export function Toolbar({
  filters,
  onChange,
  storefronts,
  genres,
  statusCounts,
  total,
}: ToolbarProps) {
  const update = (patch: Partial<Filters>) => onChange({ ...filters, ...patch });

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        <div className="search-field">
          <span className="search-icon" aria-hidden="true">
            🔎
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => update({ search: event.target.value })}
            placeholder="Search your library"
            aria-label="Search games by title"
          />
        </div>

        <label className="select-field">
          <span>Storefront</span>
          <select
            value={filters.platform}
            onChange={(event) => update({ platform: event.target.value })}
          >
            <option value="all">All storefronts</option>
            {storefronts.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>

        {genres.length > 0 && (
          <label className="select-field">
            <span>Genre</span>
            <select
              value={filters.genre}
              onChange={(event) => update({ genre: event.target.value })}
            >
              <option value="all">All genres</option>
              {genres.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="select-field">
          <span>Critic score</span>
          <select
            value={filters.critic}
            onChange={(event) => update({ critic: event.target.value as CriticBand })}
          >
            {CRITIC_BANDS.map((band) => (
              <option key={band} value={band}>
                {CRITIC_BAND_LABELS[band]}
              </option>
            ))}
          </select>
        </label>

        <label className="select-field">
          <span>Sort by</span>
          <select
            value={filters.sort}
            onChange={(event) => update({ sort: event.target.value as SortKey })}
          >
            {SORT_KEYS.map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="chip-row" role="group" aria-label="Filter by status">
        <button
          type="button"
          className={filters.status === "all" ? "chip on" : "chip"}
          onClick={() => update({ status: "all" })}
        >
          All <span className="chip-count">{total}</span>
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`chip status-${status}${filters.status === status ? " on" : ""}`}
            onClick={() => update({ status })}
          >
            {STATUS_LABELS[status]} <span className="chip-count">{statusCounts[status]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
