import { useCallback, useEffect, useRef, useState } from "react";
import { errorMessage, igdbSearch } from "../lib/api";
import { releaseYear } from "../lib/format";
import type { IgdbGame } from "../types";

/**
 * How long a pause counts as "stopped typing". IGDB's ceiling is four requests
 * a second, so this is the number that keeps the catalogue feeling like the
 * library filter without walking into a 429: 300ms caps the worst plausible
 * typing rhythm at about 3.3 requests a second.
 */
const DEBOUNCE_MS = 300;

/**
 * The library filter reacts to a single letter, and matching that exactly is
 * tempting. It does not survive contact with the catalogue: IGDB's search is
 * relevance-ranked with a limit of 24, so one letter returns 24 arbitrary PC
 * games - worse than showing nothing at all.
 */
const MIN_CHARS = 2;

/**
 * Terms already searched this session, keyed on the trimmed lowercased term.
 *
 * Module-level on purpose. It has to outlive the component so that backspacing
 * is instant, so that closing and reopening the panel starts warm, and so that
 * moving between the Add Game and Add Wishlist forms - which share this
 * component and therefore unmount it - does not throw the results away.
 *
 * Only successes land here. An empty result is a real answer and is cached; an
 * error is not, or a single 429 would poison that term until the app restarts.
 */
const searchCache = new Map<string, IgdbGame[]>();

/**
 * Where the app has already seen an IGDB id. Called out, never blocked - and
 * only ever a partial answer, because a title typed in by hand has no IGDB id
 * to match on at all. See docs/adr/0005.
 */
export interface KnownIgdbIds {
  library: Set<number>;
  wishlist: Set<number>;
}

interface IgdbSearchProps {
  onPick: (game: IgdbGame) => void;
  known: KnownIgdbIds;
}

export function IgdbSearch({ onPick, known }: IgdbSearchProps) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<IgdbGame[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Latest-wins guard. Searching on a debounce means several requests can be
   * in flight at once, and they are not guaranteed to come back in order -
   * typing "hunger" then " games" can land the first response second, leaving
   * results for a query the box has already moved past. Genuine cancellation
   * is not available: Tauri's `invoke` takes no AbortSignal, so the request
   * finishes on the wire and we discard the answer instead.
   */
  const issued = useRef(0);

  /** Held so Enter can cut the wait short rather than racing it. */
  const timer = useRef<number | null>(null);

  const search = useCallback(async (query: string) => {
    const id = ++issued.current;
    setLoading(true);
    setError(null);
    try {
      const found = await igdbSearch(query);
      if (id !== issued.current) return;
      searchCache.set(query.toLowerCase(), found);
      setResults(found);
    } catch (cause) {
      if (id !== issued.current) return;
      // Results are deliberately left alone: the rows on screen are still
      // valid picks, and typing again retries on its own, so most failures
      // clear themselves before they have been read.
      setError(errorMessage(cause));
    } finally {
      if (id === issued.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const query = term.trim();

    if (query.length < MIN_CHARS) {
      issued.current++;
      setLoading(false);
      setResults(null);
      setError(null);
      return;
    }

    const cached = searchCache.get(query.toLowerCase());
    if (cached) {
      // No debounce and no loading state: this is not a network call, so it
      // should not look like one.
      issued.current++;
      setLoading(false);
      setResults(cached);
      setError(null);
      return;
    }

    timer.current = window.setTimeout(() => {
      timer.current = null;
      void search(query);
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current !== null) {
        clearTimeout(timer.current);
        timer.current = null;
      }
    };
  }, [term, search]);

  /**
   * Enter means "don't make me wait out the pause". Once the search has
   * already run it doubles as a retry, and costs nothing when it is not one:
   * a term that succeeded is in the cache and comes straight back, while a
   * term that failed is not and gets a fresh attempt.
   */
  function searchNow() {
    const query = term.trim();
    if (query.length < MIN_CHARS) return;
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    const cached = searchCache.get(query.toLowerCase());
    if (cached) {
      issued.current++;
      setLoading(false);
      setResults(cached);
      setError(null);
      return;
    }
    void search(query);
  }

  // Only ever true with rows on screen to dim, so the list never blanks
  // mid-typing. With nothing to keep, the skeletons below stand in instead.
  const stale = loading && !!results?.length;

  return (
    <section className="igdb">
      <div className="igdb-search">
        <input
          type="search"
          value={term}
          placeholder="Search IGDB for a game…"
          aria-label="Search IGDB"
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            // Load-bearing: this input sits inside the game form, so without
            // preventDefault Enter submits a half-filled form.
            if (event.key === "Enter") {
              event.preventDefault();
              searchNow();
            }
          }}
        />
      </div>

      {error && <p className="igdb-notice">{error}</p>}

      {loading && !results?.length && (
        <ul className="igdb-results">
          {[0, 1, 2].map((n) => (
            <li key={n} className="igdb-result skeleton">
              <div className="igdb-thumb shimmer" />
              <div className="igdb-lines">
                <div className="shimmer line" />
                <div className="shimmer line short" />
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && results?.length === 0 && (
        <p className="igdb-empty">
          No PC games found for that search. Check the spelling, or close this panel and type
          the details in by hand.
        </p>
      )}

      {!!results?.length && (
        <ul className={stale ? "igdb-results stale" : "igdb-results"}>
          {results.map((result) => {
            const year = releaseYear(result.release_date);
            // Both are possible at once: nothing stops you owning a game and
            // still having an entry for it, and saying so is more use than
            // picking one of the two to mention.
            const inLibrary = known.library.has(result.igdb_id);
            const onWishlist = known.wishlist.has(result.igdb_id);
            return (
              <li key={result.igdb_id}>
                <button
                  type="button"
                  className="igdb-result"
                  onClick={() => onPick(result)}
                >
                  {result.thumb_url ? (
                    <img className="igdb-thumb" src={result.thumb_url} alt="" loading="lazy" />
                  ) : (
                    <div className="igdb-thumb igdb-thumb-blank" aria-hidden="true" />
                  )}
                  <span className="igdb-lines">
                    <span className="igdb-name">
                      {result.name}
                      {year && <span className="igdb-year"> ({year})</span>}
                    </span>
                    {(result.critic_rating !== null || result.genres.length > 0) && (
                      <span className="igdb-sub">
                        {result.critic_rating !== null && (
                          <span className="igdb-score">{result.critic_rating}</span>
                        )}
                        {/* Three is as many as fits before the row wraps. */}
                        <span className="igdb-genres">
                          {result.genres.slice(0, 3).join(" · ")}
                        </span>
                      </span>
                    )}
                    {(inLibrary || onWishlist) && (
                      <span className="igdb-duplicate">
                        {inLibrary && onWishlist
                          ? "In your library, and on your wishlist"
                          : inLibrary
                            ? "Already in your library"
                            : "Already on your wishlist"}
                      </span>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
