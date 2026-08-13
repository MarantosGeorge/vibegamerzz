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
sit on, and never a status at all: a title you do not own has no shelf to be on.

**Library**:
Every Game, taken together — and the tab that shows them. Bounded by what you own, not by what
exists: a title you have not bought is outside the library whether or not you want it.
_Avoid_: Collection, catalogue — the Catalogue is the thing the library is not

**Priority**:
How much you want a wishlist entry, on three ordered tiers. Always set: putting something on
the wishlist is itself the claim that you want it, so unlike a rating or a critic score a
priority is never absent and never has to be spelled zero.
_Avoid_: Rating — that is your score for a game you have played, and you have not played this

**Unreleased**:
A wishlist entry whose release date has not arrived. Never stored and never chosen — it is read
off the date, so an entry stops being unreleased on its own. It says why you do not own a game,
never how much you want it: an unreleased game can sit on any of the three priorities.

**Catalogue**:
Every PC game that exists, owned or not. The one part of this app that is not yours: it is read
and never kept, and nothing sits in it — a title is in your Library or on your Wishlist, never
"in the catalogue" as a place. Searching it is how a title arrives without being typed by hand.
_Avoid_: IGDB — that is the service the catalogue is read from, not the catalogue; database

**Catalogue entry**:
One title in the catalogue. Not a Game and not a Wishlist entry — picking one is the act that
turns it into one or the other, and until then the app is only looking. It shares "not a Game"
with a wishlist entry and nothing else: you did not create it, you will never own it, and it is
never stored, so it is gone the moment you stop looking.
_Avoid_: Result — it stops being one as soon as you are reading it; IGDB game

**Search**:
One verb, two scopes — you search your Library, and you search the Catalogue. The act is the
same both times: type, and matches appear. All that differs is what is being searched, one
thing you own and one thing you do not.
_Avoid_: Filter — the library box is a search too, and naming only one of them filtering claims
a difference in the act where the only difference is in the scope

**Storefront**:
Where a game was bought — Steam, GOG, Epic. Never console hardware; this library is PC-only.
_Avoid_: Platform, launcher

**Status**:
Which of seven shelves a game sits on. Mutually exclusive, and always yours to choose.
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

### The seven statuses

The seven are independent shelves, not a ranking. Platinum is not a stronger Completed, Completed is not a stronger Attempted, and Above and Beyond is not a stronger Platinum — a game is on one shelf and that is all the app knows about it. Above and Beyond is the one whose _meaning_ is defined by reference to another shelf; its _counting_ is not, and it is never totalled with Platinum. They are listed here — and rendered in the app — in reading order: what is going on right now first, then how far a game got. That is a running order, not a scoreboard.

**Playing**:
On your desk right now. Says nothing about how far through the game you are — a game you are playing may have no playtime yet, or every achievement already.
_Avoid_: Active, Current, In Progress

**Abandoned**:
Played, and you will not return to it. The reason does not matter.
_Avoid_: Dropped, Retired, Shelved, Quit

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
Done by a measure the game itself keeps: its achievements, or its own completion metric. The achievement counter is evidence of Platinum, never the definition — plenty of games have no achievements at all, and the library records that they have none rather than filing them at zero. What the game does not count is not Platinum's business; that is Above and Beyond.
_Avoid_: 100%, Mastered, Completionist

**Above and Beyond**:
Done past what the game measures. The optional boss no ending requires — the Nameless King, Malenia, Shakra — the weapons and armour nothing tracks, the challenges that only pay out in an outfit. Where Platinum answers a bar the game drew, this answers one you drew, and the achievement counter can sit anywhere while you do it. Rare on purpose: it is the shelf for actual 100%, not for having enjoyed something thoroughly.
_Avoid_: True 100%, Completionist, Beyond Platinum — the last one reads as a rung above Platinum, and the shelves are not a ladder

### The three priorities

Unlike the seven statuses, these three _are_ a ranking, and are meant to be — Must have outranks
Interested outranks Someday, and sorting the wishlist by priority is the whole point of having
one. The seven statuses are shelves; the three priorities are an order.

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
