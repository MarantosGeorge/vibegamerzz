import { useEffect, useRef, type ReactNode } from "react";

/**
 * How many modals are open. Module level because the stack is a fact about the
 * document, not about any one modal.
 *
 * The DLC panel is a modal you work inside - editing a DLC opens the form over
 * it - so two are open at once routinely. Without a stack both would listen for
 * Escape and one keypress would close the pair, and the inner one's cleanup
 * would hand scrolling back to the body while the outer was still covering it.
 */
let openModals = 0;

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Wider layout for the add/edit form, which has two columns on desktop. */
  wide?: boolean;
}

export function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  /**
   * This modal's floor in the stack. Claimed in the effect rather than during
   * render, so that it is paired with the cleanup that gives it back: under
   * StrictMode a render runs twice and would claim two floors for one modal,
   * leaving a counter that never returns to zero and a page that never scrolls
   * again.
   */
  const depth = useRef(0);

  useEffect(() => {
    depth.current = ++openModals;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && depth.current === openModals) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    // Stop the grid behind the modal from scrolling under it. Only the first
    // modal sets this, and only the last one puts it back: an inner modal
    // closing must not hand scrolling back to a page still covered.
    if (depth.current === 1) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      openModals -= 1;
      if (openModals === 0) document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "input, select, textarea, button",
    );
    focusable?.focus();
  }, []);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        // Same stack rule as Escape. A modal stacked above covers this
        // backdrop anyway, so this is belt and braces rather than the fix.
        if (event.target === event.currentTarget && depth.current === openModals) {
          onClose();
        }
      }}
    >
      <div
        className={`modal${wide ? " modal-wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        ref={panelRef}
      >
        <header className="modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}
