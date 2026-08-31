# DATABASE.md

The canonical schema and its invariants.

Schema changes are made **here first**, then in code. Do not let a coding session
casually redesign the schema to work around a problem.

## Entities

```
users
sessions
creators
battles
sponsorships
```

## Relationships

```
User
 │
 └──── 0..1 Creator


Creator A ─┐
           ├── Battle
Creator B ─┘
              │
              └── Winner


Sponsor
   │
   └── Sponsorship
          │
          ├── start_at
          └── end_at
```

## Tables

### users

Owned by Better Auth. Do not hand-roll auth columns.

```
id            uuid pk
email         text unique
created_at    timestamptz
```

### sessions

Owned by Better Auth.

### creators

```
id            uuid pk
user_id       uuid fk → users.id  null (unclaimed creators allowed)
username      text unique
name          text
avatar_url    text
bio           text            one line
category      text
links         jsonb           external links
aura          integer         default 1500
battles_count integer         default 0
wins_count    integer         default 0
is_active     boolean         default true
created_at    timestamptz
```

### battles

Immutable once written. This is the historical record.

```
id                uuid pk
creator_a_id      uuid fk → creators.id
creator_b_id      uuid fk → creators.id
winner_id         uuid fk → creators.id
voter_session     text            anonymous session identifier
aura_a_before     integer
aura_b_before     integer
aura_a_after      integer
aura_b_after      integer
created_at        timestamptz
```

### sponsorships

```
id            uuid pk
sponsor_name  text
image_url     text
target_url    text
start_at      timestamptz
end_at        timestamptz
stripe_id     text
created_at    timestamptz
```

## Invariants

These matter more than the columns. Enforce them in the database where possible,
in the server layer where not.

- `creator_a != creator_b`
- `winner` must be `creator_a` or `creator_b`
- one account owns at most one creator
- `username` is unique
- Aura cannot be changed by the client
- every battle retains historical rating information (`aura_*_before` / `aura_*_after`)
- battle rows are never updated or deleted
- sponsorship periods cannot overlap
- expired sponsorships don't display
- only active creators participate in battles
- a vote writes the battle row and both Aura updates in a single transaction

## Indexes

```
creators(aura desc)        leaderboard
creators(username)         profile lookup
creators(is_active)        pool selection
battles(created_at)        Daily Heat
battles(winner_id, created_at)
sponsorships(start_at, end_at)
```

## Derived, Not Stored

- **Rank** — computed from `aura desc`. Never a column.
- **Daily Heat** — computed from today's battles. Never a column. See [RANKING.md](RANKING.md).
- **Main Character** — computed daily from Daily Heat.

If any of these become too slow, cache them. Do not denormalize them into `creators`
without recording the decision in [DECISIONS.md](DECISIONS.md).
