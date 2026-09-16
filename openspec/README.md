# OpenSpec: Underhyped SDD (Structured Development Definition)

This directory contains the Structured Development Definition (SDD) artifacts for the Underhyped project. SDD is a disciplined approach to defining, designing, and implementing features with clear verification gates and test-driven practices.

## Structure

```
openspec/
├── config.yaml                          # Project config: stack, testing, conventions
└── changes/
    └── {change-name}/
        ├── spec.md                      # What we're building (requirements, acceptance criteria)
        ├── design.md                    # How we're building it (architecture, components, queries)
        └── tasks.md                     # Which commits, in what order (11 atomic tasks with TDD evidence)
```

## Current Changes

### [phase-1-receipts](./changes/phase-1-receipts/)

**Status:** Tasks (ready to implement)  
**Product:** V2.0 — Picker Identity via Receipts  
**Scope:** Spot action, Google sign-in, Receipts page, share card  
**Effort:** ~27-35 hours (11 commits)

**Quick links:**
- [Spec](./changes/phase-1-receipts/spec.md) — Problem, solution, scope, acceptance criteria
- [Design](./changes/phase-1-receipts/design.md) — Architecture, UI, queries, file structure
- [Tasks](./changes/phase-1-receipts/tasks.md) — Commit-by-commit breakdown with TDD evidence gates

## How to Use SDD

### Phase: Spec (Definition)
**Goal:** Define what we're building  
**Output:** `spec.md`  
- Problem statement
- Solution overview
- Scope (MUST HAVE / NICE TO HAVE / NOT V2)
- Data model
- Acceptance criteria
- Risks & mitigations

### Phase: Design (Architecture)
**Goal:** Define how we're building it  
**Output:** `design.md`  
- System architecture & data flow
- Technology decisions and rationale
- UI components & layouts
- File structure
- Query patterns
- Reused code patterns
- Performance considerations

### Phase: Tasks (Implementation Plan)
**Goal:** Break design into atomic, testable commits  
**Output:** `tasks.md`  
- 11 commits (or fewer) numbered and ordered
- Each commit has:
  - Acceptance criteria (all must pass)
  - Test evidence required
  - Files to create/modify
  - Complexity estimate
- Task dependency graph
- Critical path & parallelization options

### Phase: Apply (Implementation)
**Goal:** Execute tasks with strict TDD  
- RED → GREEN → REFACTOR for each task
- Tests passing before moving to next task
- Evidence trail (commit messages reference this SDD)

### Phase: Verify (Verification)
**Goal:** Confirm implementation matches spec  
- typecheck ✅
- lint ✅
- tests ✅ (≥90% coverage for new code)
- build ✅
- Manual E2E verification
- Edge case handling

## Vocabulary

- **Spot** — Eye action on a creator; deliberate, separate from pick
- **Receipts** — Proof of early backing; sharable via OG card
- **Picker** — Authenticated voter (has identity via Google)
- **Voter** — Any person playing (signed-in or out)

See [spec.md](./changes/phase-1-receipts/spec.md) for full vocabulary.

## Key Files to Read

1. **Start here:** [spec.md](./changes/phase-1-receipts/spec.md) for the what/why
2. **Then:** [design.md](./changes/phase-1-receipts/design.md) for the how
3. **Then:** [tasks.md](./changes/phase-1-receipts/tasks.md) for the commit plan
4. **Reference:** `config.yaml` for project conventions

## Testing Strategy

**Strict TDD:** Each task follows RED → GREEN → REFACTOR

- **Red:** Write failing test for acceptance criteria
- **Green:** Implement code to pass test
- **Refactor:** Improve without breaking test

**Test Coverage:**
- Unit tests for pure modules (nudge logic, best-spot selection, rank computation)
- Integration tests for queries (spot insert, session link, receipts query)
- E2E verification for UI (manual browser testing, video recording)

**Evidence Trail:**
Each task commit includes:
- Test file(s) with passing tests
- Implementation code
- Updated docs if applicable

## Status Tracking

| Phase | Status | Owner | ETA |
|---|---|---|---|
| Spec | ✅ Done | Orchestrator | Sep 2026 |
| Design | ✅ Done | Orchestrator | Sep 2026 |
| Tasks | ✅ Done | Orchestrator | Sep 2026 |
| Apply | ⏳ Ready | SDD Apply Agent | TBD |
| Verify | ⏳ Ready | SDD Verify Agent | TBD |

## Notes for Implementation

- **Commit order matters:** Task 1 (docs) before Task 2 (schema), etc. See [tasks.md](./changes/phase-1-receipts/tasks.md) for dependency graph.
- **Database:** Migration via Drizzle (`npm run db:migrate`). `DIRECT_URL` may be broken; use Supabase MCP if needed.
- **Auth:** Google only in Phase 1; X sign-in deferred to Phase 2.
- **Receipts page:** `force-dynamic`, `robots: noindex` (private)
- **Early spotters:** `rank_at_spot = null` if creator in placement (accepted risk for Phase 1)

## References

- Original plan: `.claude/plans/phase-1-spot-indexed-milner.md`
- Product docs: `docs/{DATABASE,DECISIONS,MVP,DESIGN,ARCHITECTURE,PRODUCT}.md`
- Next phases: Roadmap deferred (weekly digest, X sign-in, public receipts URL)

---

**Created:** 2026-09-17  
**Last updated:** 2026-09-17
