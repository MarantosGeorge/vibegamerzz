# Spec: DLC filed under base games

Status: implemented
Source: GitHub issue #23 "Folder System"

## Problem

Owning a game and its DLC means one tile per item. Alan Wake II is three; Batman: Arkham
Knight is thirty-one. Each has to be populated and graded separately, and nothing on
screen says they are related. The grid stops being readable long before it stops being
correct.

The issue asks for a "folder system". It is not one — no container is ever created. The
base game is the container.

## Decisions

Each was chosen over a named alternative; the rejected option is recorded so it does not
get relitigated. The model decisions are argued at length in `docs/adr/0008`.

| Decision | Chosen | Rejected, and why |
| --- | --- | --- |
| What a DLC is | A `Game` with `parent_id` set | **A separate `dlc` table** — fifteen duplicated columns to express one extra fact, and every filter and sort in the app would have to choose which table it meant. |
| Marking something as DLC | Having a parent, full stop | **An `is_dlc` flag** — would let the app decide a top-level game "should" be filed somewhere and refuse the save, against ADR-0002. Also catches standalone expansions, which IGDB gives a `parent_game` and which genuinely play alone. |
| Depth | One level, enforced in `lib/nesting.ts` | **Arbitrary depth** — IGDB can express it; two views and a cycle check cannot be justified by a case nobody has. |
| Totals | None. Every number is a stored fact | **Rolled-up playtime/completion on the base game** — Steam already reports one combined playtime, so a sum double-counts; and a base game at 100% with a DLC at 40% has no honest combined completion (ADR-0004). |
| Nesting | Structural — both views, always, no toggle | **A third option beside cards and list** — would make `CONTEXT.md`'s "a view never hides a game" false. |
| Card view affordance | Folder badge on the cover, opening a panel | **Expanding in place into a full-width tray** — recommended during design and overruled by the owner. The tray reuses `GameCard` directly; the panel needed a reason not to invent a third row format, which is why it holds a `GameTable`. |
| What is in the panel | A `GameTable` of that game's DLC | **A bespoke row** — a third way of drawing a game, and every column added to the library later would have to be added to it again by hand. |
| List view affordance | Disclosure triangle, indented rows, columns aligned | — (asked for directly) |
| Filtered match inside a folder | The badge carries it: `📁 1 of 3`, accented | **Going flat while filtering** — filtering by Completed, where base and DLC both match, lands straight back in the crowd the issue complains about. |
| Expansion state | Per game, session only | **Persisted** — `CONTEXT.md` calls the view the only setting that outlives the window, and an all-collapsed library on launch is the point. |
| Delete a base game | Deletes its DLC; the confirm dialog says so first | **Orphaning them to the top level** — recommended during design and overruled by the owner. |
| Where the cascade lives | `db.ts` | **`ON DELETE CASCADE`** — cannot reach the `wishlist` table, and would depend on `PRAGMA foreign_keys` being on for the pool. |
| Transaction around it | None; ordered statements, deletes merged into one | **`BEGIN`/`COMMIT` by hand** — `execute` takes a pooled connection per call, so the `BEGIN` can land on a different connection from the statements it covers. Follows the reasoning already written into `buyWishlistEntry`. |
| Wishlisted DLC's parent | A `Game` only | **Also another wishlist entry** — two nullable parent columns and a CHECK to express a case already covered by wishing for the base game. |
| Where a wishlisted DLC is drawn | Wishlist tab, flat, labelled "DLC for X" | **Nested in the Library under its base game** — the Library is bounded by what you own (ADR-0005). |
| IGDB fields for hint (a) | `dlcs` **and** `expansions` | **`dlcs` alone** — verified against the live API: Alan Wake II and Cyberpunk 2077 both report `dlcs` empty and carry their DLC under `expansions`. Reading `dlcs` alone would have shipped a feature that found nothing. |
| `standalone_expansions` | Not read | Sold and played without the base game, so they belong at the top level; the form's dropdown can file one by hand. |
| Platform filter on id lookups | Dropped | Kept for by-name search, which is what stops the catalogue filling with console games. The ids already came from a PC game the user picked. Probing the live API showed the filter was not in fact excluding DLC — it is dropped because it buys nothing there, not because it was the blocker. |
| When hint (a) fires | After save | **In the form** — there is no parent row to file anything under until the base game exists. |
| Hint (b) with no base game owned | A sentence, no button, no block | **Blocking the save** — standalone expansions are real, and the app cannot tell "do not own it" from "have not added it yet". |
| Tests | Rust only: the id-lookup query builder | **Adding Vitest** — a new dependency and its own job, deliberately deferred earlier. |

## Schema

Migration 7 adds `parent_id INTEGER REFERENCES games(id)` to `games` and to `wishlist`,
plus an index on each. The first migration in this repo that does not rebuild the table:
a nullable column needs no CHECK change, so `ALTER TABLE ADD COLUMN` is enough and every
existing row keeps the id that `parent_id` will come to point at.

## Scope

**In:** `parent_id` on both tables; folder badge and DLC panel in card view; disclosure
tree in list view; DLC counted in the status chips with a "35 games · 12 DLC" result
line; filtered matches surfaced through the badge and through auto-expansion in the list;
cascade delete with an honest confirm dialog and toast; "DLC for…" dropdown in both
forms; "Add DLC" from the panel; both IGDB hints; wishlisted DLC labelled with their base
game; sample library with a base game and two DLC; `Modal` made safe to stack.

**Out:** user-created folders of any kind; rolled-up totals; depth beyond one; nesting in
the wishlist; `standalone_expansions`; frontend tests.
