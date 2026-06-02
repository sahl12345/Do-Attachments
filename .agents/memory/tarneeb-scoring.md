---
name: Tarneeb scoring convention
description: Team assignment and display grid layout for tarneeb games
---

## Rule
- Team A = players[0] + players[2] (even indices, partners sit across)
- Team B = players[1] + players[3] (odd indices)
- Score grid displays [0,1] in row 1 and [2,3] in row 2
- Team labels alternate by column index (idx===0 → فريق أ, idx===1 → فريق ب)

**Why:** Standard tarneeb seating — partners sit diagonally across the table. Applies to both tarneeb and tarneeb_sy.

**How to apply:** Any new 4-player team game scoring or display must use this convention. TarneebEntry in ScoreEntryModal uses teamA=[p[0],p[2]] and teamB=[p[1],p[3]].
