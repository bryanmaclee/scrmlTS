# Recon — Tailwind Arbitrary Values + Variant Prefixes (SPEC-ISSUE-012, items 1+2)

**Date:** 2026-04-29
**Scope:** Implementation surface for SPEC §26.3 items #1 (arbitrary values) and #2 (variant prefixes). Item #3 (custom theme) explicitly deferred.
**Mode:** RECON ONLY. No code changes. No commits.
**Target file:** `/home/bryan-maclee/scrmlMaster/scrmlTS/compiler/src/tailwind-classes.js` (753 LOC)

---

## 1. TL;DR

**Major reframe.** The audit (S48) and SPEC §26.3 are both **stale**. **Variant prefixes already ship.** The registry contains `RESPONSIVE_BREAKPOINTS`, `STATE_PSEUDO_CLASSES`, and a `parseClassName()` flow at `tailwind-classes.js:582-693`. Tests §13/§14/§15 in `compiler/tests/unit/tailwind-classes.test.js:451-540` cover responsive (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`), state (`hover:`, `focus:`, `active:`, `disabled:`), and stacked (`sm:hover:bg-blue-500`) prefixes. The compiled output of `examples/02-counter.scrml` confirms it: `.hover\:bg-red-600:hover { background-color: #dc2626 }` lands cleanly in `examples/dist/02-counter.css`.

**Real scope is therefore ~half what was assumed:**

| Feature | Audit says | Reality |
|---|---|---|
| Arbitrary values (`p-[1.5rem]`) | TBD | TBD — genuinely missing |
| Variant prefixes (`md:`, `hover:`) | TBD | **Already shipped** — partial registry, full pipeline, full tests |
| Custom theme | TBD | TBD — explicitly out-of-scope per user direction |

**Recommended sequencing:** **Single fix agent, two commits.** Commit A = arbitrary values + tests + SPEC amendment. Commit B = variant-registry expansion (`focus-within:`, `focus-visible:`, `dark:`, `first:`, `last:`, `odd:`, `even:`, `visited:` are all in `STATE_PSEUDO_CLASSES` map but **untested** — verify they land correctly; add `group-hover:` / `peer-hover:` if desired) + arbitrary-value × variant cross-tests. **Estimate: 250–400 LOC implementation, 30–50 new tests, 12–20 SPEC lines amended, 4–8 hours.** Tier T2 (single agent, well-scoped, no architectural debate needed).

**Open questions: 4** (call out below). Trade-off matrix on `bg-[url(...)]` scope, validation strictness, breakpoint configurability deferred to item #3, and `group-*` / `peer-*` parent-state inclusion.

---

## 2. Current registry shape

### 2.1 SPACING_SCALE (`tailwind-classes.js:18-54`)

37 keys. Mix of numeric scale, fractional, special.

```
Keys: 0, px, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12,
      14, 16, 20, 24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 96
```

Range: `0px` → `24rem` (96 = 24rem). Standard Tailwind v3 scale.

### 2.2 COLOR_PALETTE (`tailwind-classes.js:62-81`)

18 named colors × 11 shades = **198 (color, shade) tuples**.

```
Colors: slate, gray, red, orange, amber, yellow, green, emerald, teal, cyan,
        sky, blue, indigo, violet, purple, fuchsia, pink, rose
Shades: 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950
```

Plus special tokens `white`, `black`, `transparent` registered separately.

### 2.3 PADDING_MAP / MARGIN_MAP generation (`tailwind-classes.js:94-151`)

Pattern: each prefix × each scale entry → registered className → CSS rule string.

| Prefix | Property |
|---|---|
| p, m | shorthand |
| px/py, mx/my | left+right or top+bottom |
| pt/pr/pb/pl, mt/mr/mb/ml | single side |

`m-auto`, `mx-auto`, `my-auto`, etc. registered as `margin: auto`.

`space-x-*` / `space-y-*` use the `> :not([hidden]) ~ :not([hidden])` adjacent-sibling pattern.

### 2.4 Other utility groups present

| Group | Function | Coverage |
|---|---|---|
| Sizing | `registerSizing()` 199 | w-*, h-*, min-w-*, min-h-*, max-w-*, max-h-*, fractions (`1/2`, `1/3`...), `full`, `screen`, `auto`, `min`, `max`, `fit`. max-w breakpoints `xs`–`7xl`. |
| Flexbox | `registerFlexbox()` 228 | `flex`, `inline-flex`, direction, wrap, items-*, justify-*, gap-*, gap-x/y, flex-1/auto/none/initial, grow/shrink |
| Grid | `registerGrid()` 269 | `grid`, `inline-grid`, `grid-cols-1` to `grid-cols-12` + `none`, `grid-rows-1` to `grid-rows-6` + `none`, `col-span-1`–`col-span-12` + `full`, `row-span-1`–`row-span-6` + `full` |
| Typography | `registerTypography()` 302 | `text-xs`–`text-9xl` (size+lh), font-thin–font-black, text-left/center/right/justify, leading-*, tracking-*, transforms (uppercase/lowercase/capitalize), `truncate`, whitespace-*, `italic`/`not-italic`, decoration |
| Colors | `registerColors()` 398 | `text-{color}-{50..950}`, `bg-{color}-{50..950}`, plus white/black/transparent for both |
| Borders | `registerBorders()` 421 | border (1px default), border-0/2/4/8, border-t/r/b/l-*, `border-{color}-{shade}`, solid/dashed/dotted/none, rounded sizes (none/sm/md/lg/xl/2xl/3xl/full) per side |
| Effects | `registerEffects()` 484 | shadow (sm/empty/md/lg/xl/2xl/inner/none), opacity (0–100 in 5/10/15-step) |
| Layout | `registerLayout()` 511 | display (block/inline/inline-block/hidden/table/table-row/table-cell), position (static/relative/absolute/fixed/sticky), overflow (auto/hidden/visible/scroll/clip × axis), inset/top/right/bottom/left + auto/full, z-0/10/20/30/40/50/auto, object-* (4 values), cursor-* (4 values), pointer-events-* (2), select-* (4) |

### 2.5 Variant infrastructure (`tailwind-classes.js:580-606`) — **already shipped**

```js
const RESPONSIVE_BREAKPOINTS = { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", 2xl: "1536px" };

const STATE_PSEUDO_CLASSES = {
  hover, focus, active, disabled, first (->first-child), last (->last-child),
  odd (->nth-child(odd)), even (->nth-child(even)), visited,
  focus-within, focus-visible
};
```

11 state pseudo-classes, 5 breakpoints. **Wires into the lookup pipeline** at `parseClassName()` 631 → `getTailwindCSS()` 659.

### 2.6 `getTailwindCSS(className)` API (`tailwind-classes.js:659-693`)

Input: `string` (a single utility class name, e.g. `"sm:hover:bg-blue-500"`).
Output: `string | null` (CSS rule or null if unrecognized).

Pipeline:

1. `parseClassName(className)` → `{ responsive: "sm" | null, state: "hover" | null, base: "bg-blue-500" }`.
2. `registry.get(base)` → base CSS rule or `null` (return null).
3. If no prefixes, return base rule as-is.
4. Extract declaration body via regex `^(\.[^\s{]+)\s*\{(.+)\}$/s`.
5. Build escaped-name selector `\.${escapeCssClass(className)}` (escape via `escapeCssClass` 617).
6. Append `:${pseudo}` if state present.
7. Wrap in `@media (min-width: ${bp}) {...}` if responsive present.

### 2.7 `getAllUsedCSS(classNames[])` (`tailwind-classes.js:702-716`)

Iterates dedup'd, calls `getTailwindCSS`, joins with `\n`. Unknown silently dropped.

### 2.8 `scanClassesFromHtml(html)` (`tailwind-classes.js:724-739`)

Regex `\bclass="([^"]*)"/g` → split on `\s+`. **Does NOT match arbitrary-value syntax robustly today** — works because `[` and `]` are not special inside double-quoted attr values. The split-on-whitespace approach captures `p-[1.5rem]` as a single token correctly. Whitespace inside brackets (`[1.5 rem]`) **would break** the splitter.

### 2.9 Call sites

| File | Line | Use |
|---|---|---|
| `compiler/src/codegen/index.ts` | 20 | imports `scanClassesFromHtml`, `getAllUsedCSS` |
| `compiler/src/codegen/index.ts` | 477-478 | `usedClasses = scanClassesFromHtml(htmlBody)` then `tailwindCss = getAllUsedCSS(usedClasses)` |
| `compiler/src/codegen/ir.ts` | 29, 71 | `CssIR.tailwindCss: string` field |

Only one call site. Clean integration boundary.

---

## 3. Arbitrary values — implementation surface (Feature 1)

### 3.1 Class-name detection — syntax

Standard Tailwind: `<utility-prefix>-[<value>]`. Examples: `p-[1.5rem]`, `bg-[#ff00ff]`, `w-[42px]`, `text-[14px]`, `top-[3.5%]`, `gap-[2.4rem]`, `text-[var(--my-color)]`, `bg-[url(/foo.png)]`.

**Recommended detection:** A separate parsing branch in `parseClassName()` (or a new `parseArbitraryValue()`) that runs **before** registry lookup. Match shape:

```
^([a-z]+(?:-[a-z]+)*)-\[(.+)\]$
```

Anchor on `]` at end. `value` group can contain anything that's not the closing `]`, including `()`, `#`, `,`, `.`, `/`, `:`, etc. Non-greedy or greedy depending on whether nested `]` is allowed (Tailwind disallows it). Recommended: greedy + last `]` anchored.

### 3.2 Utility prefixes that should accept arbitrary values

From the registry, the following take a numeric/scaled "value" trailing component and are natural arbitrary-value candidates:

| Category | Prefixes | Property to emit |
|---|---|---|
| Spacing | `p`, `px`, `py`, `pt`, `pr`, `pb`, `pl`, `m`, `mx`, `my`, `mt`, `mr`, `mb`, `ml`, `gap`, `gap-x`, `gap-y`, `space-x`, `space-y` | padding/margin/gap |
| Sizing | `w`, `h`, `min-w`, `max-w`, `min-h`, `max-h` | width/height |
| Position | `top`, `right`, `bottom`, `left`, `inset` | top/right/bottom/left/inset |
| Typography | `text` (size when bracketed; ambiguous with text color — see 3.6), `leading`, `tracking` | font-size, line-height, letter-spacing |
| Color | `text` (color), `bg`, `border` | color, background-color, border-color |
| Border | `border` (width when number; color when hex), `rounded`, `rounded-t/r/b/l` | border-width, border-radius |
| Effects | `shadow` (passes through to box-shadow), `opacity` | box-shadow, opacity |
| Layout | `z` (z-index) | z-index |
| Transform `[INFERRED]` | `translate-x`, `translate-y`, `scale`, `rotate`, `skew-x`, `skew-y` — **NOT in current registry** | transform components |

**Total prefix surface: ~30 prefixes.** Not all of them are independently obvious; a single prefix-to-property table mirroring the existing `PADDING_MAP` / `MARGIN_MAP` shape is the natural representation.

### 3.3 Value validation — strict vs verbatim pass-through

**Recommended: verbatim pass-through with one safety check.**

- Pro of verbatim: simplest, matches Tailwind's actual behavior, supports any future CSS.
- Con: `p-[blue]` would emit `padding: blue`, which is broken CSS but harmless (browser ignores).
- **Light validation:** reject only obvious shape violations: unbalanced parens, `<`, `>`, `;`, `{`, `}` (CSS-injection / context-escape risks). Whitelist anything else.

If the W-TAILWIND-001 warning agent (Option 5) is shipping concurrently, validation is **post-hoc** anyway: an obviously-broken value still gets warned.

### 3.4 CSS emission shape

Tailwind's standard:

```css
.p-\[1\.5rem\] { padding: 1.5rem }
.bg-\[\#ff00ff\] { background-color: #ff00ff }
.text-\[14px\] { font-size: 14px }
```

Selector escapes via existing `escapeCssClass()` at 617. **`escapeCssClass` already handles `[`, `]`, `.`, `#`, `(`, `)`, `\`, `/`, `:`, `%`** (line 618). One concern: it does **not** escape `,`, `<space>`, `+`, `*` — verify via spot check. For typical arbitrary values (`1.5rem`, `#ff00ff`, `42px`), the existing escape is sufficient.

### 3.5 Edge cases

| Case | Concern | Mitigation |
|---|---|---|
| `bg-[url(/foo.png)]` | Embedded `()` and `/` in selector | `escapeCssClass` already escapes `(`, `)`, `/`. Verify by emitting + parsing back. |
| `text-[var(--my-var)]` | `var(--name)` — `(`, `)`, `-`, `-` all in selector | Should work; `-` is safe in CSS identifiers. |
| `bg-[rgb(255,0,0)]` | Embedded `,` | **`,` is NOT in `escapeCssClass`'s regex.** Gap: comma in selector requires escape (`\,`) or it's a selector-list separator. **Action: extend `escapeCssClass` to include `,` and `<space>` (`\s`).** |
| `w-[calc(100%-2rem)]` | Embedded ` ` (space) | Whitespace inside `[]` breaks `scanClassesFromHtml` split. **Tailwind disallows raw spaces; users write `w-[calc(100%-2rem)]` with no spaces.** Document this as a normative constraint. |
| Nested `[` | `bg-[hsl(120,100%,50%)]` no nesting; `bg-[[data-foo]]` — invalid Tailwind | Reject (regex won't match). |
| `before:content-['hello']` | Quoted strings inside arbitrary values | Out of scope for v1 (no `before:`/`after:` pseudo-element variants in registry yet). |
| `bg-[#fff]` (3-digit hex) | `#`, `f`, `f`, `f` | Standard, `escapeCssClass` handles `#`. |
| `top-[-10px]` | Negative leading dash | `escapeCssClass` doesn't escape `-`; CSS allows `-` at start of property values; should work. Selector `top-\[-10px\]` is valid. |

### 3.6 Ambiguity: `text-[14px]` vs `text-[#ff00ff]`

`text` is overloaded (size + color). **Detection rule:** parse the bracketed value:
- Starts with `#` or named color → `color` property
- Matches `\d+(\.\d+)?(px|rem|em|%)` → `font-size` property
- Starts with `var(` → emit as `font-size` (default; users use `text-[var(--text-size)]` more often than `text-[var(--color)]`); document explicitly. **Open question for user.**

Same ambiguity exists for `border-[2px]` (width) vs `border-[#ccc]` (color). Same heuristic applies.

### 3.7 Estimated LOC

| Area | LOC |
|---|---|
| Prefix-to-property registry table | 30–50 |
| `parseArbitraryValue()` function | 25–40 |
| Modified `getTailwindCSS()` flow integration | 10–20 |
| `escapeCssClass()` extension (`,`, `\s`) | 1 line |
| Color/size disambiguation logic for `text-`, `border-` | 15–25 |
| **Implementation total** | **80–135 LOC** |
| Tests (target 25–30 cases) | 100–150 LOC |
| **Feature 1 total** | **~180–285 LOC** |

---

## 4. Variant prefixes — implementation surface (Feature 2)

### 4.1 Critical reframe

**Variant prefixes ALREADY SHIP.** Confirmed via:

1. `tailwind-classes.js:582-606` registers `RESPONSIVE_BREAKPOINTS` (5 keys) and `STATE_PSEUDO_CLASSES` (11 keys).
2. `parseClassName()` 631 splits on `:` and assigns prefixes.
3. `getTailwindCSS()` 659 wraps the rule in pseudo + media as needed.
4. `compiler/tests/unit/tailwind-classes.test.js:451-540` — sections §13 (responsive), §14 (state), §15 (combined responsive+state).
5. `examples/dist/02-counter.css` shows live emission: `.hover\:bg-red-600:hover { background-color: #dc2626 }`.

The audit `language-status-audit-2026-04-29.md:182` ("Tailwind variant prefixes (`md:`, `hover:`) ❌") is **wrong/stale**. SPEC §26.3:11642 is also stale — variants are no longer "TBD"; they ship. The original SPEC-ISSUE-012 framing predates the variant work.

### 4.2 Audit truth-table

| Prefix | In `STATE_PSEUDO_CLASSES`? | Tested? | Confidence |
|---|---|---|---|
| `hover:` | ✅ | ✅ §14 | Lands |
| `focus:` | ✅ | ✅ §14 | Lands |
| `active:` | ✅ | ✅ §14 | Lands |
| `disabled:` | ✅ | ✅ §14 | Lands |
| `first:` | ✅ | ❌ untested | Should land — verify |
| `last:` | ✅ | ❌ untested | Should land — verify |
| `odd:` | ✅ | ❌ untested | Should land — verify |
| `even:` | ✅ | ❌ untested | Should land — verify |
| `visited:` | ✅ | ❌ untested | Should land — verify |
| `focus-within:` | ✅ | ❌ untested | Should land — verify |
| `focus-visible:` | ✅ | ❌ untested | Should land — verify |
| `sm:` | ✅ | ✅ §13 | Lands |
| `md:` | ✅ | ✅ §13 | Lands |
| `lg:` | ✅ | ✅ §13 | Lands |
| `xl:` | ✅ | ✅ §13 | Lands |
| `2xl:` | ✅ | ✅ §13 | Lands |
| `dark:` | ❌ | ❌ | **Missing** — needs `@media (prefers-color-scheme: dark)` |
| `group-hover:` | ❌ | ❌ | **Missing** — needs `.group:hover .{cls}` selector |
| `peer-hover:` | ❌ | ❌ | **Missing** — needs `.peer:hover ~ .{cls}` |
| `print:` | ❌ | ❌ | **Missing** — needs `@media print` |
| `motion-safe:` / `motion-reduce:` | ❌ | ❌ | **Missing** — needs `@media (prefers-reduced-motion: ...)` |
| `before:` / `after:` | ❌ | ❌ | **Missing** — pseudo-elements; require `content` property handling |

### 4.3 Variant work that's actually missing

**Tier A (small, low-risk):**

1. **Test the 7 untested state pseudo-classes** (`first`/`last`/`odd`/`even`/`visited`/`focus-within`/`focus-visible`). Likely all already work because `STATE_PSEUDO_CLASSES` is consulted uniformly. Target 7–10 tests.
2. **Add `dark:` variant.** Wrap in `@media (prefers-color-scheme: dark)`. Add `DARK_MODE_VARIANT` constant. Modify `parseClassName` and `getTailwindCSS` to accept dark as a fourth dimension or recognize as an alternate "responsive-like" wrapper. ~15–25 LOC.
3. **Add `print:` variant.** Same shape as dark, wrap in `@media print`. ~10 LOC.

**Tier B (medium):**

4. **Add `group-*` and `peer-*` variants.** Selector becomes `.group:hover .group-hover\:bg-blue-500` (for group-hover). Requires:
   - Parser change: detect `group-<state>:` and `peer-<state>:` prefixes.
   - Selector wrapper: prepend ancestor / sibling selector.
   - Special `group` and `peer` classes must also be registered as identity rules (or pass-through).
   - ~30–50 LOC + tests.
5. **`motion-safe:` / `motion-reduce:` variants.** Same shape as dark/print. ~10–15 LOC.

**Tier C (defer — significant scope):**

6. `before:` / `after:` pseudo-element variants. Require pseudo-element selector + auto-`content: ""` injection. Out of scope for this implementation; flag for future work.

### 4.4 Stacking — already works for responsive+state

Tested at §15: `sm:hover:bg-blue-500` correctly emits both. Order-handling in `parseClassName`:

```js
for (let i = 0; i < parts.length - 1; i++) {
  const prefix = parts[i];
  if (RESPONSIVE_BREAKPOINTS[prefix]) responsive = prefix;
  else if (STATE_PSEUDO_CLASSES[prefix]) state = prefix;
}
```

**Limitation:** Only ONE responsive and ONE state per chain. `md:dark:hover:p-4` would only set state=hover, with no slot for dark or for combining md+dark. Adding `dark:` requires extending this. **Architectural decision needed: single-bucket-per-dimension (current) vs ordered-list-of-modifiers (more general).** Recommend: ordered-list approach for clean future expansion. ~20 LOC refactor of `parseClassName`.

### 4.5 Open architectural Q: variant table vs per-prefix code

Current code mixes both:

- `STATE_PSEUDO_CLASSES` is a **table** (good).
- `RESPONSIVE_BREAKPOINTS` is a **table** (good).
- The wrapping/emission logic in `getTailwindCSS()` is **per-shape** (responsive → `@media`, state → `:pseudo`).

For `dark:`, `print:`, `motion-*:`, the natural pattern is: each variant carries a `wrapKind` (`pseudo`, `media`, `combinator`) and a `wrapValue`. This unifies. **Recommend: single `VARIANT_REGISTRY` table** keyed by prefix, with `{ kind: "media" | "pseudo" | "combinator", value: string }`. Refactors current code without behavior change, then extending is just a row-add.

### 4.6 Estimated LOC

| Area | LOC |
|---|---|
| Tests for 7 already-mapped state pseudo-classes | 50 |
| `dark:` variant | 15–25 |
| `print:`, `motion-*:` variants | 20–30 |
| `group-*` / `peer-*` variants | 30–50 |
| Variant-registry refactor (optional, recommended) | 30 |
| Multi-modifier ordered-list parser | 20 |
| Tests for new variants | 60–80 |
| **Feature 2 total** | **~225–285 LOC** |

---

## 5. Cross-feature interaction

### 5.1 `md:p-[1.5rem]` — variant + arbitrary

If `parseClassName` is fixed first (split prefixes, last segment is the base), then arbitrary-value detection runs **on the base** (`p-[1.5rem]`). The variant wrapping then wraps the arbitrary-value rule. **No special integration logic needed if both features share the existing pipeline.**

Implementation order:

1. **Arbitrary values first.** Cheaper, fewer dependencies, no architectural choices. Adds parsing branch that runs after `parts.length - 1` is identified as the base.
2. **Variants second.** Refactor variant registry, add `dark:` / `print:` / `group-*`. Cross-tests validate `md:p-[1.5rem]`, `dark:hover:bg-[#fff]`, etc.

### 5.2 Integration test cases

| Test | Expected |
|---|---|
| `p-[1.5rem]` | `.p-\[1\.5rem\] { padding: 1.5rem }` |
| `md:p-[1.5rem]` | `@media (min-width: 768px) { .md\:p-\[1\.5rem\] { padding: 1.5rem } }` |
| `hover:bg-[#ff00ff]` | `.hover\:bg-\[\#ff00ff\]:hover { background-color: #ff00ff }` |
| `md:hover:bg-[#ff00ff]` | `@media (min-width: 768px) { .md\:hover\:bg-\[\#ff00ff\]:hover { background-color: #ff00ff } }` |
| `dark:bg-[#000]` | `@media (prefers-color-scheme: dark) { .dark\:bg-\[\#000\] { background-color: #000 } }` |

---

## 6. Test inventory — existing tests + how they react

`compiler/tests/unit/tailwind-classes.test.js` (621 LOC, 83 `test()` blocks across 18 sections).

| Section | Title | Risk after changes |
|---|---|---|
| §1 | Known utility classes | None — present classes unchanged |
| §2 | Unknown classes return null | **Sensitive.** `not-a-tailwind-class` should still return `null` after arbitrary-value parsing. Verify the regex doesn't mis-match. |
| §3 | getAllUsedCSS combines | None |
| §4 | Spacing (p/m/space) | None |
| §5 | Sizing (w/h/min/max) | None |
| §6 | Flexbox | None |
| §7 | Grid | None |
| §8 | Typography | **Mild** — `text-` overloaded; arbitrary-value branch must not hijack `text-xs` etc. |
| §9 | Colors (text-, bg-, border-) | **Mild** — same overload concern. |
| §10 | Borders | None |
| §11 | Effects (shadow, opacity) | None |
| §12 | Layout (display, position, overflow, z-index, top/right/bottom/left) | None |
| §13 | Responsive prefixes (sm/md/lg/xl/2xl) | None — unchanged |
| §14 | State prefixes (hover/focus/active/disabled) | None |
| §15 | Combined responsive + state | None |
| §16 | scanClassesFromHtml | **Mild** — regex/splitter must still capture arbitrary-value class names like `p-[1.5rem]`. Already does because brackets aren't in the split-pattern, but verify. |
| §17 | Deduplication | None |
| §18 | Edge cases (null, undefined, p-px) | None |

**Other tests touching tailwind output** (search via grep): only `tailwind-classes.test.js` has direct asserts. No other test file imports `tailwind-classes` or asserts on the `tailwindCss` field of `CssIR`. Integration tests at `compiler/tests/integration/` do not exercise the tailwind output specifically.

**Conclusion:** zero existing tests would break **if** the new parsing branches run AFTER registry lookup (so misses fall through to the new branch, not the other way around). Recommended order: lookup first, then arbitrary parse, then null.

---

## 7. SPEC amendment shape

Current §26.3 (lines 11639–11643):

```
### 26.3 Open Items

- Arbitrary values (e.g., `p-[1.5rem]`) — TBD (SPEC-ISSUE-012)
- Responsive and variant prefixes (e.g., `md:`, `hover:`) — TBD (SPEC-ISSUE-012)
- Custom theme configuration — TBD (SPEC-ISSUE-012)
```

### 7.1 Recommended replacement

```
### 26.3 Variant Prefixes

The compiler SHALL recognize the following variant prefixes on Tailwind utility class names:

| Prefix | Wrapping |
|---|---|
| `sm:`, `md:`, `lg:`, `xl:`, `2xl:` | `@media (min-width: <breakpoint>)` |
| `hover:`, `focus:`, `active:`, `disabled:`, `visited:` | `:pseudo` selector |
| `first:`, `last:`, `odd:`, `even:` | `:nth-child` selectors |
| `focus-within:`, `focus-visible:` | `:focus-within` / `:focus-visible` |
| `dark:` | `@media (prefers-color-scheme: dark)` |
| `print:` | `@media print` |
| `motion-safe:`, `motion-reduce:` | `@media (prefers-reduced-motion: ...)` |
| `group-hover:`, `group-focus:` | `.group:hover .<class>`, `.group:focus .<class>` |
| `peer-hover:`, `peer-focus:` | `.peer:hover ~ .<class>`, `.peer:focus ~ .<class>` |

Stacking is permitted (e.g., `md:hover:bg-blue-500`). Stacked prefixes SHALL nest in the order: combinator (group/peer) → media → pseudo.

Breakpoint values for v1 are fixed to Tailwind v3 defaults (640/768/1024/1280/1536px). Custom breakpoints are deferred (SPEC-ISSUE-012).

### 26.4 Arbitrary Values

The compiler SHALL recognize bracketed-value syntax `<utility-prefix>-[<value>]` for the following utility prefixes:

- Spacing: p, px, py, pt, pr, pb, pl, m, mx, my, mt, mr, mb, ml, gap, gap-x, gap-y, space-x, space-y
- Sizing: w, h, min-w, max-w, min-h, max-h
- Position: top, right, bottom, left, inset
- Color (text-, bg-, border-): hex, rgb, rgba, hsl, named, var()
- Typography: text (font-size variant), leading, tracking
- Effects: opacity, shadow
- Layout: z

`<value>` SHALL be passed through verbatim as the CSS property value, with the surrounding `[` and `]` removed. The class-name selector SHALL be CSS-escaped per CSS spec (Section 26.5).

`<value>` MUST NOT contain unescaped whitespace or unbalanced parens. Bracketed values containing `<`, `>`, `;`, `{`, `}` SHALL be rejected.

For overloaded prefixes (`text-`, `border-`), value disambiguation is heuristic:
- Starts with `#`, `rgb(`, `rgba(`, `hsl(` → color
- Matches `<number><unit>` (`px`, `rem`, `em`, `%`) → size
- Starts with `var(` → defaults to size (font-size for `text-`, border-width for `border-`).

### 26.5 Open Items

- Custom theme configuration — TBD (SPEC-ISSUE-012)
- Custom breakpoints — TBD (SPEC-ISSUE-012)
- `before:` / `after:` pseudo-element variants — TBD (SPEC-ISSUE-012)
- Container queries (`@container`) — TBD
```

**Net SPEC delta:** −5 lines (replaced 5 line block) + ~50 lines = **+45 lines**.

---

## 8. Sample-suite impact

Verified via `grep -rEn 'class="[^"]*[a-z]+:[a-z]'` and `'class="[^"]*\['` across `examples/` and `samples/`.

### 8.1 Variant-prefix usage

| Sample | Prefix usage | Currently working? |
|---|---|---|
| `examples/02-counter.scrml` | `hover:bg-red-600`, `hover:bg-gray-300`, `hover:bg-green-600` | YES (verified in `examples/dist/02-counter.css:21,23,25`) |
| `examples/09-error-handling.scrml` | `hover:bg-gray-700` | YES |
| `examples/10-inline-tests.scrml` | `hover:bg-gray-100` | YES |
| `examples/13-worker.scrml` | `hover:bg-gray-700` | YES |

**No sample currently uses `dark:`, `group-*`, `peer-*`, `print:`, or stacked variants beyond `sm:hover:`.** Risk of accidentally activating broken samples: zero.

### 8.2 Arbitrary-value usage

**Zero usage** in the entire sample/example tree. No file matches `class="[^"]*\[`. No silently-dropped Tailwind today.

After implementation, the new `examples/02-counter.scrml`-style code would be valid and any user adding `p-[1.5rem]` would get correct CSS. No retroactive sample-suite breakage.

### 8.3 Recommendation

After Feature 1 (arbitrary values), add **one new sample** demonstrating arbitrary values + variants, e.g., `examples/N-tailwind-arbitrary.scrml`. Or extend `02-counter.scrml` with a `p-[1.5rem]` sample button. Snapshot test against the resulting `examples/dist/N-tailwind-arbitrary.css`.

---

## 9. W-TAILWIND-001 interaction

Concurrent fix agent ships W-TAILWIND-001 (Option 5) — emits warning when a tailwind-shaped class fails registry lookup.

### 9.1 Sync mechanism

Best architecture: the warning rule runs **after** `getTailwindCSS()` returns null, not before. Concretely, `scanClassesFromHtml(html)` returns the class list; `getAllUsedCSS()` filters out unrecognized; `[INFERRED]` Option 5 likely adds a sibling function `validateTailwindShape(className)` or extends `getAllUsedCSS()` to also return a `unrecognized: string[]`.

After Option 3 (this work) lands, the unrecognized set will naturally shrink. The warning rule does not need a separate detection layer — it just calls `getTailwindCSS()` and warns if `null`. **Auto-narrowing.**

### 9.2 If Option 5 hardcodes shape detection

If Option 5 ships a separate regex (e.g., `^[a-z]+(?:-[a-z]+)*-(0|px|0\.5|1|...)$`) for warn detection, it will warn on now-valid arbitrary values like `p-[1.5rem]` after Option 3 lands. **Recommendation in Option 5 implementation:** the warn rule MUST use `getTailwindCSS(cls) === null` as the signal, not a separate shape regex. If Option 5 uses a regex, then this recon's Phase 2 must also update Option 5's regex.

### 9.3 Recommended sequencing with Option 5

| Order | Pro | Con |
|---|---|---|
| Option 5 first → Option 3 second | Users get warnings for unsupported syntax today; gradually warnings disappear as Option 3 lands | If Option 5 uses regex shape-detection, must update twice |
| Option 3 first → Option 5 second | Option 5 sees the post-expansion `getTailwindCSS()`, naturally narrow | Users see no signal for unsupported syntax during Option 3 dev |

**Both viable.** If Option 5 already started, recommend it use the `getTailwindCSS() === null` signal and not a regex. If it must use a regex, the regex should match the old narrow set, and Option 3 must include a step to update Option 5's regex on completion.

---

## 10. Sequencing recommendation

**Recommendation: 2 commits, 1 fix agent, T2 pipeline.**

### 10.1 Commit A — Arbitrary values

| Item | Detail |
|---|---|
| File touches | `compiler/src/tailwind-classes.js` (~80–135 LOC), `compiler/tests/unit/tailwind-classes.test.js` (+25–30 tests, ~150 LOC), `compiler/SPEC.md` (replace §26.3 with new §26.4 + retitle §26.3 to "Variant Prefixes" — ~30 lines) |
| Test surface | New §19 in tailwind tests covering arbitrary values: spacing, sizing, color, position, font-size, ambiguity (text-, border-) |
| Risk | Low — new branch added, existing branches unchanged, registry untouched |
| Independent? | Yes — does not depend on Commit B |

### 10.2 Commit B — Variant expansion + cross-feature

| Item | Detail |
|---|---|
| File touches | `compiler/src/tailwind-classes.js` (~100–200 LOC: variant-registry refactor, dark/print/motion variants, optional group/peer), `compiler/tests/unit/tailwind-classes.test.js` (+30–40 tests, ~200 LOC), `compiler/SPEC.md` (extend §26.3 — ~15 lines), one new sample |
| Test surface | Untested state pseudo-classes (first/last/odd/even/visited/focus-within/focus-visible); dark, print, motion variants; group-*, peer-* if included; cross-tests `md:p-[1.5rem]`, `dark:hover:bg-[#fff]` |
| Risk | Medium — variant-registry refactor changes the parser, must preserve all 83 existing test passes |
| Independent? | Soft-depends on Commit A for cross-tests |

### 10.3 Why not single commit?

- Commit A is shippable on its own with zero variant work — gives users the most-visible new capability fastest.
- Commit B includes a parser refactor that would muddy a single combined commit's diff and review.
- Two-commit phasing aligns with crash-recovery doctrine (incremental commits, recoverable WIP).

### 10.4 Why not 5-commit phasing?

- Each commit must be independently reviewable, testable, shippable.
- 5 sub-commits would over-fragment: e.g., "register `dark:`" is 15 LOC + 3 tests — too small to commit standalone.
- 2-commit balance is optimal: meaningful chunks, recoverable, reviewable.

### 10.5 Pipeline tier — T2

- Single agent. No architecture debate needed (variant-registry refactor is a clear improvement, no philosophical disagreement).
- Well-bounded surface (one file, one test file, one spec section).
- Zero risk to other compiler subsystems (clean boundary at `getAllUsedCSS()` / `scanClassesFromHtml()`).
- Estimated 4–8 hours total. Not pipeline T3 (no debate) or T1 (no precursor work).

---

## 11. Risk inventory

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| `escapeCssClass` doesn't escape `,` or whitespace; arbitrary values like `bg-[rgb(255,0,0)]` produce broken selectors | Medium | Selector silently invalid; no warning | Extend regex to include `,` and `\s`. Add tests for comma-bearing values. |
| Arbitrary-value regex over-matches a regular utility (`text-xs` accidentally treated as arbitrary) | Low | Lookup fallthrough returns wrong rule | Run registry lookup FIRST, arbitrary parse SECOND; existing class names unchanged |
| `text-[14px]` vs `text-[#ff]` ambiguity → wrong property emitted | Medium | Color shows as font-size or vice versa | Heuristic per 3.6; document explicitly; tests for each path |
| `dark:` introduces second media-query slot, but `parseClassName` only has one `responsive` field | High (if not refactored) | Breaks `md:dark:hover:p-4` | Refactor parser to ordered-list of modifiers per 4.5 |
| Variant-registry refactor breaks one of the 83 existing tests | Medium | Regression | Run all 83 tests after refactor; CI gate before commit |
| `scanClassesFromHtml` regex breaks on arbitrary values with whitespace | Low (Tailwind disallows whitespace inside `[]`) | Class never extracted | Document constraint; add boundary test |
| Stacked variant order mismatch — user expects `hover:md:` but compiler only handles `md:hover:` | Low | Selector emits in wrong wrap order | Tailwind allows both orders; parser already iterates both `parts[0..n-1]` independent of order. Verify. |
| `bg-[url(...)]` URL contains `/`, parens, dots — selector escape coverage gap | Low (handled by escapeCssClass) | Invalid selector | Spot-check; add test |
| W-TAILWIND-001 (Option 5) regex predates this work, doesn't re-narrow after Option 3 lands | Medium | False-positive warnings on now-valid syntax | Coordinate via 9.2: Option 5 should use `getTailwindCSS()===null` signal |
| `parseClassName` performance on every class lookup (regex compile) | Very low | Microseconds slower per class | Pre-compile regex at module init |
| User SPEC §26.3 expectation drift — they think variants are TBD, will be surprised the work is half-done | High (already happening per audit) | Communication / expectation issue | Lead recon with reframe; update SPEC §26.3 explicitly stating what's already shipped |

---

## 12. Open questions for user

### Q1 — Scope of arbitrary values for `bg-[url(...)]`?

Tailwind supports `bg-[url(/foo.png)]` to set `background-image`. But our `bg-` prefix in the registry maps to `background-color`. Which property gets set when the value is `url(...)`?

**Options:**
- (a) Heuristic: `url(` → `background-image`, anything else → `background-color`.
- (b) Restrict v1 to `background-color` only; reject `bg-[url(...)]` with diagnostic.
- (c) Defer `bg-[url(...)]` to next pass.

**Recommendation: (b) or (c).** Simpler. Users who need `background-image` can still inline-CSS via `#{}`.

### Q2 — Validation strictness for arbitrary values?

Two options:

- (a) Verbatim pass-through with shape-only safety (reject `<`, `>`, `;`, `{`, `}`).
- (b) Per-property validation (e.g., `p-[blue]` rejected because padding doesn't accept `blue`).

**Recommendation: (a).** Matches Tailwind's actual behavior; keeps implementation simple; bad values produce harmless invalid CSS that the browser ignores.

### Q3 — Custom breakpoints in v1?

§26.3 says custom theme is deferred. But specifically: should v1 hardcode the 5 Tailwind breakpoints (640/768/1024/1280/1536), or expose a config knob?

**Recommendation: hardcode in v1.** Adding configurability is custom-theme work and out of scope. Document the hardcoded values explicitly in SPEC §26.3.

### Q4 — `group-*` and `peer-*` in v1 or defer?

These require:
- A `.group` and `.peer` class to be registered as identity rules
- The selector becomes `.group:hover .group-hover\:bg-blue-500` (parent-state) or `.peer:hover ~ .peer-hover\:bg-blue-500` (sibling-state)

Adds 30–50 LOC + tests + doc burden.

**Recommendation: defer to a follow-up** unless user wants the maximalist v1. Cleaner Commit B without them. Add to SPEC §26.5 Open Items.

---

## 13. Estimated commit shape

### Commit A — Arbitrary values

| File | Action | LOC delta |
|---|---|---|
| `compiler/src/tailwind-classes.js` | Add `parseArbitraryValue()`, prefix→property table, integrate into `getTailwindCSS()`, extend `escapeCssClass` regex | +95 |
| `compiler/tests/unit/tailwind-classes.test.js` | Add §19 (arbitrary values: spacing, sizing, color, font-size, position, ambiguity, edge-cases) | +130 |
| `compiler/SPEC.md` | Replace §26.3 with §26.3 (Variant Prefixes — describing existing variant work) + new §26.4 (Arbitrary Values) + new §26.5 (Open Items) | +30, −5 |
| `examples/N-tailwind-arbitrary.scrml` (new sample, optional) | Demo arbitrary values | +15 |
| `examples/dist/N-tailwind-arbitrary.css` (auto-generated) | — | (auto) |

**Total: ~+265 LOC, 25–30 new tests, 1 new SPEC section, 1 new sample.**

### Commit B — Variant expansion

| File | Action | LOC delta |
|---|---|---|
| `compiler/src/tailwind-classes.js` | Refactor variant infrastructure into single `VARIANT_REGISTRY` table; add `dark:`, `print:`, `motion-safe:`, `motion-reduce:` rows; refactor `parseClassName` to ordered-modifier list; (optional) add `group-*`, `peer-*` | +90 (incl. ~30 LOC removed in refactor) |
| `compiler/tests/unit/tailwind-classes.test.js` | Add tests for 7 already-mapped state pseudo-classes (§14b); add §20 dark/print/motion; add §21 group/peer (if included); add §22 cross-feature `md:p-[1.5rem]`, etc. | +200 |
| `compiler/SPEC.md` | Extend §26.3 normative table with new variants | +15 |

**Total: ~+305 LOC, 30–40 new tests, 1 SPEC table extension.**

### Combined commit shape

- **2 commits**, ~570 LOC net add, 55–70 new tests, 1 new SPEC section + 1 extension, 1 new sample
- **No deletions** of existing logic (variant code stays; refactored, not removed)
- **No breaking changes** to any of the 83 existing tests
- **No call-site changes** outside `tailwind-classes.js` (the `codegen/index.ts` and `codegen/ir.ts` integration is untouched)

---

## 14. Minor cleanups noticed (drive-by candidates, optional)

These are not part of the core implementation but are visible in `tailwind-classes.js` while reading:

1. `tailwind-classes.js:148-149` — `space-x-${escapeCssClass(scale)}` should likely escape the entire selector key (`space-x-${scale}`), not just the scale segment. Bug latent because `space-x-0.5` would then escape `0.5` but the registered key is `space-x-0.5` (unescaped). [INFERRED] minor pre-existing bug.
2. SPEC `§25` and `§26` confusion — `tailwind-classes.js:3` says "Per SPEC section 25", and the test file `:4` says "SPEC §25", but actual section is §26. Minor doc drift.
3. `parseClassName` only allows ONE responsive + ONE state. Multi-modifier (`md:dark:hover:`) requires extension (already covered in 4.5).
4. `border` shorthand in registry `tailwind-classes.js:423-427` is width-only (no implicit `border-style: solid`), unlike Tailwind's default. Outside this scope but worth flagging.

These are **NOT in scope for this fix** — flag for separate cleanup pass.

---

## 15. Summary table for dispatch decision

| Question | Answer |
|---|---|
| Single fix or split? | **Single fix agent, two commits.** |
| Pipeline tier? | **T2.** Well-scoped, no debate, no precursor. |
| Pre-commits needed? | None. Existing test infrastructure sufficient. |
| Deep-dive needed? | No. Recon answers all open questions. |
| Open questions before dispatch? | **4** (Q1–Q4 above) — all are scoping decisions, not architectural blockers. Recommend defaults: (b)/(c) for Q1, (a) for Q2, hardcode for Q3, defer for Q4. |
| Concurrent W-TAILWIND-001? | Coordinate signal (9.2). If Option 5 uses `getTailwindCSS()===null`, no coupling needed. |
| Estimated effort | **4–8 hours implementation + tests + spec.** |
| Estimated LOC | **~570 net add across 3 files.** |
| Test additions | **55–70 new tests in tailwind-classes.test.js.** |
| Risk level | **Low-medium.** Highest concrete risk is the variant-registry refactor breaking an existing test; mitigated by running 83-test suite as gate. |

---

**End of recon.**
