import { useEffect, useState } from "react";
import { coverSrc } from "../lib/api";
import { hueFromString, initialsFrom } from "../lib/format";

interface CoverImageProps {
  title: string;
  coverFile: string | null;
  /** An http(s) URL, used to preview an IGDB result before it is downloaded. */
  previewUrl?: string | null;
}

/**
 * A cover, or a generated stand-in. The placeholder occupies the same box as a
 * real image so a library with missing art still lines up.
 */
export function CoverImage({ title, coverFile, previewUrl }: CoverImageProps) {
  const src = previewUrl ?? coverSrc(coverFile);
  const [failed, setFailed] = useState(false);

  // A different game (or a newly chosen cover) deserves a fresh attempt.
  useEffect(() => setFailed(false), [src]);

  if (!src || failed) {
    const hue = hueFromString(title || "?");
    return (
      <div
        className="cover cover-placeholder"
        style={{
          background: `linear-gradient(150deg, hsl(${hue} 45% 32%), hsl(${(hue + 40) % 360} 40% 18%))`,
        }}
        aria-hidden="true"
      >
        <span>{initialsFrom(title || "?")}</span>
      </div>
    );
  }

  return (
    <img
      className="cover"
      src={src}
      alt={`${title} cover art`}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
