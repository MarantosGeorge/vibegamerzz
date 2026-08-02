import { useState } from "react";
import { errorMessage, igdbSearch } from "../lib/api";
import { releaseYear } from "../lib/format";
import type { IgdbGame } from "../types";

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

  async function run() {
    const query = term.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      setResults(await igdbSearch(query));
    } catch (cause) {
      setError(errorMessage(cause));
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

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
            // The form's submit button is elsewhere; Enter here means "search".
            if (event.key === "Enter") {
              event.preventDefault();
              void run();
            }
          }}
        />
        <button
          type="button"
          className="button subtle"
          onClick={() => void run()}
          disabled={loading || !term.trim()}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {error && <p className="field-error">{error}</p>}

      {loading && (
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

      {!loading && !!results?.length && (
        <ul className="igdb-results">
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
