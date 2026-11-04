# A DLC is a Game with a parent

Owning Alan Wake II and its two expansions used to mean three tiles in the grid, graded
and scored independently, with nothing saying they were related. For Batman: Arkham
Knight that is a game and thirty tiles. The library stopped being readable long before it
stopped being correct.

A DLC is now a Game that names another Game as the thing it extends: one nullable
`parent_id` column on `games`, migration 7. It keeps its own storefront, its own shelf,
its own playtime, its own completion and its own rating, so every filter, sort, form and
validation in the app works on it with no changes at all.

Four decisions sit inside that sentence, and they are one decision seen from four sides
rather than four that could have gone different ways separately.

## Being DLC is having a parent

There is no `is_dlc` flag beside `parent_id`. A game with a parent is DLC, a game without
one is a base game, and there is no third state.

The consequence is deliberate: the app can never decide that a top-level game *ought* to
be filed somewhere and object to it. Add "Night Springs" on its own and it is simply a
game — the app has no grounds to complain, because there is no field in which it is
wrong. That keeps ADR-0002's rule intact without an exception: hints advise, and this one
has nothing to enforce even if it wanted to.

A flag was considered, so that the app could refuse to save DLC with no base game. Two
things ruled it out. IGDB's `standalone_expansions` are real — Blood Dragon and Death of
the Outsider are played without the game they extend — and any rule keyed on IGDB's
`parent_game` would catch them, because IGDB sets `parent_game` on those too. And the app
cannot tell "you do not own the base game" from "you have not added it yet".

## One level

DLC never has DLC. SQLite cannot express that — there is no CHECK for "a row whose
`parent_id` is not null may not be named as a parent" — so the cap lives in two places in
`lib/nesting.ts`: `parentOptions` never offers a DLC as somewhere to file something, and
`hasDlc` stops a base game with children from being filed under anything itself. `nest`
enforces it a third time on the way out, drawing anything whose parent is not a base game
at the top level rather than dropping it.

That third guard is not redundancy for its own sake. The failure it prevents — a game you
own not appearing in your library at all — is the one failure here worth ruling out
twice.

## Nesting is structural, not a view

`CONTEXT.md` says of a view: *"the day a view hides a game is the day it has become a
filter"*. Collapsing DLC behind a base game looks exactly like a view hiding a game, and
would be, if it were a view doing it.

It is not. Both views nest, they nest identically, and there is no toggle that turns
nesting off. What collapses a DLC out of the top level is the parent it names — a fact
about the data — and the views are drawing what is there. Had this shipped as a third
option beside cards and list, the glossary's rule would simply have become false.

The two views still differ in *how*, because a grid cannot indent. Card view puts a
folder badge on the cover and opens a panel; list view uses a disclosure triangle and
indented rows. The panel holds a `GameTable` rather than a layout of its own, so there is
no third way of drawing a game to keep in step with the other two.

Under a filter a base game is drawn when it matched **or** when one of its DLC did — it is
the address of the result, and a match stranded behind a cover with nothing to say it is
there would be worse. That is the only case where a tile on screen fails the active
filter, and the badge reading "1 of 3" is what stops it being read as a match of its own.

## Nothing is rolled up

A base game's playtime is the number you typed. It is not the sum of its DLC, and its
completion is not an average of theirs.

The issue asked for the opposite, and Steam is the reason: it reports one playtime for a
game and its DLC together, so that is how people already record it — the hours go on the
base game and the DLC carry their own completion. A sum would double-count exactly the
case the feature exists for.

The deeper reason is that a roll-up makes one number sometimes-stored and
sometimes-derived. Completion shows why that fails: a base game at 100% with one DLC at
40% has no honest combined figure, and ADR-0004 has already established that absence is
not zero. Every number in this app is one stored fact, and it stays that way.

## Consequences

- Every Game counts on the status chips, DLC included — a Platinum you earned is tallied
  wherever it sits. The results line reads "35 games · 12 DLC" so the gap against the
  number of tiles on screen explains itself.
- Deleting a base game deletes its DLC, which the confirm dialog says before anything
  happens. Wishlist entries that named it survive with their parent cleared: deleting
  something you own is not a statement that you stopped wanting something else.
- That cascade lives in `db.ts`, not in `ON DELETE CASCADE`. The wishlist half changes
  rather than deletes and reaches into another table, which no foreign key on `games`
  could express, and a declared cascade would only fire with `PRAGMA foreign_keys` on for
  the pool. The `REFERENCES games(id)` in migration 7 is documentation.
- It is not wrapped in a transaction either, following `buyWishlistEntry`: `execute`
  takes a connection from a pool per call, so a hand-rolled `BEGIN` can land on a
  different connection from the statements it is meant to cover — the writes autocommit
  and the `BEGIN` holds a lock nothing releases. The order carries the safety instead.
  The wishlist is freed first, because a failure after that leaves entries visibly
  missing a parent rather than anything lost, and the base game and its DLC go in a
  single statement (`id = ?1 OR parent_id = ?1`) so they cannot half-go.
- Expansion state in the list view is per game and lasts the session. It is not
  persisted: `CONTEXT.md` calls the view the one setting that outlives the window, and an
  all-collapsed library on launch is what the feature is for.
- A wishlisted DLC's parent is always a Game, never another wishlist entry, and it nests
  nothing — the Library is bounded by what you own, so an entry is never drawn inside it.
  The parent is a label on a flat wishlist row saying why you want it. See ADR-0005.
- IGDB's `dlcs` and `expansions` are read together. The split does not match the word:
  Alan Wake II and Cyberpunk 2077 both report `dlcs` empty and carry their DLC entirely
  under `expansions`, so reading `dlcs` alone finds nothing for either.
