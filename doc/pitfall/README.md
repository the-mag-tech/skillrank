# Known Pitfalls

This directory documents bugs, gotchas, and hard-won lessons
encountered during SkillRank development.

## Index

<!-- INDEX:START -->
| ID | Title | Area | Severity | Status |
| --- | --- | --- | --- | --- |
<!-- INDEX:END -->

## Deferred

Items observed but not yet filed:

- (none yet)

## Template

To add a new pitfall:

1. Create `PIT-NNN-slug.md` using the template below
2. Run `npx tsx scripts/generate-doc-index.ts pitfall` to update this index

```markdown
# PIT-NNN: Short Descriptive Title

**Date:** YYYY-MM-DD
**Area:** worker | db | crawler | ranker | api
**Severity:** low | medium | high
**Status:** active | resolved | mitigated
**Related:** ADR-NNN, PR #NNN

## Symptom
[What went wrong?]

## Root Cause
[Why did it happen?]

## Fix
[How was it resolved?]

## Lesson
[What did we learn?]
```
