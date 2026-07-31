interface EmptyStateProps {
  /** "library" is the genuine first run; "filter" means the search found nothing. */
  variant: "library" | "filter";
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
