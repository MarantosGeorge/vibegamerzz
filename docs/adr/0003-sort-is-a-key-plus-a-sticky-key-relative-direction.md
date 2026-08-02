# Sort is a key plus a sticky, key-relative direction

Sorting is two fields on `Filters`, not one. `sort` names a key — date added, title, your
rating, critic score, playtime, completion — and `direction` says which way round it runs.
The dropdown carries neutral nouns; a toggle beside it carries the direction.

Three things about that are surprising enough to write down.

**The flat vocabulary was rejected here, unlike in ADR-0001.** The alternative was to keep one
field and double its entries: "Highest rated" alongside "Lowest rated", "Most played" alongside
"Least played", twelve options in one dropdown. That is the shape ADR-0001 chose for `status`,
where it argued a second axis is "a second control and a second thing to reason about forever".
The precedent does not transfer. There, the two candidate axes were semantically different
things — progress and activity — that only looked separable. Here direction means the identical
thing for all six keys, so a single field would encode a 6×2 grid as a flat list of twelve and
force every mirror label to be invented separately. Twelve options is also a long scan for what
one click expresses.

**The direction is `natural` / `reversed`, not `asc` / `desc`.** Title's conventional direction
is the opposite of every other key's: A–Z is ascending, while "Highest rated", "Most played" and
"Newest first" are all descending. One literal ascending/descending flag has to straddle that,
and it can't. Because the app opens descending — it must, to match the ordering it has always
had — a literal flag means the first time you ever choose "Title" you get Z–A. So the flag is
read relative to its key instead. `natural` is A–Z for title and highest-first for the rest, and
is exactly the app's original behaviour on all six keys; `reversed` is the other way.

This is also why the toggle is a button showing words rather than a bare ↑/↓. Each key supplies
its own pair — `A–Z` / `Z–A`, `Most played` / `Least played`, `Newest first` / `Oldest first` —
which are the phrases that used to live in the dropdown. "Ascending playtime" means nothing;
"Least played" does. The button states the ordering currently on screen, not the one a click
would produce.

The arrow beside those words is the one place asc/desc survives, and it is literal: it points
the way the list actually runs, so Title in its natural order shows ↑ while every other key
shows ↓. It has to be literal because the narrow breakpoint hides the words and leaves the
arrow carrying the control alone.

**Direction is sticky, and that is a deliberate cost.** It survives a change of key rather than
resetting to the new key's natural order. Reversing once therefore reverses everything until it
is flipped back. Resetting on every key change was considered and rejected: sticky matches the
"show me the worst of everything" browse, where you flip once and then move between keys.

## Absence is not a low value

`critic_rating` is null when nobody has scored a game, and `rating` uses `0` to mean unrated.
Games with no value for the key in play are partitioned out, ordered A–Z among themselves, and
appended — so they sit at the bottom in **both** directions.

Reversing is asking "which of my games are the worst reviewed?", and answering it with a run of
games nobody reviewed is not an answer. Under the old single-direction comparator this was
invisible: null mapped to `-1` and sank. Negating that sentinel would have floated every
unscored game above the ones scored 12, and every unrated game above the one rated half a star.

Playtime and completion are deliberately **not** covered. A `0` there is an honest zero — plenty
of games have no achievements at all, and a game you never launched really does have the least
playtime — so those rows belong in the ordering like any other number.

## Consequences

- Reversal multiplies the primary comparison only. The title tiebreak on the five numeric keys
  stays A–Z in both directions, because it exists for render-to-render stability rather than to
  mean anything — reversing "Most played" should not silently re-alphabetise every game tied on
  zero. The `id` term on date added is the exception and reverses with its primary: `id` proxies
  insertion order, so it continues that ordering at finer resolution rather than breaking a tie
  over it.
- Do not reintroduce a sentinel for missing values. The partition exists precisely because a
  sentinel is what breaks the moment the sign flips.
- When a library is mostly unrated, the bottom of the list looks identical whichever way the
  toggle points. That reads as a broken control and is correct behaviour.
- `Filters` is not persisted, so the app always opens on date added + natural — the ordering it
  had before this decision. Direction is not an exception to that.
- Adding a sort key means supplying its neutral noun, both of its directional phrases, and a
  ruling on whether it can be absent.
