import { useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import {
  deleteCover,
  errorMessage,
  saveCoverFromFile,
  saveCoverFromUrl,
} from "../lib/api";
import { splitPlaytime } from "../lib/format";
import { IGDB_GENRES, STATUSES, STATUS_LABELS, statusHint } from "../types";
import type { Game, GameInput, IgdbGame, Status, WishlistEntry } from "../types";
import { CoverImage } from "./CoverImage";
import { IgdbSearch, type KnownIgdbIds } from "./IgdbSearch";
import { Modal } from "./Modal";
import { StarRating } from "./StarRating";

const ADD_STOREFRONT = "__add__";
const ADD_GENRE = "";

interface GameFormProps {
  game: Game | null;
  /**
   * The wishlist entry being bought, when that is why this form is open. It
   * fills in everything the entry knew and nothing it did not - storefront and
   * status are the two facts only the user can supply, which is the whole
   * reason buying goes through this form at all. See docs/adr/0005.
   */
  buying?: WishlistEntry | null;
  storefronts: string[];
  igdbEnabled: boolean;
  known: KnownIgdbIds;
  onSubmit: (input: GameInput) => Promise<void>;
  onAddStorefront: (name: string) => Promise<void>;
  onClose: () => void;
}

type Errors = Partial<Record<string, string>>;

export function GameForm({
  game,
  buying = null,
  storefronts,
  igdbEnabled,
  known,
  onSubmit,
  onAddStorefront,
  onClose,
}: GameFormProps) {
  const initialPlaytime = splitPlaytime(game?.playtime_minutes ?? 0);

  const [title, setTitle] = useState(game?.title ?? buying?.title ?? "");
  const [platform, setPlatform] = useState(game?.platform ?? storefronts[0] ?? "Other");
  const [newStorefront, setNewStorefront] = useState("");
  const [addingStorefront, setAddingStorefront] = useState(false);
  const [status, setStatus] = useState<Status>(game?.status ?? "backlog");
  // The typed percentage and the "has none" fact are held apart, so ticking the
  // box and changing your mind gives you back the number you had rather than a
  // zero. Only one of the two is ever saved - see `validate`.
  const [achievement, setAchievement] = useState(String(game?.achievement_pct ?? 0));
  const [noAchievements, setNoAchievements] = useState(game?.achievement_pct === null);
  const [hours, setHours] = useState(String(initialPlaytime.hours));
  const [minutes, setMinutes] = useState(String(initialPlaytime.minutes));
  const [rating, setRating] = useState(game?.rating ?? 0);
  const [critic, setCritic] = useState(() => {
    const value = game?.critic_rating ?? buying?.critic_rating ?? null;
    return value === null ? "" : String(value);
  });
  const [genres, setGenres] = useState<string[]>(game?.genres ?? buying?.genres ?? []);
  const [notes, setNotes] = useState(game?.notes ?? buying?.notes ?? "");
  const [coverFile, setCoverFile] = useState<string | null>(
    game?.cover_file ?? buying?.cover_file ?? null,
  );
  const [igdbId, setIgdbId] = useState<number | null>(game?.igdb_id ?? buying?.igdb_id ?? null);
  const [summary, setSummary] = useState<string | null>(
    game?.summary ?? buying?.summary ?? null,
  );
  const [releaseDate, setReleaseDate] = useState<string | null>(
    game?.release_date ?? buying?.release_date ?? null,
  );

  const [imageUrl, setImageUrl] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);
  const [showIgdb, setShowIgdb] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Also the entry's cover when buying: the file transfers to the new row and
  // must survive, but if the user swaps it for another one on the way through,
  // the entry it belonged to is about to be deleted and it would be orphaned.
  // Same rule either way - delete it only if it is not the one being kept.
  const originalCover = game?.cover_file ?? buying?.cover_file ?? null;
  // Covers written to disk during this session. Whichever ones the user does
  // not end up keeping are removed, so cancelling never litters the folder.
  const [createdCovers, setCreatedCovers] = useState<string[]>([]);

  const duplicateWarning =
    igdbId !== null && igdbId !== game?.igdb_id && known.library.has(igdbId);
  // Not shown while buying: you are already turning that entry into this game.
  const onWishlistWarning =
    !buying && igdbId !== null && igdbId !== game?.igdb_id && known.wishlist.has(igdbId);

  // Recomputed as the user types, from whatever is in the fields right now, so
  // typing a playtime into a Backlog game surfaces the hint immediately. Blank
  // and half-typed values read as zero here - `validate` is what complains
  // about them, and it would be obnoxious to do it twice.
  const hint = statusHint(
    status,
    (Number(hours) || 0) * 60 + (Number(minutes) || 0),
    noAchievements ? null : Number(achievement) || 0,
  );

  // The known vocabulary plus anything IGDB supplied that is not on it, so a
  // genre imported from IGDB can still be re-added after being removed.
  const genreOptions = [...new Set([...IGDB_GENRES, ...genres])]
    .filter((name) => !genres.includes(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

  /**
   * Clear a field's error the moment it is edited. Leaving it red while the
   * user is actively fixing it reads as "still wrong" when it no longer is.
   */
  function clearError(key: string) {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function recordCover(fileName: string) {
    setCreatedCovers((current) => [...current, fileName]);
    setCoverFile(fileName);
  }

  async function discard(files: string[]) {
    await Promise.all(
      files.map((file) => deleteCover(file).catch(() => undefined)),
    );
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
      // The metadata is still worth keeping even if the artwork failed.
      setFormError(`${errorMessage(cause)} The other details were still filled in.`);
    } finally {
      setCoverBusy(false);
    }
  }

  async function removeCover() {
    setCoverFile(null);
  }

  async function commitNewStorefront() {
    const name = newStorefront.trim();
    if (!name) return;
    if (name.length > 40) {
      setErrors((e) => ({ ...e, platform: "Storefront names must be 40 characters or fewer." }));
      return;
    }
    try {
      await onAddStorefront(name);
      setPlatform(name);
      setAddingStorefront(false);
      setNewStorefront("");
      setErrors((e) => ({ ...e, platform: undefined }));
    } catch (cause) {
      setFormError(errorMessage(cause));
    }
  }

  function validate(): GameInput | null {
    const next: Errors = {};

    const cleanTitle = title.trim();
    if (!cleanTitle) next.title = "Give the game a title.";
    else if (cleanTitle.length > 200) next.title = "Titles must be 200 characters or fewer.";

    if (!platform) next.platform = "Choose a storefront.";

    // Nothing to validate when the game has none: the field is disabled, and
    // whatever is sitting in it is on its way to being discarded rather than
    // saved. `pct` is what actually gets written - null, or the number typed.
    const typed = Number(achievement);
    if (!noAchievements) {
      if (achievement.trim() === "" || !Number.isFinite(typed)) {
        next.achievement = "Enter a number between 0 and 100.";
      } else if (!Number.isInteger(typed) || typed < 0 || typed > 100) {
        next.achievement = "Achievements must be a whole number between 0 and 100.";
      }
    }
    const pct = noAchievements ? null : typed;

    const h = hours.trim() === "" ? 0 : Number(hours);
    const m = minutes.trim() === "" ? 0 : Number(minutes);
    if (!Number.isInteger(h) || h < 0 || h > 99_999) {
      next.playtime = "Hours must be a whole number of 0 or more.";
    } else if (!Number.isInteger(m) || m < 0 || m > 59) {
      next.playtime = "Minutes must be a whole number between 0 and 59.";
    }

    // Blank is a meaningful answer here: most games have no critic score.
    const criticValue = critic.trim() === "" ? null : Number(critic);
    if (
      criticValue !== null &&
      (!Number.isInteger(criticValue) || criticValue < 0 || criticValue > 100)
    ) {
      next.critic = "Critic score must be a whole number between 0 and 100, or blank.";
    }

    if (notes.length > 5000) next.notes = "Notes must be 5000 characters or fewer.";

    setErrors(next);
    if (Object.keys(next).length > 0) return null;

    return {
      title: cleanTitle,
      platform,
      status,
      achievement_pct: pct,
      playtime_minutes: h * 60 + m,
      rating,
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
      // Clean up: every cover written this session except the one being kept,
      // plus the previous cover if it has been replaced.
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
      title={game ? "Edit game" : buying ? "You bought it" : "Add a game"}
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
            form="game-form"
            className="button primary"
            disabled={saving || coverBusy}
          >
            {saving ? "Saving…" : game ? "Save changes" : "Add to library"}
          </button>
        </>
      }
    >
      <form id="game-form" onSubmit={handleSubmit} noValidate>
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

        {buying && (
          <p className="notice">
            Everything your wishlist knew about <strong>{buying.title}</strong> is filled in.
            Pick a storefront and a status, and the wishlist entry is removed once you save.
          </p>
        )}

        {duplicateWarning && (
          <p className="notice warning">
            This game is already in your library. You can still add it again — useful if you own
            it on more than one storefront.
          </p>
        )}

        {onWishlistWarning && (
          <p className="notice warning">
            This game is on your wishlist. Adding it here leaves the entry in place — use
            “I bought this” on the Wishlist tab to move it across instead.
          </p>
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
                  onClick={() => void removeCover()}
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
                <span className="field-label">Storefront</span>
                {addingStorefront ? (
                  <div className="url-field">
                    <input
                      type="text"
                      value={newStorefront}
                      placeholder="e.g. Humble Bundle"
                      aria-label="New storefront name"
                      maxLength={40}
                      onChange={(event) => setNewStorefront(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void commitNewStorefront();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="button subtle"
                      onClick={() => void commitNewStorefront()}
                    >
                      Add
                    </button>
                  </div>
                ) : (
                  <select
                    value={platform}
                    onChange={(event) => {
                      if (event.target.value === ADD_STOREFRONT) setAddingStorefront(true);
                      else setPlatform(event.target.value);
                    }}
                  >
                    {storefronts.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                    <option value={ADD_STOREFRONT}>+ Add storefront…</option>
                  </select>
                )}
                {errors.platform && <span className="field-error">{errors.platform}</span>}
              </label>

              <label className="field">
                <span className="field-label">Status</span>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value as Status)}
                >
                  {STATUSES.map((value) => (
                    <option key={value} value={value}>
                      {STATUS_LABELS[value]}
                    </option>
                  ))}
                </select>
                {hint && <span className="field-hint">{hint}</span>}
              </label>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="achievement-pct">
                  Achievements completed
                </label>
                <div className="suffix-input">
                  <input
                    id="achievement-pct"
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={achievement}
                    disabled={noAchievements}
                    onChange={(event) => {
                      setAchievement(event.target.value);
                      clearError("achievement");
                    }}
                    aria-invalid={!!errors.achievement}
                  />
                  <span>%</span>
                </div>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={noAchievements}
                    onChange={(event) => {
                      setNoAchievements(event.target.checked);
                      // A number that can no longer be saved must not stay red.
                      if (event.target.checked) clearError("achievement");
                    }}
                  />
                  <span>This game has no achievements</span>
                </label>
                {errors.achievement && <span className="field-error">{errors.achievement}</span>}
              </div>

              <div className="field">
                <span className="field-label">Play time</span>
                <div className="playtime-inputs">
                  <div className="suffix-input">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={hours}
                      aria-label="Hours played"
                      onChange={(event) => {
                        setHours(event.target.value);
                        clearError("playtime");
                      }}
                      aria-invalid={!!errors.playtime}
                    />
                    <span>h</span>
                  </div>
                  <div className="suffix-input">
                    <input
                      type="number"
                      min={0}
                      max={59}
                      step={1}
                      value={minutes}
                      aria-label="Minutes played"
                      onChange={(event) => {
                        setMinutes(event.target.value);
                        clearError("playtime");
                      }}
                      aria-invalid={!!errors.playtime}
                    />
                    <span>m</span>
                  </div>
                </div>
                {errors.playtime && <span className="field-error">{errors.playtime}</span>}
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <span className="field-label">Your rating</span>
                <StarRating value={rating} onChange={setRating} size="md" />
              </div>

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
                placeholder="Anything you want to remember about this one."
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
