/**
 * Ratings run 0–5 in half-star steps.
 *
 * A half star is drawn by stacking a gold star on a grey one and clipping the
 * gold one to 50% width, rather than by using a "half star" glyph - the two
 * glyphs would not align, and this way any fraction is possible if it is ever
 * wanted.
 *
 * Input works through two invisible hit zones per star (left half, right half).
 * They are plain spans, not buttons: keyboard users get a single tab stop on
 * the container, which behaves as a slider, instead of ten separate stops.
 */

import { useState } from "react";

interface StarRatingProps {
  value: number;
  /** Omit to render a read-only rating. */
  onChange?: (value: number) => void;
  size?: "sm" | "md";
}

const STARS = [1, 2, 3, 4, 5];
const STEP = 0.5;
const MAX = 5;

/** "3.5", but "3" rather than "3.0" - a whole number should read as one. */
export function formatRating(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function fillFor(value: number, star: number): string {
  const filled = Math.min(Math.max(value - (star - 1), 0), 1);
  return `${filled * 100}%`;
}

function Star({ value, star }: { value: number; star: number }) {
  return (
    <span className="star-slot">
      <span className="star-base">★</span>
      <span className="star-fill" style={{ width: fillFor(value, star) }}>
        <span className="star-on">★</span>
      </span>
    </span>
  );
}

export function StarRating({ value, onChange, size = "sm" }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  if (!onChange) {
    return (
      <div
        className={`stars stars-${size}`}
        aria-label={value ? `Rated ${formatRating(value)} out of 5` : "Not rated"}
      >
        {STARS.map((star) => (
          <Star key={star} value={value} star={star} />
        ))}
      </div>
    );
  }

  // Clicking the current rating clears it, which is the only way back to
  // "unrated" once a star has been set.
  const pick = (next: number) => onChange(value === next ? 0 : next);

  const shown = hover ?? value;

  // An arrow const, not a `function` declaration: hoisting one above the
  // `!onChange` guard would lose the narrowing that makes `onChange` callable.
  const handleKeyDown = (event: React.KeyboardEvent) => {
    const keys: Record<string, number> = {
      ArrowLeft: Math.max(value - STEP, 0),
      ArrowDown: Math.max(value - STEP, 0),
      ArrowRight: Math.min(value + STEP, MAX),
      ArrowUp: Math.min(value + STEP, MAX),
      Home: 0,
      End: MAX,
    };
    const next = keys[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(next);
  };

  return (
    <div className={`stars stars-${size} stars-input`}>
      <div
        className="stars-track"
        role="slider"
        tabIndex={0}
        aria-label="Your rating"
        aria-valuemin={0}
        aria-valuemax={MAX}
        aria-valuenow={value}
        aria-valuetext={value ? `${formatRating(value)} out of 5 stars` : "Not rated"}
        onKeyDown={handleKeyDown}
        onMouseLeave={() => setHover(null)}
      >
        {STARS.map((star) => (
          <span key={star} className="star-target">
            <Star value={shown} star={star} />
            <span
              className="star-half"
              aria-hidden="true"
              onClick={() => pick(star - STEP)}
              onMouseEnter={() => setHover(star - STEP)}
            />
            <span
              className="star-half star-half-right"
              aria-hidden="true"
              onClick={() => pick(star)}
              onMouseEnter={() => setHover(star)}
            />
          </span>
        ))}
      </div>
      <span className="stars-caption">
        {shown ? `${formatRating(shown)} / 5` : "Not rated"}
      </span>
    </div>
  );
}
