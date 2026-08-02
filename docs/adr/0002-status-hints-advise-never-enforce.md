# Status hints advise, never enforce

Some statuses restate numbers the database already holds — Backlog means no playtime,
Platinum usually means 100% achievements — so the app can tell when a status disagrees with
the data. When it does, the form shows a line of text under the Status dropdown and stops
there. It never blocks a save, never changes the field, and never opens a dialog.

Exactly two hints exist:

| Status | Condition | Hint |
| --- | --- | --- |
| Backlog | `playtime_minutes > 0` | You've played this — Attempted? |
| Attempted, Completed | `achievement_pct === 100` | 100% achievements — Platinum? |

Platinum, Abandoned and Playing are silent under every condition. This is the part worth
recording, because each exemption looks like an oversight and is not:

- **Platinum** means "completely done, by whatever measure fits this game" — its achievements,
  its own completion metric, or a personal standard. A Platinum game at 94% is a correct
  Platinum game, and plenty of PC games (GOG and itch.io titles especially) ship with no
  achievements at all, so their counter can never reach 100. Validating Platinum against
  `achievement_pct` would make those games permanently unmarkable.
- **Playing** says nothing about progress. A game you started last night has no playtime; an
  endless roguelike you still play every week may sit at 100%. Neither is wrong, so no number
  can contradict the status.
- **Abandoned** is a decision already made. The numbers behind it can be anything.

The Backlog hint keys on playtime alone and never on achievements, for the same
achievement-less-games reason.

## Consequences

The database will happily hold a Backlog game with forty hours on it. That is intended — the
user owns the field. Do not add a `CHECK` constraint, form validation, or a save-time
correction to "fix" it.
