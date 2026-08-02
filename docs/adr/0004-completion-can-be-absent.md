# Completion can be absent, and absence is NULL

`achievement_pct` used to be `INTEGER NOT NULL DEFAULT 0`, so a game with no achievement
system and a game where you have earned nothing were the same row. They are opposite facts.
Undertale ships no achievements on Steam; itch.io and GOG have no achievement system at all;
plenty of the Epic catalogue has none either. Filing all of them at 0% put them at the top of
"Least complete" — a list meant to answer "what have I barely started?" — and gave every one of
them a progress bar that could never move.

The column is now nullable. `NULL` means the game has no achievements to earn.

## Why one nullable column and not a `has_achievements` flag

A boolean beside the number is the cheaper migration — `ALTER TABLE ADD COLUMN`, no rebuild —
and it would have preserved the percentage across a toggle for free. It was rejected because it
lets the database hold `has_achievements = 0` alongside `achievement_pct = 87`. Two fields
describing one fact drift apart, which is the same reasoning that keeps progress in `status`
alone with no separate `completed` flag beside it. With one nullable column the contradiction is
unrepresentable rather than merely discouraged.

A sentinel — `-1` for "none" — was rejected outright. ADR-0003 already banned sentinels for
missing values on the grounds that they break the moment a sort's sign flips, and that ban did
not need testing twice.

## Why nothing was backfilled

Migration v4 copies every row across untouched. A game sitting at 0 stays at 0.

The migration cannot distinguish an unplayed game from an achievement-less one, and the two
available heuristics both fail. Nulling every 0% game is wrong for the entire Backlog, which is
the largest population of honest zeros in any library. Nulling 0% games by storefront is wrong
for Epic, which does have achievements for many titles — and the user would have no way of
knowing which rows had been rewritten. Re-filing is the user's call, exactly as it was for the
`playing` rows left alone by the six-status migration.

## What this changes elsewhere

**This supersedes the last paragraph of ADR-0003's "Absence is not a low value".** That
paragraph excluded completion from absence-handling because "a `0` there is an honest zero" —
correct at the time, when `0` was the only thing completion could say. It still holds for
playtime, and it still holds for a real 0%. `NULL` is new, and it is absence in exactly the
sense the rest of that section describes, so completion joins critic score and rating: those
games partition out of the ordering, sort A–Z among themselves and sit at the bottom in both
directions.

**It gives ADR-0002 a fact where it had only prose.** That decision exempts Platinum from every
status hint, and one of its stated reasons is that achievement-less games can never reach 100%,
so validating Platinum against the counter would make them permanently unmarkable. The hint is
now silent for these games without a branch of its own: `null === 100` is false. Nothing in
ADR-0002 changes — it was right, and it is left as written.

## Consequences

- The card renders no progress bar when completion is absent, and the stat reads
  "No achievements". An empty bar track was rejected: it reads as 0% at a glance, which is the
  exact confusion this decision exists to remove.
- In the form the percentage field is disabled rather than cleared while the checkbox is
  ticked, so unticking gives back the number that was typed. Only one of the two is ever saved.
- There is no filter for achievement-less games. Sorting by Completion already clusters them,
  and the toolbar is dense. Adding one later is not blocked by anything here.
- A game can be Platinum with no achievements, at 0%, or at 100%. All three are correct, and no
  `CHECK` constraint or save-time correction should ever be added to reconcile them.
