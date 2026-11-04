# 03 — Wishlisted DLC

Status: resolved
Type: task

A wishlist entry can name a Game it is DLC for. It nests nothing: the Library is bounded
by what you own (`docs/adr/0005`), so an entry is never drawn inside it.

- `wishlist.parent_id`, always a `games` id, never another entry
- "DLC for…" dropdown in `WishlistForm`, with hint (b)
- Buying carries the parent across, so a wishlisted DLC stays filed once owned
- Deleting the base game clears the parent and keeps the entry

## Comments

Drawing these flat in the Wishlist tab with a "DLC for X" label was chosen over nesting
them in the Library. The parent says why you want it; it does not make it a Game.
