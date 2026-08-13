# A seventh shelf: Above and Beyond

`status` now holds one of seven terms rather than six. The new one is Above and Beyond, and it
means the game is done past what the game itself measures.

Souls-likes are the clearest case. No ending in Dark Souls III requires the Nameless King, no
achievement in Silksong requires Shakra, and Elden Ring rolls credits with Malenia alive. Plenty
of people beat them anyway, and consider the game genuinely finished only once they have. The
same shape appears outside the genre: every weapon and armour set in The Witcher 3, the optional
challenges that pay out Control's outfits. None of it is tracked, and all of it is the thing the
player means by "100%".

## Why this is not just Platinum

Platinum used to read "completely done with the game, by whatever measure fits it: its
achievements, its own completion metric, **or your own standard**." That last clause was doing
two jobs and is now doing one. Platinum is the bar the game drew; Above and Beyond is the bar you
drew. **Platinum's meaning has narrowed**, and that is stated here rather than left to be
discovered — `CONTEXT.md` now defines it as "done by a measure the game itself keeps".

Nothing has been re-filed. Every game already sitting on Platinum stays there, whichever of the
two clauses put it there, exactly as the `playing` rows survived ADR-0001's migration and the
honest zeroes survived ADR-0004's. Re-filing is the user's call.

## Why one more value and not a second field

A boolean beside `status` was the obvious alternative, and it expresses "past Platinum" more
literally than a seventh shelf does: a game could be Platinum *and* Above and Beyond. It was
rejected for the reason ADR-0001 keeps progress in `status` alone and ADR-0004 refused a
`has_achievements` flag — two fields describing one fact drift apart. A flag would let the
database hold `status = 'backlog'` with `above_and_beyond = 1`, which is not a state, and no
CHECK constraint short of re-deriving the whole vocabulary would stop it.

A free-text column recording *what* you did — the boss, the collection — was also rejected. It
would be the first column in this schema whose validity depends on another column's value, and
`notes` already exists and is already free text.

## The counts do not roll up

An Above and Beyond game does not count as Platinum and is not returned by the Platinum filter.
This is ADR-0001's rule applied a second time, and it takes more explaining here because the new
shelf is *defined* by reference to Platinum in a way Platinum never was to Completed. The
definition is a relationship between meanings; the counts are a fact about rows. The header reads

    12 games · 3 completed · 1 platinum · 2 above and beyond

and a reader who wants a total across the three has to add them up deliberately. The chip counts
still sum to the library total, which they would stop doing the moment any shelf contained
another.

## The hint stays silent, and needs no code to do it

ADR-0002 exempts Platinum, Abandoned and Playing from every status hint. Above and Beyond joins
them, in both directions, without a branch:

- Nothing suggests it. The shelf is defined by content the game does not count, so no number in
  this database could ever imply a game belongs on it. A hint fired from `achievement_pct = 100`
  would be guessing, and it would guess wrong on every platinumed game forever.
- A game already on it matches no existing condition, so it is silent for free.

This is the second time ADR-0004's observation has paid out: a rule expressed in the data rather
than in prose needs no carve-out written for it.

## What this changes elsewhere

**This supersedes ADR-0001's count of six** — its title, its opening sentence, and the
consequences bullet listing the six chips in order. The new order is Playing → Abandoned →
Backlog → Attempted → Completed → Platinum → Above and Beyond, and it is still readability only.
ADR-0001 is otherwise left as written: one field, no second boolean, no hierarchy in the counts,
and Platinum still does not count as Completed. Its reasoning is what made a seventh value the
cheap change it was.

The row was resequenced at the same time, which ADR-0001's bullet explicitly permits — nothing
depends on the order, and nothing did. It now leads with the two shelves that answer "what is
going on right now", then runs the five that describe how far a game got, shortest journey to
longest. That last run ends on Above and Beyond and therefore looks like a ladder, which it is
not: it is the same reading order the glossary uses, and the counts still refuse to add up.

## Consequences

- Migration v6 rebuilds `games` to widen the CHECK, because SQLite cannot alter one in place.
  A pure widening: every previously legal value is still legal and no row changes.
- Nothing is backfilled, and nothing could be. The shelf exists precisely because the fact that
  puts a game on it is not in the database.
- The value is stored hyphenated, `above-and-beyond`, following `must-have` in `wishlist`. It is
  the first status to need it.
- Its colour is fuchsia `#d946ef` rather than a violet, because `--accent` is already
  indigo-purple and paints the border of the selected chip, and `--priority-interested` is violet
  on the wishlist. A dot has 7px to distinguish itself in.
- The label is "Above and Beyond" everywhere, including the card badge, where it is the widest
  badge the app draws. One term, one name — no short form.
- Sorting is untouched. `status` has never been a sort key and this does not make it one.
