# gamerzz

A personal library for the PC games you own, tracking how far through each one you are.

## Language

**Game**:
One title in your library. Bought on exactly one storefront, and sitting on exactly one status.

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
