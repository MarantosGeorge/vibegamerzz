import {
  CRITIC_BANDS,
  CRITIC_BAND_LABELS,
  PRIORITIES,
  PRIORITY_BLURBS,
  PRIORITY_LABELS,
  WISHLIST_SORT_DIRECTION_LABELS,
  WISHLIST_SORT_KEYS,
  WISHLIST_SORT_LABELS,
  isWishlistAscending,
} from "../types";
import type {
  CriticBand,
  Priority,
  SortDirection,
  WishlistSortKey,
} from "../types";
import type { ViewMode } from "../lib/view";
import { ViewToggle } from "./ViewToggle";

export interface WishlistFilters {
  search: string;
  genre: string | "all";
  critic: CriticBand;
  /**
   * Which tier you are looking at, or all three at once. `all` stacks the three
   * sections down the page, which is the tab's original shape and what it opens
   * on; picking a tier flattens it to that one.
   *
   * It is a filter and not a view, so like every other filter here it resets on
   * restart. Launching into a wishlist that is hiding two thirds of itself,
   * with no memory of why, is not a preference worth keeping.
   */
  priority: Priority | "all";
  sort: WishlistSortKey;
  /** Sticky across a change of key, exactly as the library's is. ADR-0003. */
  direction: SortDirection;
}

interface WishlistToolbarProps {
  filters: WishlistFilters;
  onChange: (filters: WishlistFilters) => void;
  /** Only the genres present on the wishlist - not the library's. */
  genres: string[];
  /** Counts per tier across the whole wishlist, not the filtered view. */
  priorityCounts: Record<Priority, number>;
  total: number;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

/**
 * The library's toolbar minus one control, plus one key, and with a chip row
 * that reads differently from the library's.
 *
 * There is no storefront filter, because an entry has no storefront to filter
 * on. The chip row is the priorities, and unlike the status chips it has no `?`
 * on each chip: the tier you have selected prints its description in full,
 * underneath, because a description you cannot help reading beats one you have
 * to know to hover for. On `all` the three sections carry their own blurbs and
 * there is no single tier to describe, so the line is absent.
 */
export function WishlistToolbar({
  filters,
  onChange,
  genres,
  priorityCounts,
  total,
  view,
  onViewChange,
}: WishlistToolbarProps) {
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
          {/* "within each" only while all three are on screen. With one tier
              selected there is no "each" to sort within. */}
          <span>{filters.priority === "all" ? "Sort within each" : "Sort by"}</span>
          <div className="sort-controls">
            <select
              aria-label={
                filters.priority === "all" ? "Sort within each priority" : "Sort by"
              }
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

        <ViewToggle view={view} onChange={onViewChange} />
      </div>

      <div className="chip-row" role="group" aria-label="Show one priority">
        <button
          type="button"
          className={filters.priority === "all" ? "chip on" : "chip"}
          onClick={() => update({ priority: "all" })}
        >
          All <span className="chip-count">{total}</span>
        </button>
        {/* The dot is the same one the section headings wear, so the chip row
            and the headings teach one colour vocabulary - the status chips do
            the same thing with theirs. */}
        {PRIORITIES.map((priority) => (
          <button
            key={priority}
            type="button"
            className={filters.priority === priority ? "chip on" : "chip"}
            onClick={() => update({ priority })}
          >
            <span className={`priority-dot priority-${priority}`} aria-hidden="true" />
            {PRIORITY_LABELS[priority]}
            <span className="chip-count">{priorityCounts[priority]}</span>
          </button>
        ))}
      </div>

      {filters.priority !== "all" && (
        <p className="chip-blurb">{PRIORITY_BLURBS[filters.priority]}</p>
      )}
    </div>
  );
}
