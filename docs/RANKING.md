# RANKING.md

All ranking logic lives here. Changes are made here first, then in
`lib/ranking/`.

Two separate systems. Do not conflate them:

```
Aura            = long-term ranking
Main Character  = daily performance
```

Highest Aura is not the same as the hottest person today.

## Aura

Internally: Elo. In the UI it is only ever called **Aura**.

```
Starting Aura = 1500
Algorithm     = Elo
K             = 24
```

### Expected score

For creator A against creator B:

```
Ea = 1 / (1 + 10 ^ ((Rb - Ra) / 400))
Eb = 1 / (1 + 10 ^ ((Ra - Rb) / 400))
```

`Ea + Eb = 1`.

### Rating adjustment

Actual score `S` is 1 for the winner, 0 for the loser. There are no draws.

```
R' = R + K * (S - E)
```

### Winner update

```
Rw' = Rw + K * (1 - Ew)
```

### Loser update

```
Rl' = Rl + K * (0 - El)
      = Rl - K * El
```

### Rules

- Ratings are rounded to integers after each update.
- The two updates are symmetric: what the winner gains, the loser loses.
- Aura is computed server-side, inside the vote transaction, never on the client.
- `aura_before` and `aura_after` for both creators are stored on the battle row.
- Implement as pure functions in `lib/ranking/` with unit tests. No database access
  inside the math.

### Pairing

- Both creators must be active.
- A creator cannot battle themselves.
- V1 pairing: random from the active pool, with a mild bias toward creators who
  have fewer battles so new entries get rated quickly.
- Nothing about pairing can be bought. Sponsors never enter the pool.

## Main Character

The daily #1. Recomputed for each calendar day (UTC).

**Daily Heat** for V1:

```
Daily Heat = wins today - losses today
```

Main Character = the creator with the highest Daily Heat for the day.

Tie-breakers, in order:

1. Higher win rate today
2. More battles today
3. Lower current Aura (favours the more underrated creator)

Rules:

- A creator needs a minimum of 5 battles that day to be eligible. Prevents a 1-0
  record from taking the crown.
- Main Character is computed from `battles`, not stored on `creators`.
- The day boundary is UTC. Do not make it local time.

## Rank

Rank is position by `aura desc`. Always derived, never stored.

## Deliberately Not in V1

- Rating decay
- Provisional / uncertainty periods (Glicko-style)
- Category-scoped Aura
- Voter weighting or reputation
- Streak bonuses

If any of these become necessary, they go to [ROADMAP.md](ROADMAP.md) and get a
decision entry before implementation.
