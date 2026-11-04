# 01 — The model and both views

Status: resolved
Type: task

`parent_id` on `games`, migration 7, and the two views that draw it. See
`docs/adr/0008` for why a DLC is a Game rather than its own table, why depth is one, why
nesting is structural, and why nothing is rolled up.

- Migration 7, `Game.parent_id`, `WishlistEntry.parent_id`
- `lib/nesting.ts`: `nest`, `parentOptions`, `hasDlc`, `isDlc`
- `GameCard` folder badge; `DlcPanel` wrapping a `GameTable`
- `GameTable` draws nodes, with a disclosure triangle and indented child rows
- `Modal` stack counter, so the panel can be worked inside
- Counts, result line, filtered-match badge, list auto-expansion
- Cascade delete in `db.ts`, confirm dialog and toast
- `CONTEXT.md`: **Base game**, **DLC**, amended **View**, **Library**, both view entries

## Comments

The card-view affordance was argued as expand-in-place and settled as a panel by the
owner. The objection to a panel — that it invents a third way of drawing a game — is
answered by putting a `GameTable` inside it rather than a bespoke row.
