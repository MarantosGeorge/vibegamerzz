# Status is one flat vocabulary of six

A game's `status` is a single field holding one of six mutually-exclusive terms — Backlog,
Attempted, Completed, Platinum, Abandoned, Playing — and none of them contains any other.

Two things about that are surprising enough to write down.

**Playing shares a field with the progress terms.** Playing describes activity ("on my desk
right now"), while the other five describe progress, so they arguably belong on separate axes:
a `status` for progress plus an orthogonal `is_playing` flag. That was considered and rejected.
The cost of the flat model is bookkeeping — putting a game down means remembering to move it
back to Attempted — and it is small, because the card renders playtime and achievement
percentage regardless of status, so nothing is actually hidden while a game sits in Playing.
The cost of two axes is a second control on every card and a second thing to reason about
forever. For a personal library, the bookkeeping is cheaper.

**Platinum does not count as Completed.** Gold-then-platinum is ranking imagery and invites
the assumption that Platinum is a stronger Completed — that finishing a game to 100% should
increment a "completed" total. It does not. The header reads `3 completed · 1 platinum`
because those are two separate shelves, and a reader who expects `4 completed` is applying a
hierarchy the model deliberately does not have. If a total across both is ever wanted, it has
to be spelled out at the call site rather than assumed.

## Consequences

- The status chips are ordered Backlog → Attempted → Completed → Platinum → Abandoned →
  Playing for readability only. The order carries no meaning and nothing should depend on it.
- There is still exactly one field describing progress, so the existing rule holds: no second
  boolean, nothing to drift out of sync.
