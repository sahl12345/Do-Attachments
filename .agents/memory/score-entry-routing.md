---
name: Score entry game routing
description: How ScoreEntryModal routes to game-specific entry UIs
---

## Rule
ScoreEntryModal accepts `gameId?: string` and renders:
- `tarneeb` | `tarneeb_sy` → TarneebEntry (bid + tricks → auto-calc with كبوت support)
- `terkis` | `terkis_team` | `terkis_complex` → TerkisEntry (contract chips per player)
- All others → GenericEntry (± stepper with manual number input)

**Why:** Each game has different scoring rules; generic input is wrong for bidding games.

**How to apply:** When adding a new game-specific scoring UI, add its gameId to the routing condition in ScoreEntryModal and create a new Entry component. Always propagate gameId from session/[id].tsx → ScoreEntryModal.
