import { VIEW_MODES, type ViewMode } from "../lib/view";

/**
 * Two glyphs, not a dropdown. With exactly two options a `select` costs a click
 * to reveal a list of two, where a pair of buttons shows both states and which
 * one you are in at a glance.
 *
 * The glyphs are bare text, like the `🔎` in the search field and the `🏆` on
 * the cards - an icon dependency for two symbols would not pay for itself.
 * They carry no meaning to a screen reader, so the label does all the work and
 * `aria-pressed` says which is current.
 */
const LABELS: Record<ViewMode, { glyph: string; label: string }> = {
  cards: { glyph: "▦", label: "Card view" },
  list: { glyph: "☰", label: "List view" },
};

interface ViewToggleProps {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="Layout">
      {VIEW_MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          className={mode === view ? "view-button on" : "view-button"}
          aria-pressed={mode === view}
          aria-label={LABELS[mode].label}
          title={LABELS[mode].label}
          onClick={() => onChange(mode)}
        >
          <span aria-hidden="true">{LABELS[mode].glyph}</span>
        </button>
      ))}
    </div>
  );
}
