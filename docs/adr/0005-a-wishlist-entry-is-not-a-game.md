# A wishlist entry is not a game

Wishlist entries live in their own table, not as rows in `games`. The `games` table keeps its
existing meaning exactly — every row is a title you own — and every invariant that rests on
that stays true: `platform` NOT NULL, `status` NOT NULL, one of six shelves, always.

The glossary had already decided this without anyone noticing. `CONTEXT.md` defines a Game as
"one title in your library, **bought** on exactly one storefront", and Backlog carries
`_Avoid_: unplayed, **wishlist**, owned`. A title you have not bought has no storefront, no
status, no playtime and no completion — four of the six things a Game is made of. It is a
different kind of thing, and the model now says so.

The cost is paid in duplication: `title`, `igdb_id`, `cover_file`, `summary`, `release_date`,
`critic_rating` and `genres` are declared in both tables, and the IGDB search, the cover
pipeline and the duplicate callout all serve two callers instead of one.

## Considered options

**A seventh status.** Add `wishlist` to `STATUSES` and everything else is free — the chips, the
counts, the filters and the sorts all work with no changes at all. Rejected because it makes
`status` answer two different questions at once. Every one of the six existing terms describes
how far through a game you are; `wishlist` would describe whether you have it. ADR-0001 spent
its length arguing that `status` holds exactly one flat vocabulary, and a seventh term that is
not a shelf is that argument's clearest possible violation. It would also have quietly made
`platform`, `playtime_minutes` and `achievement_pct` meaningless on an unbounded fraction of the
rows in a table whose constraints assume otherwise.

**One table, plus an ownership axis.** Keep one row per title and add `owned` beside `status`.
No duplicated columns, and buying becomes a flag flip rather than a promotion. Rejected on the
same grounds ADR-0004 rejected `has_achievements`: the database would be able to hold
`owned = 0` alongside `status = 'platinum'` and 40 hours of playtime, and two fields describing
one truth drift apart. It also forces `status` and `platform` to become nullable — undoing the
NOT NULL guarantees that the existing filters, counts and status chips read as given — and every
query in `App.tsx` would need an `owned` predicate that a future change can silently forget. A
missing predicate on a separate table is a compile error; a missing predicate on a shared table
is a wishlist entry appearing in your Backlog.

The duplicated metadata columns are the price of making the wrong states unrepresentable rather
than merely discouraged, which is the trade this codebase has made twice before.

## Buying is a promotion, and it goes through the form

`games.platform` and `games.status` are both NOT NULL, and a wishlist entry knows neither. Buying
therefore cannot be a data move; something has to supply two facts that never existed.

That something is the user. "I bought this" opens the existing `GameForm` prefilled with
everything the entry does know, the user picks a storefront and a status, and only on save is the
Game created and the entry deleted. Cancelling leaves the entry untouched.

A one-click promotion defaulting to `Other` / `backlog` was rejected because `Other` is a real
storefront in the list rather than a null — six months later there is no way to tell a guess from
a deliberate answer, and the row looks exactly as intentional as one that was.

## Consequences

- Priority does not survive the crossing. It measures how much you want something, and you now
  have it. Nothing about a Game records how long it sat on the wishlist first, and adding that
  later means a new column on `games`, not a rescued one.
- The cover file transfers rather than being copied. It is a file on disk with a name; the new
  row points at the same name and the old row stops existing. Nothing is written to disk and
  nothing is orphaned.
- `created_at` on the promoted Game is the moment you bought it, not the moment you wanted it,
  so "Date added" keeps meaning added-to-your-library on every row without exception.
- Duplicates are called out, never blocked. The same title can sit in both places — you can buy
  something on Steam and add it by hand without going through the promotion. The IGDB search says
  "In library" or "On wishlist" and lets the pick through, which is what `IgdbSearch` already does
  for the library alone. Enforcement was rejected because it is only possible on `igdb_id`, and a
  hand-typed entry has none: a rule that holds for some rows is worse than no rule, because the
  code starts trusting it.
- Sample data seeds both tables from one button, and clearing samples clears both. The wishlist
  groups by priority, so an empty one demonstrates nothing about itself.
