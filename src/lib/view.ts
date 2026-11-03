/**
 * Which layout the collections are drawn in. Cards are the covers; list is the
 * directory view - a table, one row per title, columns you can compare down.
 *
 * One setting for both tabs rather than one each. Switching tabs and finding a
 * different shape is the worse surprise, and the choice is about how you like
 * to read a collection rather than about a particular collection.
 *
 * Unlike every filter in this app, it survives a restart: a filter is set for
 * one look at something, a layout is a standing preference. It lives in
 * `localStorage` rather than in SQLite because it is a fact about this window,
 * not about your library - it has no business in a file you might back up.
 */
export const VIEW_MODES = ["cards", "list"] as const;
export type ViewMode = (typeof VIEW_MODES)[number];

export const DEFAULT_VIEW: ViewMode = "cards";

const KEY = "gamerzz.view";

/**
 * Reads the stored view, falling back to cards for anything unrecognised.
 *
 * Wrapped because a webview can refuse storage outright, and because the value
 * is user-editable text that a future version might stop understanding -
 * neither should cost you the app. Nothing is lost by guessing wrong here: a
 * click puts it back.
 */
export function readView(): ViewMode {
  try {
    const stored = localStorage.getItem(KEY);
    return VIEW_MODES.includes(stored as ViewMode) ? (stored as ViewMode) : DEFAULT_VIEW;
  } catch {
    return DEFAULT_VIEW;
  }
}

/** Stores the view, and shrugs if storage is unavailable. */
export function writeView(view: ViewMode): void {
  try {
    localStorage.setItem(KEY, view);
  } catch {
    // A view that forgets itself is a far smaller problem than a crash.
  }
}
