# 02 — The two IGDB hints

Status: resolved
Type: task

Both advisory, both blocking nothing. See `docs/adr/0002`.

- `igdb.rs`: `parent_game.name`, `dlcs`, `expansions` on the search; `igdb_dlc` command
  looking DLC up by id with no platform filter; one shared mapper and one shared POST
- Hint (b), at pick time, in both forms: offers the filing when the base game is owned,
  explains itself when it is not
- Hint (a), after save: `DlcOffer`, a checkbox list, nothing ticked on open
- One Rust test on the query builders

## Comments

Verified against the live API before building: Alan Wake II and Cyberpunk 2077 both
report `dlcs` empty and carry their DLC under `expansions`. Reading `dlcs` alone — which
is what the design said until this was checked — would have shipped a feature that found
nothing for most games.

The same probe showed the `platforms = (6)` filter was not excluding DLC after all. It is
still dropped for id lookups, because it cannot help there and can only cost results.
