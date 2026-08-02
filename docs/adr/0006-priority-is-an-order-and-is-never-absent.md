# Priority is an order, and is never absent

A wishlist entry carries a `priority` of Must have, Interested or Someday. The column is
`NOT NULL DEFAULT 'interested'`, and the three terms are a genuine ranking.

Both halves of that contradict an ADR already in this directory, which is the only reason this
one exists. A reader who has internalised ADR-0001 and ADR-0004 will look at
`priority NOT NULL DEFAULT 'interested'` and read it as two mistakes.

## Why it is a ranking, when status deliberately is not

ADR-0001 is emphatic that the six statuses are independent shelves and not a hierarchy —
Platinum is not a stronger Completed, and the header says `3 completed · 1 platinum` precisely to
refuse implying a total. None of that applies here, and the inversion is deliberate.

The six statuses describe a game's history, and histories do not rank: Abandoned is not less than
Completed, it is a different thing that happened. Priority describes an intention about the
future, and intentions are comparative by nature — the entire question a wishlist answers is
"what should I buy next?", which is a question about order. Sorting statuses by rank would be
meaningless; sorting priorities by rank is the feature.

This is why the wishlist tab groups by priority into three headed sections rather than offering
priority as a chip filter the way the library offers status. The status chips let you look at one
shelf at a time because the shelves have no relationship to each other. The wishlist shows all
three tiers at once, top to bottom, because the relationship between them is the information.

## Why it can never be absent

ADR-0004 established that absence is real, that it is spelled `NULL`, and that absent values
partition out of the ordering and sit at the bottom in both directions. `rating` still uses `0`
to mean unrated and is the one remaining place that rule is not honoured.

Priority does not need any of that machinery, because absence is not a state it can reach.
A critic score is absent when nobody has scored a game, and completion is absent when a game ships
no achievements — both are facts about the world that can simply fail to exist. A priority is not
a fact about the world. It is an assertion by the user, and putting a title on the wishlist *is*
that assertion: you do not add something you do not want. `Interested` is therefore not a default
standing in for a missing answer, it is the answer that adding the entry already gave.

Making the column nullable was rejected for that reason. A NULL priority would mean "on the
wishlist, but not wanted", which is not a thing, and it would require a fourth section on the
tab — or a rule about which section unprioritised entries fall into — to render something that
should never exist. Stars, reusing `StarRating`, were rejected for the same reason plus one more:
they would have needed `0` to mean unset, reproducing on day one exactly the defect ADR-0004
exists to remove.

## Consequences

- `Someday` is not the absence of priority. It means you want the game and have decided not to
  buy it now, which is a deliberate act — the tier exists so the wishlist has somewhere to park
  things without them going quiet, and `Must have` stays short enough to be useful.
- Nothing enforces that `Must have` stays short. That is a habit, not a constraint, and no
  validation should ever be added to police it.
- Unreleased is derived from `release_date` and stored nowhere, so it is orthogonal to priority
  in both directions: an unreleased game can sit on any tier, and an entry stops being unreleased
  on its own without anything being written. It answers why you do not own a game; priority
  answers how much you want it. Neither constrains the other, and no section groups by it.
- Priority is not carried onto a Game when the entry is bought. See ADR-0005.
