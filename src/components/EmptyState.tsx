interface EmptyStateProps {
  /**
   * The genuine first run for each tab, and the two "your filters found
   * nothing" cases. Kept as four variants rather than two plus a flag, because
   * the library and the wishlist say different things for different reasons.
   */
  variant: "library" | "filter" | "wishlist" | "wishlist-filter";
  onAdd: () => void;
  onClearFilters: () => void;
}

export function EmptyState({ variant, onAdd, onClearFilters }: EmptyStateProps) {
  if (variant === "filter") {
    return (
      <div className="empty">
        <div className="empty-art" aria-hidden="true">
          🔍
        </div>
        <h2>No games match those filters</h2>
        <p>Try a different search term, or widen the status and storefront filters.</p>
        <button type="button" className="button subtle" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  if (variant === "wishlist-filter") {
    return (
      <div className="empty">
        <div className="empty-art" aria-hidden="true">
          🔍
        </div>
        <h2>No wishlist entries match those filters</h2>
        <p>
          Try a different search term, or widen the genre and critic score filters. Entries with
          no critic score are hidden by any score filter.
        </p>
        <button type="button" className="button subtle" onClick={onClearFilters}>
          Clear filters
        </button>
      </div>
    );
  }

  if (variant === "wishlist") {
    return (
      <div className="empty">
        <div className="empty-art" aria-hidden="true">
          ✨
        </div>
        <h2>Your wishlist is empty</h2>
        <p>
          The wishlist holds the games you want and do not own — no storefront, no playtime, no
          progress, just how much you want each one. When you buy one, it moves across to your
          library in a click.
        </p>
        <button type="button" className="button primary large" onClick={onAdd}>
          Add your first wish
        </button>
        <p className="empty-hint">
          Entries are grouped by priority — Must have, Interested, Someday — so the list reads
          top to bottom in the order you would actually buy them.
        </p>
      </div>
    );
  }

  return (
    <div className="empty">
      <div className="empty-art" aria-hidden="true">
        🎮
      </div>
      <h2>Your library is empty</h2>
      <p>
        gamerzz keeps track of the PC games you own — what you are playing, what you have
        finished, how long you have played and how you rated it. Everything stays on this
        computer.
      </p>
      <button type="button" className="button primary large" onClick={onAdd}>
        Add your first game
      </button>
      <p className="empty-hint">
        You can type a game in by hand, or connect IGDB in Settings to search for it and fill
        in the cover art automatically.
      </p>
    </div>
  );
}
