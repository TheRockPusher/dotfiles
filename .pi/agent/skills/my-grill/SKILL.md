---
name: my-grill
description: Grilling session that challenges a plan against the existing domain model, sharpens terminology, and updates domain context documentation as decisions crystallise. Use when the user wants to stress-test a plan against the project's language, code, and documented decisions.
disable-model-infocation: true
---

# My Grill

Run a rigorous design-grilling session. Interview the user one decision at a time until the plan, terminology, and domain boundaries are clear.
ALWAYS use ask_user_questions to ask the user for their input on each question, and wait for their answer before proceeding to the next question.

## Core Behaviour

- Ask one question at a time and wait for the user's answer before continuing.
- For each question, include your recommended answer and why.
- Walk the design tree deliberately: resolve prerequisite decisions before dependent decisions.
- If a question can be answered by exploring the codebase or existing docs, investigate instead of asking.
- Challenge vague language, overloaded terms, and contradictions immediately.
- Capture resolved domain language in the relevant `CONTEXT.md` as soon as it is settled; do not batch glossary updates.

## Step 1: Discover Existing Context

Before questioning, inspect the current repo or relevant folder for domain documentation.

Look for:

```text
.agents/CONTEXT.md
.agents/CONTEXT-MAP.md
docs/adr/*.md
src/**
```

Context layout rules:

- If `.agents/CONTEXT-MAP.md` exists, read it first. The repo has multiple domain contexts; use the map to find the relevant `CONTEXT.md`.
- If `.agents/CONTEXT.md` exists, treat the repo as a single-context repo.
- If neither exists, create `.agents/CONTEXT.md` lazily only after the first term or domain boundary is resolved.
- When multiple contexts exist and the relevant context is unclear, ask which context the plan belongs to.

## Step 2: Explore Before Asking

When the answer may already exist, use the codebase and docs before asking the user.

Check:

- Existing `CONTEXT.md` glossary entries and flagged ambiguities.
- ADRs in `docs/adr/` for irreversible or historically important decisions.
- README files and architecture docs.
- Source code names, public APIs, tests, migrations, schemas, configs, and fixtures that reveal actual domain behaviour.

If the code contradicts the user's statement, surface the contradiction clearly:

> The code appears to cancel entire Orders, but the plan assumes partial cancellation is possible. Which behaviour is the intended domain rule?

## Step 3: Challenge the Language

During the session, continuously compare the user's wording against the documented language.

### Glossary conflicts

If the user uses a term differently from `CONTEXT.md`, stop and resolve it:

> The glossary defines "Cancellation" as an Order-level concept, but here you seem to mean cancelling a single line item. Should this be a different term?

### Fuzzy or overloaded terms

When the user says a broad term, propose a precise canonical term:

> You're saying "account". Do you mean Customer, User, or Billing Account? Those are different concepts.

### Concrete scenarios

Stress-test relationships with specific edge cases:

- Boundary cases
- Partial failure cases
- Lifecycle transitions
- Ownership changes
- Cross-context interactions
- Historical/audit scenarios

## Step 4: Update Context Inline

When terminology or a domain boundary is resolved, update the appropriate `CONTEXT.md` immediately using `CONTEXT-FORMAT.md`.

Rules for `CONTEXT.md`:

- It is a glossary only.
- Keep it free of implementation details.
- Do not use it as a spec, scratchpad, roadmap, or decision log.
- Only include project/domain-specific concepts, not general programming concepts.
- Prefer short, opinionated definitions.
- List discouraged aliases with `_Avoid_:`.
- Add flagged ambiguities when a term has been used in conflicting ways and record the resolution.

## Step 5: Offer ADRs Sparingly

Only offer to create an ADR when all three conditions are true:

1. **Hard to reverse** — changing the decision later would be meaningfully costly.
2. **Surprising without context** — a future reader would ask why this path was chosen.
3. **Real trade-off** — there were genuine alternatives and the choice reflects a reasoned trade-off.

If any condition is missing, do not create an ADR.

When an ADR is warranted, ask before creating it. Store ADRs under `docs/adr/` unless the repo already uses another ADR location.

## Question Style

Use this structure for each question:

```md
Question: <one precise question>
Recommended answer: <your recommendation>
Why: <brief reasoning, including code/doc evidence if available>
```

Then wait for the user's answer.

## Supporting Formats

- Use `CONTEXT-FORMAT.md` for `CONTEXT.md` files.
