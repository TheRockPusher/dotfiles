# CONTEXT.md Format

## Structure

```md
# {Context Name}

{One or two sentence description of what this context is and why it exists.}

## Language

**Order**:
{A one or two sentence description of the term.}
_Avoid_: Purchase, transaction

**Invoice**:
A request for payment sent to a customer after delivery.
_Avoid_: Bill, payment request

**Customer**:
A person or organization that places orders.
_Avoid_: Client, buyer, account

## Flagged ambiguities

**Account**:
Previously used to mean both Customer and User. Resolved usage: use Customer for the organization/person that places orders; use User for a login identity.

## Example dialogue

Domain expert: "A Customer places an Order."
Developer: "Can a User place an Order without a Customer?"
Domain expert: "No. A User acts on behalf of exactly one Customer in this context."
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others as aliases to avoid.
- **Flag conflicts explicitly.** If a term is used ambiguously, add it to `Flagged ambiguities` with the resolution.
- **Keep definitions tight.** Use one or two sentences. Define what the concept is, not what it does.
- **Show relationships.** Use bold term names and express cardinality where obvious.
- **Only include domain-specific terms.** General programming concepts such as timeout, error type, utility, handler, or DTO do not belong unless they are domain concepts in this project.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to one cohesive area, a flat list is fine.
- **Write an example dialogue** showing how the terms interact naturally and clarifying boundaries between related concepts.
- **Avoid implementation details.** `CONTEXT.md` is a glossary, not a specification or architecture document.

## Single vs Multi-Context Repos

### Single context

Use one glossary:

```text
.agents/CONTEXT.md
```

### Multiple contexts

Use a map plus one glossary per context:

```text
.agents/CONTEXT-MAP.md
src/ordering/CONTEXT.md
src/billing/CONTEXT.md
src/fulfillment/CONTEXT.md
```

Example `.agents/CONTEXT-MAP.md`:

```md
# Context Map

## Contexts

- [Ordering](../src/ordering/CONTEXT.md) — receives and tracks customer orders.
- [Billing](../src/billing/CONTEXT.md) — generates invoices and processes payments.
- [Fulfillment](../src/fulfillment/CONTEXT.md) — manages warehouse picking and shipping.
```

When multiple contexts exist, infer which context the current topic relates to. If unclear, ask.
