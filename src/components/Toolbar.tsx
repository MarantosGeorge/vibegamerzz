import {
  CRITIC_BANDS,
  CRITIC_BAND_LABELS,
  SORT_DIRECTION_LABELS,
  SORT_KEYS,
  SORT_LABELS,
  STATUSES,
  STATUS_BLURBS,
  STATUS_LABELS,
  isAscending,
} from "../types";
import type { CriticBand, SortDirection, SortKey, Status } from "../types";

/** Breathing room left between a tooltip and the edge of the window. */
const TIP_MARGIN = 12;

export interface Filters {
  search: string;
  status: Status | "all";
  platform: string | "all";
  genre: string | "all";
  critic: CriticBand;
  sort: SortKey;
  /** Sticky: it survives a change of `sort` rather than resetting. */
  direction: SortDirection;
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
  const directionLabel = SORT_DIRECTION_LABELS[filters.sort][filters.direction];

  /**
   * Keeps a tooltip inside the window. The panels hang off the left edge of
   * their chip, which is safe until a chip lands last in a wrapped row - then
   * the panel runs off the right of the window and the whole app gains a
   * horizontal scrollbar. Which chip that is depends on where the row wrapped,
   * so it cannot be expressed in CSS and has to be measured.
   *
   * Measured on enter rather than on mount or resize: the row rewraps on window
   * resize, on font changes and whenever a status label changes width, and one
   * read at hover time is correct under all of them.
   */
  const keepTipOnScreen = (event: React.MouseEvent<HTMLButtonElement>) => {
    const tip = event.currentTarget.querySelector<HTMLElement>(".chip-tip");
    if (!tip) return;
    tip.style.setProperty("--tip-shift", "0px");
    const rect = tip.getBoundingClientRect();
    const overflow = rect.right - (document.documentElement.clientWidth - TIP_MARGIN);
    if (overflow <= 0) return;
    // Never pull it so far back that it falls off the left edge instead.
    const shift = Math.min(overflow, Math.max(rect.left - TIP_MARGIN, 0));
    tip.style.setProperty("--tip-shift", `${-shift}px`);
  };

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

        <div className="select-field sort-field">
          <span>Sort by</span>
          <div className="sort-controls">
            <select
              aria-label="Sort by"
              value={filters.sort}
              onChange={(event) => update({ sort: event.target.value as SortKey })}
            >
              {SORT_KEYS.map((key) => (
                <option key={key} value={key}>
                  {SORT_LABELS[key]}
                </option>
              ))}
            </select>
            {/* Wears the ordering you are currently looking at, not the one a
                click would give you - the arrow carries the "this flips". */}
            <button
              type="button"
              className="sort-direction"
              aria-label={`Order: ${directionLabel}. Activate to reverse.`}
              title="Reverse the order"
              onClick={() =>
                update({ direction: filters.direction === "natural" ? "reversed" : "natural" })
              }
            >
              <span className="sort-arrow" aria-hidden="true">
                {isAscending(filters.sort, filters.direction) ? "↑" : "↓"}
              </span>
              <span className="sort-direction-text" aria-hidden="true">
                {directionLabel}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="chip-row" role="group" aria-label="Filter by status">
        <button
          type="button"
          className={filters.status === "all" ? "chip on" : "chip"}
          onClick={() => update({ status: "all" })}
        >
          All <span className="chip-count">{total}</span>
        </button>
        {/* The `?` is deliberately not a button. A button inside a button is
            invalid markup, and making it interactive would carve a dead spot
            out of the chip's own filter target. It is a hover region and
            nothing more: clicking the glyph filters, like the rest of the chip.
            Sighted users get the description on hover; everyone else gets it
            through `aria-describedby`, which is why the tooltip carries the id
            and only the glyph is hidden from the accessibility tree. */}
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`chip status-${status}${filters.status === status ? " on" : ""}`}
            onClick={() => update({ status })}
            onMouseEnter={keepTipOnScreen}
            aria-describedby={`status-help-${status}`}
          >
            {STATUS_LABELS[status]} <span className="chip-count">{statusCounts[status]}</span>
            <span className="chip-help" aria-hidden="true">
              ?
            </span>
            <span className="chip-tip" id={`status-help-${status}`} role="tooltip">
              {STATUS_BLURBS[status]}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
