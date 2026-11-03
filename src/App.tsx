import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { EmptyState } from "./components/EmptyState";
import { GameCard } from "./components/GameCard";
import { GameTable } from "./components/GameTable";
import { GameForm } from "./components/GameForm";
import { SettingsDialog } from "./components/SettingsDialog";
import { Tabs, type Tab } from "./components/Tabs";
import { ToastStack, type ToastMessage } from "./components/Toast";
import { Toolbar, type Filters } from "./components/Toolbar";
import { WishlistCard } from "./components/WishlistCard";
import { WishlistForm } from "./components/WishlistForm";
import { WishlistTable } from "./components/WishlistTable";
import { WishlistToolbar, type WishlistFilters } from "./components/WishlistToolbar";
import {
  deleteCover,
  errorMessage,
  igdbConfigured,
  initCovers,
} from "./lib/api";
import * as db from "./lib/db";
import { readView, writeView, type ViewMode } from "./lib/view";
import {
  hasSortValue,
  hasWishlistSortValue,
  matchesCriticBand,
  PRIORITIES,
  PRIORITY_BLURBS,
  PRIORITY_LABELS,
  STATUSES,
} from "./types";
import type {
  Game,
  GameInput,
  Priority,
  Status,
  WishlistEntry,
  WishlistInput,
} from "./types";

const DEFAULT_FILTERS: Filters = {
  search: "",
  status: "all",
  platform: "all",
  genre: "all",
  critic: "all",
  sort: "added",
  direction: "natural",
};

const DEFAULT_WISHLIST_FILTERS: WishlistFilters = {
  search: "",
  genre: "all",
  priority: "all",
  critic: "all",
  sort: "added",
  direction: "natural",
};

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [wishlist, setWishlist] = useState<WishlistEntry[]>([]);
  const [storefronts, setStorefronts] = useState<string[]>([]);
  const [igdbEnabled, setIgdbEnabled] = useState(false);
  const [sampleCounts, setSampleCounts] = useState<db.SampleCounts>({
    games: 0,
    wishlist: 0,
  });

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("library");
  // The one setting in this app that survives a restart, which is why it is not
  // in either filter object: a filter is set for one look at a collection, a
  // layout is how you like to read collections. Shared by both tabs.
  const [view, setView] = useState<ViewMode>(readView);
  // One filter state per tab, held apart so switching tabs is never destructive
  // - a search you typed on one is still there when you come back. Neither
  // survives a restart, which is how the library has always behaved.
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [wishFilters, setWishFilters] = useState<WishlistFilters>(
    DEFAULT_WISHLIST_FILTERS,
  );

  // `buying` carries the entry a new game is being promoted from, so saving can
  // delete it. Null on an ordinary add. See docs/adr/0005.
  const [formFor, setFormFor] = useState<{
    game: Game | null;
    buying: WishlistEntry | null;
  } | null>(null);
  const [wishFormFor, setWishFormFor] = useState<{ entry: WishlistEntry | null } | null>(
    null,
  );
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [removing, setRemoving] = useState<WishlistEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const changeView = useCallback((next: ViewMode) => {
    setView(next);
    writeView(next);
  }, []);

  const notify = useCallback((text: string, tone: ToastMessage["tone"] = "success") => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), text, tone }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    const [rows, wishRows, fronts, samples] = await Promise.all([
      db.listGames(),
      db.listWishlist(),
      db.listStorefronts(),
      db.countSamples(),
    ]);
    setGames(rows);
    setWishlist(wishRows);
    setStorefronts(fronts);
    setSampleCounts(samples);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await initCovers();
        setIgdbEnabled(await igdbConfigured());
        await refresh();
      } catch (cause) {
        setFatalError(errorMessage(cause));
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const statusCounts = useMemo(() => {
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const game of games) counts[game.status] += 1;
    return counts;
  }, [games]);

  const priorityCounts = useMemo(() => {
    const counts = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<
      Priority,
      number
    >;
    for (const entry of wishlist) counts[entry.priority] += 1;
    return counts;
  }, [wishlist]);

  // Both sets, because a title can honestly be in both places and saying which
  // is more use than saying "seen before". See docs/adr/0005.
  const knownIgdbIds = useMemo(
    () => ({
      library: new Set(
        games
          .map((game) => game.igdb_id)
          .filter((id): id is number => typeof id === "number"),
      ),
      wishlist: new Set(
        wishlist
          .map((entry) => entry.igdb_id)
          .filter((id): id is number => typeof id === "number"),
      ),
    }),
    [games, wishlist],
  );

  // Only genres in use, sorted, so the filter can never offer an empty result.
  // Derived per tab rather than pooled: a genre you only ever wished for should
  // not sit in the library's dropdown returning nothing.
  const genresInUse = useMemo(
    () =>
      [...new Set(games.flatMap((game) => game.genres))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [games],
  );

  const wishGenresInUse = useMemo(
    () =>
      [...new Set(wishlist.flatMap((entry) => entry.genres))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [wishlist],
  );

  const visible = useMemo(() => {
    const term = filters.search.trim().toLowerCase();
    const filtered = games.filter((game) => {
      if (filters.status !== "all" && game.status !== filters.status) return false;
      if (filters.platform !== "all" && game.platform !== filters.platform) return false;
      if (filters.genre !== "all" && !game.genres.includes(filters.genre)) return false;
      if (!matchesCriticBand(game.critic_rating, filters.critic)) return false;
      if (term && !game.title.toLowerCase().includes(term)) return false;
      return true;
    });

    const byTitle = (a: Game, b: Game) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

    // Games with no value for the active key sit out the ordering entirely and
    // land at the bottom whichever way round the list runs. Reversing is meant
    // to surface your worst-reviewed games, not the ones nobody reviewed.
    const valued: Game[] = [];
    const unvalued: Game[] = [];
    for (const game of filtered) {
      (hasSortValue(game, filters.sort) ? valued : unvalued).push(game);
    }

    // Each case is written in its natural direction - A–Z for title,
    // highest/most/newest first for the rest - and `flip` turns it round.
    // It multiplies the primary comparison only: the title tiebreak stays A–Z
    // in both directions, so reversing "Most played" doesn't also silently
    // re-alphabetise every game tied on zero.
    const flip = filters.direction === "reversed" ? -1 : 1;

    valued.sort((a, b) => {
      switch (filters.sort) {
        case "title":
          return flip * byTitle(a, b);
        case "rating":
          return flip * (b.rating - a.rating) || byTitle(a, b);
        // Nulls are already partitioned out, so the ?? never fires - it is
        // here to satisfy the type, not to act as a sentinel.
        case "critic":
          return flip * ((b.critic_rating ?? 0) - (a.critic_rating ?? 0)) || byTitle(a, b);
        case "playtime":
          return flip * (b.playtime_minutes - a.playtime_minutes) || byTitle(a, b);
        case "achievements":
          return flip * ((b.achievement_pct ?? 0) - (a.achievement_pct ?? 0)) || byTitle(a, b);
        case "added":
        default:
          // `id` continues the same ordering at finer resolution for games
          // added in the same second rather than breaking a tie over it, so it
          // reverses along with `created_at` instead of holding still.
          return flip * (b.created_at.localeCompare(a.created_at) || b.id - a.id);
      }
    });

    unvalued.sort(byTitle);
    return [...valued, ...unvalued];
  }, [games, filters]);

  /**
   * The wishlist, filtered, sorted and split into its three sections.
   *
   * Every tier is returned whether or not it has entries, because the headings
   * are how the tab explains itself - a wishlist with nothing on Must have is
   * telling you something, and hiding the heading would hide it. The rendering
   * decides what to do with an empty one.
   */
  const wishSections = useMemo(() => {
    const term = wishFilters.search.trim().toLowerCase();
    const filtered = wishlist.filter((entry) => {
      if (wishFilters.priority !== "all" && entry.priority !== wishFilters.priority) {
        return false;
      }
      if (wishFilters.genre !== "all" && !entry.genres.includes(wishFilters.genre)) {
        return false;
      }
      if (!matchesCriticBand(entry.critic_rating, wishFilters.critic)) return false;
      if (term && !entry.title.toLowerCase().includes(term)) return false;
      return true;
    });

    const byTitle = (a: WishlistEntry, b: WishlistEntry) =>
      a.title.localeCompare(b.title, undefined, { sensitivity: "base" });

    // Same shape as the library's sort, and for the same reason: entries with
    // no value for the active key sit out the ordering and land at the bottom
    // of their section in both directions. See docs/adr/0004.
    const flip = wishFilters.direction === "reversed" ? -1 : 1;

    const order = (rows: WishlistEntry[]) => {
      const valued: WishlistEntry[] = [];
      const unvalued: WishlistEntry[] = [];
      for (const entry of rows) {
        (hasWishlistSortValue(entry, wishFilters.sort) ? valued : unvalued).push(entry);
      }

      valued.sort((a, b) => {
        switch (wishFilters.sort) {
          case "title":
            return flip * byTitle(a, b);
          case "critic":
            return flip * ((b.critic_rating ?? 0) - (a.critic_rating ?? 0)) || byTitle(a, b);
          // Nulls are partitioned out above, so the ?? never fires. Soonest
          // first is the natural direction here - the thing coming out next is
          // the thing a wishlist is asking about.
          case "release":
            return (
              flip * (a.release_date ?? "").localeCompare(b.release_date ?? "") ||
              byTitle(a, b)
            );
          case "added":
          default:
            return flip * (b.created_at.localeCompare(a.created_at) || b.id - a.id);
        }
      });

      unvalued.sort(byTitle);
      return [...valued, ...unvalued];
    };

    return PRIORITIES.map((priority) => ({
      priority,
      entries: order(filtered.filter((entry) => entry.priority === priority)),
    }));
  }, [wishlist, wishFilters]);

  const wishVisibleCount = wishSections.reduce(
    (total, section) => total + section.entries.length,
    0,
  );

  const filtersActive =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.platform !== "all" ||
    filters.genre !== "all" ||
    filters.critic !== "all";

  /**
   * The three filters that can hide a tier's contents from you, as opposed to
   * the chip, which hides the other tiers because you asked it to. The
   * difference decides which empty state an empty tier gets: "clear your
   * filters" is good advice for the first and wrong for the second.
   */
  const wishOtherFiltersActive =
    wishFilters.search.trim() !== "" ||
    wishFilters.genre !== "all" ||
    wishFilters.critic !== "all";

  const wishFiltersActive = wishOtherFiltersActive || wishFilters.priority !== "all";

  /** The selected tier's entries, flat. Only one section can be non-empty when
      a chip is on, so concatenating is the whole of it. */
  const wishEntries = useMemo(
    () => wishSections.flatMap((section) => section.entries),
    [wishSections],
  );

  /**
   * The header line, which describes the tab you are on and only that tab. Each
   * leads with its own total and then the figures worth knowing about it - for
   * the library the shelves you finished on, for the wishlist the tier you
   * would actually spend money on today.
   *
   * The library's three finishing shelves are printed as three separate
   * numbers and are never summed. A reader who wants "how many did I finish?"
   * has to add them up themselves, which is exactly the point: they are
   * independent shelves, not rungs. See docs/adr/0001 and docs/adr/0007.
   */
  const summary = useMemo(() => {
    if (tab === "wishlist") {
      if (wishlist.length === 0) return "Games you want and do not own";
      const n = wishlist.length;
      return `${n} on your wishlist · ${priorityCounts["must-have"]} must have`;
    }
    if (games.length === 0) return "Your PC game library";
    const n = games.length;
    return (
      `${n} game${n === 1 ? "" : "s"} · ${statusCounts.completed} completed · ` +
      `${statusCounts.platinum} platinum · ${statusCounts["above-and-beyond"]} above and beyond`
    );
  }, [tab, games.length, wishlist.length, statusCounts, priorityCounts]);

  async function handleSubmit(input: GameInput) {
    const editing = formFor?.game ?? null;
    const buying = formFor?.buying ?? null;
    if (editing) {
      await db.updateGame(editing.id, input);
    } else if (buying) {
      // Writes the game, then drops the entry. Only on save - cancelling the
      // form leaves the entry exactly where it was. See docs/adr/0005.
      await db.buyWishlistEntry(buying.id, input);
    } else {
      await db.createGame(input);
    }
    await refresh();
    setFormFor(null);
    if (buying) {
      // The tab does not switch on its own. You said you bought one thing, not
      // that you were done with the wishlist.
      notify(`${input.title} moved to your library.`);
    } else {
      notify(editing ? `Updated ${input.title}.` : `Added ${input.title} to your library.`);
    }
  }

  async function handleWishlistSubmit(input: WishlistInput) {
    const editing = wishFormFor?.entry ?? null;
    if (editing) {
      await db.updateWishlistEntry(editing.id, input);
    } else {
      await db.createWishlistEntry(input);
    }
    await refresh();
    setWishFormFor(null);
    notify(editing ? `Updated ${input.title}.` : `Added ${input.title} to your wishlist.`);
  }

  async function handleRemoveEntry() {
    if (!removing) return;
    setDeleteBusy(true);
    try {
      await db.deleteWishlistEntry(removing.id);
      if (removing.cover_file) {
        await deleteCover(removing.cover_file).catch(() => undefined);
      }
      await refresh();
      notify(`Removed ${removing.title} from your wishlist.`);
      setRemoving(null);
    } catch (cause) {
      notify(errorMessage(cause), "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleAddStorefront(name: string) {
    await db.addStorefront(name);
    setStorefronts(await db.listStorefronts());
  }

  async function handleDelete() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await db.deleteGame(deleting.id);
      if (deleting.cover_file) await deleteCover(deleting.cover_file).catch(() => undefined);
      await refresh();
      notify(`Removed ${deleting.title}.`);
      setDeleting(null);
    } catch (cause) {
      notify(errorMessage(cause), "error");
    } finally {
      setDeleteBusy(false);
    }
  }

  async function handleLoadSamples() {
    try {
      await db.loadSamples();
      await refresh();
      notify("Added a sample library and wishlist.");
    } catch (cause) {
      notify(errorMessage(cause), "error");
    }
  }

  async function handleClearSamples() {
    try {
      const orphans = await db.clearSamples();
      await Promise.all(orphans.map((file) => deleteCover(file).catch(() => undefined)));
      await refresh();
      notify("Removed the sample data.");
    } catch (cause) {
      notify(errorMessage(cause), "error");
    }
  }

  /**
   * The wishlist's body, in whichever layout is on. Written once rather than
   * three times: the three stacked tiers and a single selected tier draw the
   * same thing, and only the heading above them differs.
   *
   * `labelledBy` points a stacked table at its own tier's heading, so a screen
   * reader moving between three tables is told which tier each one is.
   */
  const wishBody = (entries: WishlistEntry[], labelledBy?: string) =>
    view === "list" ? (
      <WishlistTable
        entries={entries}
        sort={wishFilters.sort}
        direction={wishFilters.direction}
        onSortChange={(sort, direction) =>
          setWishFilters({ ...wishFilters, sort, direction })
        }
        onEdit={(target) => setWishFormFor({ entry: target })}
        onBuy={(target) => setFormFor({ game: null, buying: target })}
        onDelete={(target) => setRemoving(target)}
        labelledBy={labelledBy}
      />
    ) : (
      <div className="grid">
        {entries.map((entry) => (
          <WishlistCard
            key={entry.id}
            entry={entry}
            onEdit={(target) => setWishFormFor({ entry: target })}
            onBuy={(target) => setFormFor({ game: null, buying: target })}
            onDelete={(target) => setRemoving(target)}
          />
        ))}
      </div>
    );

  if (fatalError) {
    return (
      <main className="app">
        <div className="empty">
          <div className="empty-art" aria-hidden="true">
            ⚠️
          </div>
          <h2>gamerzz could not start</h2>
          <p>{fatalError}</p>
          <button
            type="button"
            className="button primary"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="app-header">
        <div className="brand">
          <h1>gamerzz</h1>
          {/* Per tab, and never both counts on one line. Owned and wanted are
              different kinds of thing, and a header that put them side by side
              would invite reading a total across them - which is the mistake
              docs/adr/0001 exists to prevent, one level up. */}
          <p>{loading ? "Loading your library…" : summary}</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button subtle"
            onClick={() => setShowSettings(true)}
          >
            ⚙ Settings
          </button>
          {tab === "library" ? (
            <button
              type="button"
              className="button primary"
              onClick={() => setFormFor({ game: null, buying: null })}
            >
              + Add game
            </button>
          ) : (
            <button
              type="button"
              className="button primary"
              onClick={() => setWishFormFor({ entry: null })}
            >
              + Add to wishlist
            </button>
          )}
        </div>
      </header>

      {/* Always rendered, even with both tabs empty: a tab bar that appears
          only once you have data is a tab bar nobody discovers. */}
      <Tabs active={tab} onChange={setTab} />

      {loading && (
        <div className="grid">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="card skeleton-card">
              <div className="cover shimmer" />
              <div className="card-body">
                <div className="shimmer line" />
                <div className="shimmer line short" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tab === "library" && (
        <div id="panel-library" role="tabpanel" aria-labelledby="tab-library">
          {games.length > 0 && (
            <Toolbar
              filters={filters}
              onChange={setFilters}
              storefronts={storefronts}
              genres={genresInUse}
              statusCounts={statusCounts}
              total={games.length}
              view={view}
              onViewChange={changeView}
            />
          )}

          {games.length === 0 && (
            <EmptyState
              variant="library"
              onAdd={() => setFormFor({ game: null, buying: null })}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
            />
          )}

          {games.length > 0 && visible.length === 0 && (
            <EmptyState
              variant="filter"
              onAdd={() => setFormFor({ game: null, buying: null })}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
            />
          )}

          {visible.length > 0 && (
            <>
              {filtersActive && (
                <p className="result-count">
                  Showing {visible.length} of {games.length} games
                </p>
              )}
              {view === "list" ? (
                <GameTable
                  games={visible}
                  sort={filters.sort}
                  direction={filters.direction}
                  onSortChange={(sort, direction) =>
                    setFilters({ ...filters, sort, direction })
                  }
                  onEdit={(target) => setFormFor({ game: target, buying: null })}
                  onDelete={(target) => setDeleting(target)}
                />
              ) : (
                <div className="grid">
                  {visible.map((game) => (
                    <GameCard
                      key={game.id}
                      game={game}
                      onEdit={(target) => setFormFor({ game: target, buying: null })}
                      onDelete={(target) => setDeleting(target)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!loading && tab === "wishlist" && (
        <div id="panel-wishlist" role="tabpanel" aria-labelledby="tab-wishlist">
          {wishlist.length > 0 && (
            <WishlistToolbar
              filters={wishFilters}
              onChange={setWishFilters}
              genres={wishGenresInUse}
              priorityCounts={priorityCounts}
              total={wishlist.length}
              view={view}
              onViewChange={changeView}
            />
          )}

          {wishlist.length === 0 && (
            <EmptyState
              variant="wishlist"
              onAdd={() => setWishFormFor({ entry: null })}
              onClearFilters={() => setWishFilters(DEFAULT_WISHLIST_FILTERS)}
            />
          )}

          {/* Only when something is actually filtering the contents out. A tier
              you picked and own nothing on falls through to "Nothing here."
              below, where the chips and the blurb stay on screen - the big
              empty state's "clear your filters" is the wrong advice for a chip
              you deliberately clicked. */}
          {wishlist.length > 0 && wishVisibleCount === 0 && wishOtherFiltersActive && (
            <EmptyState
              variant="wishlist-filter"
              onAdd={() => setWishFormFor({ entry: null })}
              onClearFilters={() => setWishFilters(DEFAULT_WISHLIST_FILTERS)}
            />
          )}

          {wishlist.length > 0 && wishVisibleCount === 0 && !wishOtherFiltersActive && (
            <p className="wish-section-empty">Nothing here.</p>
          )}

          {wishVisibleCount > 0 && (
            <>
              {wishFiltersActive && (
                <p className="result-count">
                  Showing {wishVisibleCount} of {wishlist.length} entries
                </p>
              )}
              {/* With a tier selected there is no heading at all: the chip
                  above already carries the name and the count, and the blurb
                  sits under the chips. A heading here would say "Must have 3"
                  directly below a chip reading "Must have 3". */}
              {wishFilters.priority !== "all" && wishBody(wishEntries)}

              {/* All three, top to bottom in priority order, which is the
                  ranking itself rather than a sort you happen to have chosen. A
                  tier with nothing in it still shows its heading while
                  unfiltered - an empty Must have is worth seeing. Under a
                  filter it is dropped, because "nothing matched" is not the
                  same statement. */}
              {wishFilters.priority === "all" &&
                wishSections.map(({ priority, entries }) =>
                  entries.length === 0 && wishFiltersActive ? null : (
                    <section key={priority} className="wish-section">
                      <div className="wish-section-head">
                        <h2 id={`wish-tier-${priority}`}>
                          <span
                            className={`priority-dot priority-${priority}`}
                            aria-hidden="true"
                          />
                          {PRIORITY_LABELS[priority]}
                          <span className="wish-section-count">
                            {wishFiltersActive
                              ? entries.length
                              : priorityCounts[priority]}
                          </span>
                        </h2>
                        <p>{PRIORITY_BLURBS[priority]}</p>
                      </div>
                      {entries.length === 0 ? (
                        <p className="wish-section-empty">Nothing here.</p>
                      ) : (
                        wishBody(entries, `wish-tier-${priority}`)
                      )}
                    </section>
                  ),
                )}
            </>
          )}
        </div>
      )}

      {formFor && (
        <GameForm
          key={formFor.game?.id ?? (formFor.buying ? `buy-${formFor.buying.id}` : "new")}
          game={formFor.game}
          buying={formFor.buying}
          storefronts={storefronts}
          igdbEnabled={igdbEnabled}
          known={knownIgdbIds}
          onSubmit={handleSubmit}
          onAddStorefront={handleAddStorefront}
          onClose={() => setFormFor(null)}
        />
      )}

      {wishFormFor && (
        <WishlistForm
          key={wishFormFor.entry?.id ?? "new"}
          entry={wishFormFor.entry}
          igdbEnabled={igdbEnabled}
          known={knownIgdbIds}
          onSubmit={handleWishlistSubmit}
          onClose={() => setWishFormFor(null)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this game?"
          message={`"${deleting.title}" will be removed from your library, along with its cover image. This cannot be undone.`}
          confirmLabel="Delete"
          busy={deleteBusy}
          onConfirm={() => void handleDelete()}
          onCancel={() => setDeleting(null)}
        />
      )}

      {removing && (
        <ConfirmDialog
          title="Remove this from your wishlist?"
          message={`"${removing.title}" will be removed from your wishlist, along with its cover image. If you bought it, use "I bought this" instead so it moves to your library.`}
          confirmLabel="Remove"
          busy={deleteBusy}
          onConfirm={() => void handleRemoveEntry()}
          onCancel={() => setRemoving(null)}
        />
      )}

      {showSettings && (
        <SettingsDialog
          igdbEnabled={igdbEnabled}
          sampleCounts={sampleCounts}
          onIgdbChanged={setIgdbEnabled}
          onLoadSamples={handleLoadSamples}
          onClearSamples={handleClearSamples}
          onClose={() => setShowSettings(false)}
        />
      )}

      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}
