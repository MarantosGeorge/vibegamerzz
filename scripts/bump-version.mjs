#!/usr/bin/env node
// Bumps the release version everywhere it is written down.
//
// The version lives in five places that all have to agree — the CI workflow
// refuses to build a release whose tag disagrees with them, so this exists to
// make getting it right a single command:
//
//   npm run bump 1.1.0
//
// package.json / package-lock.json are handled by `npm version`, which keeps
// their formatting intact. The other three get a targeted replacement rather
// than a JSON/TOML round-trip, for the same reason — a version bump should be a
// five-line diff, not a reformat of the whole file.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];

// Deliberately no leading `v`: this is the version as it appears in the files.
// The git tag may be either `v1.1.0` or `1.1.0` — CI strips the prefix.
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error(`Usage: npm run bump <version>    e.g. npm run bump 1.1.0

Got: ${version ?? "(nothing)"}
Expected a bare semver version — no leading "v".`);
  process.exit(1);
}

/**
 * Replaces the first match of `pattern` in a file, failing loudly if the
 * pattern no longer matches — a silent no-op here would let a half-bumped repo
 * through, which is exactly what this script exists to prevent.
 */
function replaceInFile(relPath, pattern, replacement) {
  const path = join(repoRoot, relPath);
  const before = readFileSync(path, "utf8");
  const after = before.replace(pattern, replacement);

  if (after === before) {
    throw new Error(
      `Could not find the version to update in ${relPath} — its format has ` +
        `probably changed, so this script needs updating too.`,
    );
  }

  writeFileSync(path, after);
  console.log(`  ${relPath}`);
}

console.log(`Setting version to ${version}:`);

// npm rewrites package.json and package-lock.json (both the top-level version
// and the one under packages[""]). --allow-same-version so re-running is safe.
execFileSync(
  "npm",
  ["version", version, "--no-git-tag-version", "--allow-same-version"],
  { cwd: repoRoot, stdio: "pipe" },
);
console.log("  package.json\n  package-lock.json");

replaceInFile(
  "src-tauri/tauri.conf.json",
  /^(\s*"version":\s*")[^"]+(")/m,
  `$1${version}$2`,
);

// Anchored to the line start so it hits the [package] version and not the
// `version = "2"` inside dependency tables like `tauri = { version = "2" }`.
replaceInFile("src-tauri/Cargo.toml", /^(version = ")[^"]+(")/m, `$1${version}$2`);

// Cargo.lock records the crate's own version alongside every dependency's, so
// this is scoped to the gamerzz package block specifically.
replaceInFile(
  "src-tauri/Cargo.lock",
  /(\[\[package\]\]\nname = "gamerzz"\nversion = ")[^"]+(")/,
  `$1${version}$2`,
);

// scripts/release.mjs performs these steps itself, so it passes
// --no-next-steps to avoid telling the user to redo what it is already doing.
if (!process.argv.includes("--no-next-steps")) {
  console.log(`
Next:
  git commit -am "chore: bump version to ${version}"
  git push
  gh release create v${version} --generate-notes

Creating the release is what triggers the Windows installer build.

Or do all of that in one step with:  npm run release ${version}`);
}
