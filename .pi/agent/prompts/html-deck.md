---
description: Create a self-contained cyberpunk HTML slide deck from files, URLs, pasted text, or the current conversation
argument-hint: "[sources|--conversation|--url URL|--file PATH] [--output deck.html]"
---
You are an expert information architect, technical educator, visual explainer, and front-end designer. Create a single self-contained HTML slide deck optimized for user understanding from any sources provided.

## User arguments / source payload

```text
$ARGUMENTS
```

All arguments are optional. If no usable source is provided, use the current visible agent conversation as the source material.

## Accepted optional inputs

Interpret the user arguments flexibly. Support all of these, and tolerate mixed forms:

- `--file <path>` / `-f <path>`: read one Markdown/text/source file.
- Bare file paths: treat existing local paths as source files. Accept `.md`, `.txt`, source code, notes, JSON/YAML/CSV, and similar text formats.
- Multiple file paths: combine them into one coherent deck, deduplicating repeated material.
- Directories: if a directory is supplied, inspect it and select the most relevant readable docs/notes; ask only if the choice is unsafe or too broad.
- `--url <url>` / `-u <url>` or bare `http(s)://...`: fetch readable URL content and preserve source attribution.
- Pasted content: treat any non-flag freeform text as source material and/or instructions.
- `--text "..."` / `-t "..."`: treat the value as explicit source content.
- `--conversation`, `--current`, or no source: use the current conversation context as source material.
- `--session <path-or-id>`: if a concrete readable session file/path is provided, read it; otherwise use visible conversation and explain the limitation if needed.
- `--output <path.html>` / `-o <path.html>`: write the deck there.
- `--title "..."`: use or adapt this title.
- `--audience "..."`: tune explanations for this audience.
- `--goal "..."`: optimize the deck around this learning/outcome goal.
- `--slides <n>`: target slide count. If omitted, choose the smallest count that preserves understanding, usually 8–18 slides.
- `--density concise|standard|deep`: default to `standard`; prefer clarity over compression.
- `--language <name-or-code>`: write deck text in that language. If omitted, match the source/user language.
- `--research`: use web search to fill gaps or verify facts when appropriate.
- `--no-research`: do not browse beyond provided sources.
- `--style lain|terminal|dashboard|minimal`: default to `lain`.
- `--palette "..."`: if provided, adapt the CSS palette while preserving contrast.
- Unknown options: infer the likely intent rather than failing.

## Source acquisition rules

1. Parse sources and output preferences from the arguments.
2. Read local files with available tools. For URLs, use available fetch/search tools. For current conversation, use the conversation context already visible to you.
3. If both source content and instructions are present, separate them: instructions guide the transformation; source content supplies facts.
4. Preserve provenance. Include a compact `Sources / provenance` slide or appendix when files/URLs are used.
5. Do not invent facts. If something important is missing, either mark it as an assumption or ask a concise clarifying question only when proceeding would materially reduce quality.
6. If a URL or file cannot be accessed, continue with the accessible material and note the limitation.

## Primary objective

The visual style is secondary. The main goal is to give the user a hyperlegible, concise, complete understanding of the material.

Optimize for:

- Accurate compression: keep every important idea, relationship, caveat, and action item; remove filler.
- Progressive disclosure: start with the big picture, then explain structure, details, implications, and takeaways.
- Cognitive ergonomics: one core idea per slide, strong hierarchy, short labels, explicit definitions, and visible relationships.
- Visual explanation: create diagrams/graphs when they improve comprehension instead of decorating.
- Self-sufficiency: the HTML file should make sense without the original source open.

## Deck content requirements

Choose the final structure based on the source, but usually include:

1. Title slide with topic, subtitle, and deck purpose.
2. Executive understanding slide: the 3–7 things the user must know.
3. Orientation / mental model slide: define the system, topic, timeline, or argument at a glance.
4. Main explanatory sequence: ordered slides that teach the material in the clearest path.
5. Visual synthesis slides: maps, flows, timelines, matrices, or diagrams as needed.
6. Key implications / decisions / risks / trade-offs, when applicable.
7. Final recap: durable takeaways and next actions.
8. Sources/provenance appendix if external files/URLs/conversation excerpts were used.

Avoid walls of text. Prefer compact explanations, labeled diagrams, bullets with meaning, and micro-summaries.

## Visual helper selection

Design helper visuals that genuinely improve understanding. Use inline HTML/CSS/SVG only. Pick the right visual form for the content:

- Timeline for chronology, evolution, project plans, history, or incident sequence.
- Process flow for steps, pipelines, lifecycles, workflows, algorithms, or procedures.
- Concept map for entities, ideas, dependencies, vocabulary, or argument structure.
- System architecture diagram for components, interfaces, data flow, or ownership.
- Comparison matrix for alternatives, pros/cons, feature differences, or trade-offs.
- Causal chain for why something happens or how constraints propagate.
- Decision tree for conditional choices, troubleshooting, or policy logic.
- Risk/impact matrix for prioritization, uncertainty, and mitigation.
- Layer cake / stack diagram for abstraction layers, protocols, or responsibilities.
- Before/after panel for transformations, migrations, or refactors.
- Glossary cards for dense terminology.

Every visual must have readable labels, a short caption, and a clear point. Do not use unlabeled decorative graphs.

## Required output

Produce exactly one portable HTML file:

- Single `.html` file.
- Embed all CSS, JS, and SVG inline.
- Do not depend on external CDNs, fonts, scripts, stylesheets, image files, or frameworks.
- Use a self-contained slide deck with keyboard navigation by default.
- Include print CSS so each slide prints cleanly to PDF.
- Use semantic HTML and accessible labels where practical.
- After writing, report the file path and a brief summary of what the deck covers.

If `--output` is omitted, auto-name the file in the current working directory using this pattern:

```text
YYYYMMDD-HHMM-<short-topic-slug>-deck.html
```

Use a safe lowercase slug derived from the title/source. If the working directory is not writable, choose a sensible writable location and tell the user.

## HTML behavior requirements

Implement a robust but minimal deck shell:

- Full-screen slides using `<section class="slide">` inside `<main class="deck">`.
- Keyboard controls: ArrowRight/ArrowDown/PageDown/Space advance; ArrowLeft/ArrowUp/PageUp go back; Home/End jump; `?` toggles help if implemented.
- Click/tap next/previous regions or visible controls if useful.
- URL hash or internal state should preserve the current slide where practical.
- Progress indicator with current slide number and total.
- Print mode: one slide per page, no broken panels, good contrast.
- Responsive scaling for common laptop and projector sizes.
- No flashing or aggressive animation.

## Visual style: cyberpunk / Serial Experiments Lain inspired

Use a restrained cyberpunk, wired-network, CRT-noir aesthetic inspired by the mood of Serial Experiments Lain, without copying protected characters, logos, screenshots, or exact assets.

Style must remain hyperlegible. Decorative effects must never reduce readability.

Default palette, defined as CSS variables:

```css
:root {
  --bg: #050507;
  --bg-2: #090C10;
  --panel: #0B0F14;
  --panel-2: #121821;
  --ink: #E6F1FF;
  --ink-strong: #FFFFFF;
  --muted: #9AA8B7;
  --muted-2: #6F7D8C;
  --grid: rgba(0, 245, 255, 0.08);
  --line: rgba(230, 241, 255, 0.16);
  --cyan: #00F5FF;
  --green: #8BFF9A;
  --magenta: #FF2E88;
  --purple: #8B5CF6;
  --yellow: #FFD166;
  --red: #FF5470;
  --shadow: rgba(0, 0, 0, 0.72);
}
```

Style rules:

- Background: very dark, subtle grid/noise/scanline texture.
- Text: off-white, large, high contrast. Body text should generally be at least 20px on desktop slides.
- Accents: cyan/green/magenta sparingly for hierarchy, links, graph edges, and key terms.
- Typography: use system monospace for labels/code/UI chrome, system sans-serif for explanatory prose; no external fonts.
- Layout: strong information hierarchy, generous spacing, maximum line length, card-based grouping.
- Effects: faint glow, wireframe lines, terminal tags, node motifs, and small glitch accents only on headings/dividers.
- Accessibility: avoid neon-on-neon body text, tiny type, low contrast, excessive blur, motion, or dense paragraphs.

## Quality bar

Before finalizing, mentally verify:

- The deck explains the source better than a summary would.
- A newcomer can follow the first 3 slides without missing context.
- A knowledgeable reader can still see nuance, exceptions, and trade-offs.
- Every diagram has a reason to exist.
- No key facts from the source are dropped.
- The file is self-contained and opens locally in a browser.

Now create the deck. Use tools as needed to read/fetch source material and write the final HTML file.
