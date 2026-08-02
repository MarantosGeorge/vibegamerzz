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
Completely done with the game, by whatever measure fits it: its achievements, its own completion metric, or your own standard. The achievement counter is evidence of Platinum, never the definition — plenty of games have no achievements at all.
_Avoid_: 100%, Mastered, Completionist

**Abandoned**:
Played, and you will not return to it. The reason does not matter.
_Avoid_: Dropped, Retired, Shelved, Quit

**Playing**:
On your desk right now. Says nothing about how far through the game you are — a game you are playing may have no playtime yet, or every achievement already.
_Avoid_: Active, Current, In Progress
