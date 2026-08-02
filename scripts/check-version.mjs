#!/usr/bin/env node
// Checks that a release tag agrees with the version written in the repo.
//
//   npm run check-version v1.1.0
//
// CI runs this before building so a mismatch fails in seconds rather than
// after a full Rust build. It matters because the installer filename, and the
// version Windows shows under "Installed apps", both come from
// tauri.conf.json — never from the tag. A tag that disagrees with the repo
// would produce a mislabelled installer with no other warning.
//
// Run it yourself before tagging if you want to check first. `npm run bump`
// keeps these in sync, so a failure here usually means a bump was not
// committed, or the tag was created against the wrong commit.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const rawTag = process.argv[2] ?? process.env.TAG;

if (!rawTag) {
  console.error("Usage: npm run check-version <tag>    e.g. npm run check-version v1.1.0");
  process.exit(1);
}

// Tags may be written either `v1.1.0` or `1.1.0`; the files never carry the `v`.
const tag = rawTag.replace(/^v/, "");

const json = (relPath) =>
  JSON.parse(readFileSync(join(repoRoot, relPath), "utf8")).version;

// Anchored to the line start so it reads the [package] version rather than the
// `version = "2"` inside dependency tables like `tauri = { version = "2" }`.
const cargoToml = () => {
  const match = readFileSync(join(repoRoot, "src-tauri/Cargo.toml"), "utf8")
    .match(/^version = "(.+)"/m);
  if (!match) throw new Error("No [package] version found in src-tauri/Cargo.toml");
  return match[1];
};

// Cargo.lock is intentionally not checked: cargo regenerates it during the
// build, so a stale entry there cannot mislabel the installer.
const found = {
  "src-tauri/tauri.conf.json": json("src-tauri/tauri.conf.json"),
  "package.json": json("package.json"),
  "src-tauri/Cargo.toml": cargoToml(),
};

const mismatched = Object.entries(found).filter(([, v]) => v !== tag);

if (mismatched.length > 0) {
  // GitHub Actions renders ::error:: as an annotation on the run summary.
  const annotate = process.env.GITHUB_ACTIONS === "true" ? "::error::" : "";
  console.error(
    `${annotate}Release tag '${rawTag}' (version ${tag}) does not match the repo.`,
  );
  console.error("\nVersions found in the tagged commit:");
  for (const [file, version] of Object.entries(found)) {
    console.error(`  ${version === tag ? "ok " : "BAD"}  ${file}: ${version}`);
  }
  console.error(
    `\nFix it with:  npm run bump ${tag}` +
      `\nthen commit, push, and re-create the release on the new tag.`,
  );
  process.exit(1);
}

console.log(`Tag '${rawTag}' matches version ${tag} in all files.`);
