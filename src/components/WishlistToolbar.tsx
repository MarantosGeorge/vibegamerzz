import {
  CRITIC_BANDS,
  CRITIC_BAND_LABELS,
  WISHLIST_SORT_DIRECTION_LABELS,
  WISHLIST_SORT_KEYS,
  WISHLIST_SORT_LABELS,
  isWishlistAscending,
} from "../types";
import type { CriticBand, SortDirection, WishlistSortKey } from "../types";

export interface WishlistFilters {
  search: string;
  genre: string | "all";
  critic: CriticBand;
  sort: WishlistSortKey;
  /** Sticky across a change of key, exactly as the library's is. ADR-0003. */
  direction: SortDirection;
}

interface WishlistToolbarProps {
  filters: WishlistFilters;
  onChange: (filters: WishlistFilters) => void;
  /** Only the genres present on the wishlist - not the library's. */
  genres: string[];
}

/**
 * The library's toolbar minus two controls and plus one key.
 *
 * There is no storefront filter, because an entry has no storefront to filter
 * on. There is no priority chip row either, and that absence is the deliberate
 * one: the tab groups by priority into three visible sections, so a chip that
 * showed one tier at a time would be hiding the ranking rather than using it.
 * See docs/adr/0006.
 */
export function WishlistToolbar({ filters, onChange, genres }: WishlistToolbarProps) {
  const update = (patch: Partial<WishlistFilters>) => onChange({ ...filters, ...patch });
  const directionLabel = WISHLIST_SORT_DIRECTION_LABELS[filters.sort][filters.direction];

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
            placeholder="Search your wishlist"
            aria-label="Search wishlist entries by title"
          />
        </div>

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

        <div className="select-field sort-field">
          <span>Sort within each</span>
          <div className="sort-controls">
            <select
              aria-label="Sort within each priority"
              value={filters.sort}
              onChange={(event) =>
                update({ sort: event.target.value as WishlistSortKey })
              }
            >
              {WISHLIST_SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {WISHLIST_SORT_LABELS[key]}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="sort-direction"
              aria-label={`Order: ${directionLabel}. Activate to reverse.`}
              title="Reverse the order"
              onClick={() =>
                update({
                  direction: filters.direction === "natural" ? "reversed" : "natural",
                })
              }
            >
              <span className="sort-arrow" aria-hidden="true">
                {isWishlistAscending(filters.sort, filters.direction) ? "↑" : "↓"}
              </span>
              <span className="sort-direction-text" aria-hidden="true">
                {directionLabel}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
