import { useEffect, useState } from "react";
import { errorMessage, igdbDlc } from "../lib/api";
import { releaseYear } from "../lib/format";
import { Modal } from "./Modal";
import type { Game, IgdbGame } from "../types";

/**
 * "IGDB lists 2 DLC for this — add them?", straight after a base game is saved.
 *
 * After rather than before, because there is no parent row to file anything
 * under until the base game exists. Staging the picks in form state and
 * creating them afterwards would reach the same place by a longer road.
 *
 * It advises and never acts on its own: nothing is ticked when it opens, and
 * closing it adds nothing. That is docs/adr/0002's rule applied to a second
 * kind of hint - the app can see what you are missing, and it still does not
 * get to decide that you want it.
 *
 * It fetches its own list. The ids came back with the base game's search
 * result, but the names and covers did not, and that second request has no
 * business delaying a save.
 */
interface DlcOfferProps {
  parent: Game;
  ids: number[];
  /** Ids already in the library, so a second visit does not re-offer them. */
  known: Set<number>;
  onAdd: (picks: IgdbGame[]) => Promise<void>;
  onClose: () => void;
}

export function DlcOffer({ parent, ids, known, onAdd, onClose }: DlcOfferProps) {
  const [results, setResults] = useState<IgdbGame[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const found = await igdbDlc(ids);
        if (!live) return;
        // Anything already owned is dropped rather than shown ticked: this is
        // a list of what you are missing, and a row you cannot act on is noise.
        setResults(found.filter((game) => !known.has(game.igdb_id)));
      } catch (cause) {
        if (live) setError(errorMessage(cause));
      }
    })();
    return () => {
      live = false;
    };
  }, [ids, known]);

  function toggle(id: number) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm() {
    if (!results) return;
    setSaving(true);
    try {
      await onAdd(results.filter((game) => picked.has(game.igdb_id)));
    } catch (cause) {
      setError(errorMessage(cause));
      setSaving(false);
    }
  }

  // Nothing to offer is not worth a dialog. The parent is already saved and
  // the toast has already said so, so this closes itself without a word.
  useEffect(() => {
    if (results !== null && results.length === 0 && !error) onClose();
  }, [results, error, onClose]);

  return (
    <Modal
      title={`DLC for ${parent.title}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button subtle" onClick={onClose} disabled={saving}>
            Not now
          </button>
          <button
            type="button"
            className="button primary"
            onClick={() => void confirm()}
            disabled={saving || picked.size === 0}
          >
            {saving
              ? "Adding…"
              : picked.size === 0
                ? "Add selected"
                : `Add ${picked.size}`}
          </button>
        </>
      }
    >
      {error && <p className="igdb-notice">{error}</p>}

      {!results && !error && <p className="igdb-empty">Asking IGDB…</p>}

      {results && results.length > 0 && (
        <>
          <p className="dlc-offer-lede">
            IGDB lists {results.length === 1 ? "this" : "these"} under {parent.title}. Tick
            whatever you own — each one is added as a game filed under it, with its own
            shelf and its own playtime.
          </p>
          <ul className="dlc-offer-list">
            {results.map((game) => {
              const year = releaseYear(game.release_date);
              return (
                <li key={game.igdb_id}>
                  <label className="dlc-offer-row">
                    <input
                      type="checkbox"
                      checked={picked.has(game.igdb_id)}
                      onChange={() => toggle(game.igdb_id)}
                    />
                    {game.thumb_url ? (
                      <img className="igdb-thumb" src={game.thumb_url} alt="" loading="lazy" />
                    ) : (
                      <div className="igdb-thumb igdb-thumb-blank" aria-hidden="true" />
                    )}
                    <span className="igdb-lines">
                      <span className="igdb-name">
                        {game.name}
                        {year && <span className="igdb-year"> ({year})</span>}
                      </span>
                      {game.genres.length > 0 && (
                        <span className="igdb-sub">
                          <span className="igdb-genres">
                            {game.genres.slice(0, 3).join(" · ")}
                          </span>
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}
