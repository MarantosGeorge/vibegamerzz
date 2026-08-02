import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  deleteCover,
  errorMessage,
  saveCoverFromFile,
  saveCoverFromUrl,
} from "../lib/api";
import {
  DEFAULT_PRIORITY,
  IGDB_GENRES,
  PRIORITIES,
  PRIORITY_BLURBS,
  PRIORITY_LABELS,
} from "../types";
import type { IgdbGame, Priority, WishlistEntry, WishlistInput } from "../types";
import { CoverImage } from "./CoverImage";
import { IgdbSearch, type KnownIgdbIds } from "./IgdbSearch";
import { Modal } from "./Modal";

const ADD_GENRE = "";

interface WishlistFormProps {
  entry: WishlistEntry | null;
  igdbEnabled: boolean;
  known: KnownIgdbIds;
  onSubmit: (input: WishlistInput) => Promise<void>;
  onClose: () => void;
}

type Errors = Partial<Record<string, string>>;

/**
 * The game form minus everything that is a fact about owning something.
 *
 * There is no storefront, status, playtime, achievement or star-rating field
 * here, and their absence is the point rather than an omission: a wishlist entry
 * is not a game (docs/adr/0005). What it has instead is a priority, which is
 * never blank and never optional (docs/adr/0006).
 *
 * The cover-file bookkeeping is deliberately identical to GameForm's, because it
 * is the same disk folder and the same failure - a cancelled form that leaves an
 * image behind.
 */
export function WishlistForm({
  entry,
  igdbEnabled,
  known,
  onSubmit,
  onClose,
}: WishlistFormProps) {
  const [title, setTitle] = useState(entry?.title ?? "");
  const [priority, setPriority] = useState<Priority>(entry?.priority ?? DEFAULT_PRIORITY);
  const [critic, setCritic] = useState(
    entry?.critic_rating === null || entry?.critic_rating === undefined
      ? ""
      : String(entry.critic_rating),
  );
  const [genres, setGenres] = useState<string[]>(entry?.genres ?? []);
  const [notes, setNotes] = useState(entry?.notes ?? "");
  const [coverFile, setCoverFile] = useState<string | null>(entry?.cover_file ?? null);
  const [igdbId, setIgdbId] = useState<number | null>(entry?.igdb_id ?? null);
  const [summary, setSummary] = useState<string | null>(entry?.summary ?? null);
  const [releaseDate, setReleaseDate] = useState<string | null>(entry?.release_date ?? null);

  const [imageUrl, setImageUrl] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);
  const [showIgdb, setShowIgdb] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const originalCover = entry?.cover_file ?? null;
  const [createdCovers, setCreatedCovers] = useState<string[]>([]);

  // Owning it is the warning worth giving on a wishlist; already having wished
  // for it is the lesser one, and both are said rather than blocked.
  const ownedWarning =
    igdbId !== null && igdbId !== entry?.igdb_id && known.library.has(igdbId);
  const wishedWarning =
    igdbId !== null && igdbId !== entry?.igdb_id && known.wishlist.has(igdbId);

  const genreOptions = [...new Set([...IGDB_GENRES, ...genres])]
    .filter((name) => !genres.includes(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  function clearError(key: string) {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function recordCover(fileName: string) {
    setCreatedCovers((current) => [...current, fileName]);
    setCoverFile(fileName);
  }

  async function discard(files: string[]) {
    await Promise.all(files.map((file) => deleteCover(file).catch(() => undefined)));
  }

  async function handleCancel() {
    await discard(createdCovers);
    onClose();
  }

  async function pickFile() {
    setFormError(null);
    try {
      const selected = await open({
        multiple: false,
        directory: false,
        filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif", "avif"] }],
      });
      if (typeof selected !== "string") return;
      setCoverBusy(true);
      recordCover(await saveCoverFromFile(selected));
    } catch (cause) {
      setFormError(errorMessage(cause));
    } finally {
      setCoverBusy(false);
    }
  }

  async function useImageUrl() {
    const url = imageUrl.trim();
    if (!url) return;
    setFormError(null);
    setCoverBusy(true);
    try {
      recordCover(await saveCoverFromUrl(url));
      setImageUrl("");
      setShowUrlField(false);
    } catch (cause) {
      setFormError(errorMessage(cause));
    } finally {
      setCoverBusy(false);
    }
  }

  async function pickIgdbResult(result: IgdbGame) {
    setFormError(null);
    setTitle(result.name);
    setIgdbId(result.igdb_id);
    setSummary(result.summary);
    setReleaseDate(result.release_date);
    setCritic(result.critic_rating === null ? "" : String(result.critic_rating));
    setGenres(result.genres);
    setShowIgdb(false);
    clearError("title");
    clearError("critic");

    if (!result.cover_url) return;
    setCoverBusy(true);
    try {
      recordCover(await saveCoverFromUrl(result.cover_url));
    } catch (cause) {
      setFormError(`${errorMessage(cause)} The other details were still filled in.`);
    } finally {
      setCoverBusy(false);
    }
  }

  function validate(): WishlistInput | null {
    const next: Errors = {};

    const cleanTitle = title.trim();
    if (!cleanTitle) next.title = "Give the game a title.";
    else if (cleanTitle.length > 200) next.title = "Titles must be 200 characters or fewer.";

    const criticValue = critic.trim() === "" ? null : Number(critic);
    if (
      criticValue !== null &&
      (!Number.isInteger(criticValue) || criticValue < 0 || criticValue > 100)
    ) {
      next.critic = "Critic score must be a whole number between 0 and 100, or blank.";
    }

    if (notes.length > 5000) next.notes = "Notes must be 5000 characters or fewer.";

    // Priority is not validated, and cannot be: the select has no empty option,
    // so there is no way to arrive here without one. See docs/adr/0006.

    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    return {
      title: cleanTitle,
      priority,
      critic_rating: criticValue,
      genres,
      cover_file: coverFile,
      notes: notes.trim() || null,
      igdb_id: igdbId,
      summary,
      release_date: releaseDate,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);
    const input = validate();
    if (!input) return;

    setSaving(true);
    try {
      await onSubmit(input);
      const orphans = createdCovers.filter((file) => file !== coverFile);
      if (originalCover && originalCover !== coverFile) orphans.push(originalCover);
      await discard(orphans);
    } catch (cause) {
      setFormError(errorMessage(cause));
      setSaving(false);
    }
  }

  return (
    <Modal
      title={entry ? "Edit wishlist entry" : "Add to wishlist"}
      onClose={() => void handleCancel()}
      wide
      footer={
        <>
          <button
            type="button"
            className="button subtle"
            onClick={() => void handleCancel()}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="wishlist-form"
            className="button primary"
            disabled={saving || coverBusy}
          >
            {saving ? "Saving…" : entry ? "Save changes" : "Add to wishlist"}
          </button>
        </>
      }
    >
      <form id="wishlist-form" onSubmit={handleSubmit} noValidate>
        {igdbEnabled && !showIgdb && (
          <button
            type="button"
            className="button subtle full"
            onClick={() => setShowIgdb(true)}
          >
            🔎 Search IGDB to fill this in automatically
          </button>
        )}
        {igdbEnabled && showIgdb && (
          <IgdbSearch onPick={(r) => void pickIgdbResult(r)} known={known} />
        )}

        {ownedWarning && (
          <p className="notice warning">
            You already own this one — it is in your library. You can still wish for it, which
            is fair enough if you want it on another storefront.
          </p>
        )}

        {!ownedWarning && wishedWarning && (
          <p className="notice warning">This is already on your wishlist.</p>
        )}

        <div className="form-grid">
          <div className="form-cover">
            <div className="cover-preview">
              <CoverImage title={title} coverFile={coverFile} />
              {coverBusy && <div className="cover-busy">Saving image…</div>}
            </div>
            <div className="cover-buttons">
              <button
                type="button"
                className="button subtle"
                onClick={() => void pickFile()}
                disabled={coverBusy}
              >
                Choose file…
              </button>
              <button
                type="button"
                className="button subtle"
                onClick={() => setShowUrlField((v) => !v)}
                disabled={coverBusy}
              >
                Paste link
              </button>
              {coverFile && (
                <button
                  type="button"
                  className="button danger-subtle"
                  onClick={() => setCoverFile(null)}
                  disabled={coverBusy}
                >
                  Remove
                </button>
              )}
            </div>
            {showUrlField && (
              <div className="url-field">
                <input
                  type="url"
                  value={imageUrl}
                  placeholder="https://example.com/cover.jpg"
                  aria-label="Image link"
                  onChange={(event) => setImageUrl(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void useImageUrl();
                    }
                  }}
                />
                <button
                  type="button"
                  className="button subtle"
                  onClick={() => void useImageUrl()}
                  disabled={coverBusy || !imageUrl.trim()}
                >
                  Use
                </button>
              </div>
            )}
          </div>

          <div className="form-fields">
            <label className="field">
              <span className="field-label">
                Title <em>required</em>
              </span>
              <input
                type="text"
                value={title}
                maxLength={200}
                onChange={(event) => {
                  setTitle(event.target.value);
                  clearError("title");
                }}
                aria-invalid={!!errors.title}
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </label>

            <div className="field-row">
              <label className="field">
                <span className="field-label">Priority</span>
                <select
                  value={priority}
                  onChange={(event) => setPriority(event.target.value as Priority)}
                >
                  {PRIORITIES.map((value) => (
                    <option key={value} value={value}>
                      {PRIORITY_LABELS[value]}
                    </option>
                  ))}
                </select>
                <span className="field-hint">{PRIORITY_BLURBS[priority]}</span>
              </label>

              <label className="field">
                <span className="field-label">
                  Critic score <em>optional</em>
                </span>
                <div className="suffix-input">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={critic}
                    placeholder="—"
                    onChange={(event) => {
                      setCritic(event.target.value);
                      clearError("critic");
                    }}
                    aria-invalid={!!errors.critic}
                  />
                  <span>/ 100</span>
                </div>
                {errors.critic && <span className="field-error">{errors.critic}</span>}
              </label>
            </div>

            <div className="field">
              <span className="field-label">
                Genres <em>optional</em>
              </span>
              {genres.length > 0 && (
                <div className="genre-chips">
                  {genres.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="genre-chip"
                      onClick={() => setGenres((current) => current.filter((g) => g !== name))}
                      aria-label={`Remove genre ${name}`}
                    >
                      {name}
                      <span aria-hidden="true">×</span>
                    </button>
                  ))}
                </div>
              )}
              {genreOptions.length > 0 && (
                <select
                  value={ADD_GENRE}
                  aria-label="Add a genre"
                  onChange={(event) => {
                    const picked = event.target.value;
                    if (picked) setGenres((current) => [...current, picked]);
                  }}
                >
                  <option value={ADD_GENRE}>+ Add a genre…</option>
                  {genreOptions.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <label className="field">
              <span className="field-label">
                Notes <em>optional</em>
              </span>
              <textarea
                value={notes}
                rows={3}
                maxLength={5000}
                placeholder="Why you want it, or what you are waiting for."
                onChange={(event) => setNotes(event.target.value)}
                aria-invalid={!!errors.notes}
              />
              {errors.notes && <span className="field-error">{errors.notes}</span>}
            </label>
          </div>
        </div>

        {formError && <p className="notice error">{formError}</p>}
      </form>
    </Modal>
  );
}
