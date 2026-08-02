import { useCallback, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { EmptyState } from "./components/EmptyState";
import { GameCard } from "./components/GameCard";
import { GameForm } from "./components/GameForm";
import { SettingsDialog } from "./components/SettingsDialog";
import { ToastStack, type ToastMessage } from "./components/Toast";
import { Toolbar, type Filters } from "./components/Toolbar";
import {
  deleteCover,
  errorMessage,
  igdbConfigured,
  initCovers,
} from "./lib/api";
import * as db from "./lib/db";
import { hasSortValue, matchesCriticBand, STATUSES } from "./types";
import type { Game, GameInput, Status } from "./types";

const DEFAULT_FILTERS: Filters = {
  search: "",
  status: "all",
  platform: "all",
  genre: "all",
  critic: "all",
  sort: "added",
  direction: "natural",
};

export default function App() {
  const [games, setGames] = useState<Game[]>([]);
  const [storefronts, setStorefronts] = useState<string[]>([]);
  const [igdbEnabled, setIgdbEnabled] = useState(false);
  const [sampleCount, setSampleCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [formFor, setFormFor] = useState<{ game: Game | null } | null>(null);
  const [deleting, setDeleting] = useState<Game | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const notify = useCallback((text: string, tone: ToastMessage["tone"] = "success") => {
    setToasts((current) => [...current, { id: Date.now() + Math.random(), text, tone }]);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    const [rows, fronts, samples] = await Promise.all([
      db.listGames(),
      db.listStorefronts(),
      db.countSampleGames(),
    ]);
    setGames(rows);
    setStorefronts(fronts);
    setSampleCount(samples);
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

  const existingIgdbIds = useMemo(
    () =>
      new Set(
        games
          .map((game) => game.igdb_id)
          .filter((id): id is number => typeof id === "number"),
      ),
    [games],
  );

  // Only genres in use, sorted, so the filter can never offer an empty result.
  const genresInUse = useMemo(
    () =>
      [...new Set(games.flatMap((game) => game.genres))].sort((a, b) =>
        a.localeCompare(b, undefined, { sensitivity: "base" }),
      ),
    [games],
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

  const filtersActive =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.platform !== "all" ||
    filters.genre !== "all" ||
    filters.critic !== "all";

  async function handleSubmit(input: GameInput) {
    const editing = formFor?.game ?? null;
    if (editing) {
      await db.updateGame(editing.id, input);
    } else {
      await db.createGame(input);
    }
    await refresh();
    setFormFor(null);
    notify(editing ? `Updated ${input.title}.` : `Added ${input.title} to your library.`);
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
      await db.loadSampleGames();
      await refresh();
      notify("Added eight sample games.");
    } catch (cause) {
      notify(errorMessage(cause), "error");
    }
  }

  async function handleClearSamples() {
    try {
      const orphans = await db.clearSampleGames();
      await Promise.all(orphans.map((file) => deleteCover(file).catch(() => undefined)));
      await refresh();
      notify("Removed the sample games.");
    } catch (cause) {
      notify(errorMessage(cause), "error");
    }
  }

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
          <p>
            {loading
              ? "Loading your library…"
              : games.length === 0
                ? "Your PC game library"
                : `${games.length} game${games.length === 1 ? "" : "s"} · ${statusCounts.completed} completed · ${statusCounts.platinum} platinum`}
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="button subtle"
            onClick={() => setShowSettings(true)}
          >
            ⚙ Settings
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => setFormFor({ game: null })}
          >
            + Add game
          </button>
        </div>
      </header>

      {!loading && games.length > 0 && (
        <Toolbar
          filters={filters}
          onChange={setFilters}
          storefronts={storefronts}
          genres={genresInUse}
          statusCounts={statusCounts}
          total={games.length}
        />
      )}

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

      {!loading && games.length === 0 && (
        <EmptyState
          variant="library"
          onAdd={() => setFormFor({ game: null })}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      )}

      {!loading && games.length > 0 && visible.length === 0 && (
        <EmptyState
          variant="filter"
          onAdd={() => setFormFor({ game: null })}
          onClearFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      )}

      {!loading && visible.length > 0 && (
        <>
          {filtersActive && (
            <p className="result-count">
              Showing {visible.length} of {games.length} games
            </p>
          )}
          <div className="grid">
            {visible.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                onEdit={(target) => setFormFor({ game: target })}
                onDelete={(target) => setDeleting(target)}
              />
            ))}
          </div>
        </>
      )}

      {formFor && (
        <GameForm
          key={formFor.game?.id ?? "new"}
          game={formFor.game}
          storefronts={storefronts}
          igdbEnabled={igdbEnabled}
          existingIgdbIds={existingIgdbIds}
          onSubmit={handleSubmit}
          onAddStorefront={handleAddStorefront}
          onClose={() => setFormFor(null)}
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

      {showSettings && (
        <SettingsDialog
          igdbEnabled={igdbEnabled}
          sampleCount={sampleCount}
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
