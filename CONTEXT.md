# gamerzz

A personal library for the PC games you own, tracking how far through each one you are —
alongside a wishlist of the ones you have not bought yet.

## Language

**Game**:
One title in your library. Bought on exactly one storefront, and sitting on exactly one status.
A title you have not bought is not a Game — it is a **Wishlist entry**, and buying it is the
one event that turns it into a Game.

**Wishlist entry**:
A title you want and do not own. It has no storefront, no status, no playtime and no
completion, because all four are facts about owning something. What it does carry that a Game
does not is a **priority**.
_Avoid_: Wishlisted game, wanted game — "game" reads as the owned thing

**Wishlist**:
Every wishlist entry, taken together — and the tab that shows them. Never a shelf a Game can
sit on, and never a seventh status.

**Priority**:
How much you want a wishlist entry, on three ordered tiers. Always set: putting something on
the wishlist is itself the claim that you want it, so unlike a rating or a critic score a
priority is never absent and never has to be spelled zero.
_Avoid_: Rating — that is your score for a game you have played, and you have not played this

**Unreleased**:
A wishlist entry whose release date has not arrived. Never stored and never chosen — it is read
off the date, so an entry stops being unreleased on its own. It says why you do not own a game,
never how much you want it: an unreleased game can sit on any of the three priorities.

**Storefront**:
Where a game was bought — Steam, GOG, Epic. Never console hardware; this library is PC-only.
_Avoid_: Platform, launcher

**Status**:
Which of six shelves a game sits on. Mutually exclusive, and always yours to choose.
_Avoid_: State, progress, category, stage

**Completion**:
How much of a game's achievements you have earned. A game may have none to earn — which is not the same as zero earned, and never settles what shelf the game belongs on.
_Avoid_: Progress, achievements %

**Sort**:
Two independent choices — a **key** and a **direction**.

**Sort key**:
What the library is ordered by: date added, title, your rating, critic score, playtime, completion. A key says nothing about which way round it runs.

**Sort direction**:
Which way round the key runs, read relative to that key: _natural_ is A–Z for title and highest-first for every score and date, _reversed_ is the other way. Direction persists when you change key, so reversing once reverses everything until you flip it back.
_Avoid_: Ascending, descending — they don't survive contact with title, where the conventional direction is the opposite of every other key's.

**Unrated / unscored**:
A game carrying no value for the key in play — no critic score, no rating from you, or no achievements to earn. Not a low value: absence sits outside the ordering, and these games sit at the bottom of the library in both directions.

### The six statuses

The six are independent shelves, not a ranking. Platinum is not a stronger Completed, and Completed is not a stronger Attempted — a game is on one shelf and that is all the app knows about it.

**Backlog**:
Bought and never touched. No playtime.
_Avoid_: Unplayed, wishlist, owned

**Attempted**:
Played, the credits have not rolled, and you intend to return to it.
_Avoid_: In Progress, Started, Ongoing

**Completed**:
The main credits have rolled — the story is finished, along with whatever side content you picked up along the way. Where most people stop.
_Avoid_: Finished, Beaten, Done

**Platinum**:
Completely done with the game, by whatever measure fits it: its achievements, its own completion metric, or your own standard. The achievement counter is evidence of Platinum, never the definition — plenty of games have no achievements at all, and the library records that they have none rather than filing them at zero.
_Avoid_: 100%, Mastered, Completionist

**Abandoned**:
Played, and you will not return to it. The reason does not matter.
_Avoid_: Dropped, Retired, Shelved, Quit

**Playing**:
On your desk right now. Says nothing about how far through the game you are — a game you are playing may have no playtime yet, or every achievement already.
_Avoid_: Active, Current, In Progress

### The three priorities

Unlike the six statuses, these three _are_ a ranking, and are meant to be — Must have outranks
Interested outranks Someday, and sorting the wishlist by priority is the whole point of having
one. The six statuses are shelves; the three priorities are an order.

**Must have**:
You would buy it today at full price. The wishlist exists to keep this list short.

**Interested**:
The default a wishlist entry lands on, because adding it said this much already. You want it,
and you have not thought harder than that.

**Someday**:
You still want it, and you have consciously decided not to buy it for now. Demoting an entry
here is a deliberate act, not a shrug — it is where a wishlist parks the things that would
otherwise make it unreadable.
_Avoid_: Low priority, maybe, backlog — Backlog is a shelf for games you already own
