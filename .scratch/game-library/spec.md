# Spec: gamerzz — local PC game library

Status: implemented (v1.0.0)

## Problem

A non-technical Windows user wants to track the PC games they own: what they're
playing, what they finished, how long they played, how they rated it. They should
double-click an icon and use it. No terminal, no account, no server.

The developer works on macOS and builds the Windows installer on a Windows machine.

## Decisions

Each of these was chosen over a named alternative; the rejected option is recorded so
it doesn't get relitigated.

| Decision | Chosen | Rejected, and why |
| --- | --- | --- |
| Shell | Tauri v2 | **Electron** — ~150MB and ships a browser. **Flutter** — multi-GB SDK on both machines, heavier Windows build box, and rebuilding a card grid in widgets when HTML does it for free. The existing `Pirouni` Flutter project turned out to be untouched `flutter create` boilerplate, so there was no familiarity to leverage. |
| Frontend | React + TypeScript + Vite | **Vanilla, no bundler** — would drop the Node requirement on the Windows build box, but the grid has two filters, five sort orders, a modal form and an IGDB panel; that's enough state to make hand-managed DOM updates a false economy. TS earns its keep across the SQL↔Rust↔UI boundary. |
| Styling | Plain CSS + custom properties | **Tailwind** — one more config file and upgrade path for a single-screen app. |
| Database | SQLite via `tauri-plugin-sql` | — |
| Progress model | `status` only | **A separate `completed` boolean**, which the original brief asked for alongside a `Completed` status. Two fields describing one fact drift apart. "Completed" is derived. |
| `platform` semantics | PC **storefront** (Steam, GOG, Epic…) | **Console hardware.** Consequence: IGDB cannot fill this field — its platform data is hardware — so storefront is always a manual choice. |
| Cover storage | Copied into `<app data>/covers/` | **Referencing IGDB URLs** — library looks broken offline. **Referencing the user's file path** — covers vanish when they tidy their folders. |
| IGDB credentials | User's own Twitch app, entered in a Settings screen | **A `.env` file** — meaningless to someone running an installed `.exe`. **Baking in the developer's credentials** — extractable from the binary, and puts their Twitch app on the hook for someone else's usage. Kept available as a build-time override. |
| Sample data | Ships empty; opt-in from Settings | **Pre-seeding on first run** — a personal collection that arrives full of someone else's games reads as broken. |
| Windows installer | Unsigned NSIS, per-user | **Code signing** — $200–400/yr on a hardware token, or ~$10/mo via Azure Trusted Signing, to remove one SmartScreen click-through for one known user. Per-user install avoids a UAC prompt. |
| Backup | None | Raised and declined by the owner. The data folder is one directory; copying it is a complete backup. Listed as a future improvement. |
| Half-star storage | `rating REAL` + CHECK rejecting finer than a half | **Integer half-steps (0–10)** — no migration needed, but every read and write has to remember to halve or double, and one place forgetting is silent corruption. SQLite cannot retype a column, so migration 2 rebuilds the table. |
| Genre storage | JSON array in one TEXT column | **A `genres` table + join table** — genres are only ever read as a whole list and filtered in memory, so normalising buys joins and nothing else. |
| Critic score source | IGDB `aggregated_rating` | **IGDB `rating`** — that is an IGDB *user* score, so labelling it "critic" would quietly mean something else. **`total_rating`** — blends both. Consequence: nullable, because most games have no critic aggregate. |
| Manual entry of the new fields | Both editable by hand | **IGDB-only** — would make hand-typed games invisible to the two new filters, i.e. second-class in their own library. |
| Genre filter options | Only genres present in the library | **The full 23-genre vocabulary** — would offer choices that can only return nothing. |

## Schema

`games` — `id`, `title`, `platform` (storefront), `status`
(`backlog`/`playing`/`completed`/`abandoned`), `achievement_pct` (0–100),
`playtime_minutes` (integer minutes; entered as h+m), `rating` (REAL, 0–5 in halves,
`0` = unrated), `critic_rating` (nullable, 0–100), `genres` (nullable JSON array),
`cover_file`, `notes`, `igdb_id`, `summary`, `release_date`, `is_sample`,
`created_at`, `updated_at`. CHECK constraints on every bounded column.

Migration 1 created the table; migration 2 rebuilt it for `rating REAL`, `critic_rating`
and `genres`.

`storefronts` — `name`, `sort_order`. Seeded with twelve PC storefronts, extensible
from the form.

## Scope

**In:** full CRUD; card grid; title search; status, storefront, genre and critic-score
filters; six sort orders; half-star ratings (0–5 in halves, mouse and keyboard); modal
form with validation; delete confirmation; responsive to phone widths;
empty / loading / error / no-results states; optional IGDB search with cover download,
genres and critic score; generated initials placeholder; opt-in sample library.

**Out:** auto-update, cloud sync, accounts, backup/restore, storefront links, price
tracking, and automatic playtime/achievement sync from Steam. Both those numbers are
typed by hand — reading them needs the Steam Web API, separate credentials and a
SteamID, which is a different project.

## Verification performed

Rust compiles clean and the release bundle builds. Every UI flow below was exercised
against the real React code in a browser, with the Tauri bridge replaced by stand-ins
(the native window can't be screenshotted from this environment):

empty state → add with validation failures (required title, out-of-range achievement %,
out-of-range minutes) → successful add → edit and re-save → search → no-results state →
all five sort orders → storefront filter → status filter → delete with confirmation →
IGDB connect rejection → IGDB connect success → IGDB search and pick → mobile layout at
375px with no horizontal overflow.

**Not verified end-to-end:** real SQLite persistence across restarts, real cover files
on disk, and real IGDB HTTP calls — all of which run only inside the packaged app.

### Half stars, critic score and genres (second pass)

Migration 2 was run against a real SQLite database seeded with v1 rows: data preserved,
all three indexes recreated, AUTOINCREMENT continuing from the copied ids, `3.5` stored
with `typeof` `real`, and `3.7` / `5.5` / `-0.5` / `critic_rating` 101 / `-1` all rejected
by the CHECK constraints.

Driven in the browser against the stand-ins: sample library showing critic chips and
genre lines, with the one unscored game correctly showing no chip → half-star click on
both halves of a star (2.5, then 3) → arrow keys stepping by 0.5 and clamping at 5 →
`End` → genre chip removal and re-add, with the dropdown excluding what is already
picked → critic score 150 rejected with a message, cleared on edit, 91 accepted →
save and reload showing 3.5 stars, `Shooter · Puzzle` and a 91 chip on the card →
genre filter → all three critic bands including "No critic score" → critic sort with the
unscored game last → rating sort ordering 5/5/5/5/4.5/3.5/3.5/0 → IGDB result rows showing
score chip and genres → picking a result filling title, critic 97 and two genres →
375px with no horizontal overflow.

Two layout defects found and fixed in the process: the `/ 100` suffix wrapped under its
input, and the mobile toolbar's four stacked selects pushed every game below the fold
(now paired two-up). Half-star touch targets were 13px wide on a phone; the mobile star
size was raised to give 19×46 targets.
