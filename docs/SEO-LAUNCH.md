# scrml — SEO + Launch Checklist

Working doc for ranking `scrml` on Google above the old "scrml math markdown" GitHub repo that currently owns the search result.

---

## What's already in place

- [x] **MIT LICENSE** at repo root (`6d9a5ab`)
- [x] **GitHub Pages landing page** — `docs/index.html` with full SEO (title, meta description, keywords, canonical URL, Open Graph, Twitter Card, schema.org `SoftwareSourceCode`)
- [x] **`docs/.nojekyll`** — disables Jekyll so HTML is served as-is without processing
- [x] **`package.json`** keywords, description, homepage, repository, bugs fields
- [x] **README** mentions "scrml" in H1 + first paragraph + throughout, links the LICENSE

---

## Manual steps (GitHub UI — user must do)

### 1. Enable GitHub Pages

1. Go to **Settings → Pages** (`https://github.com/bryanmaclee/scrmlTS/settings/pages`).
2. Under **Build and deployment** → **Source**, select **Deploy from a branch**.
3. Branch: **`main`**. Folder: **`/docs`**.
4. Click **Save**.
5. Wait ~1–2 minutes. The site will publish at **`https://bryanmaclee.github.io/scrmlTS/`**.
6. The Pages settings page will show the live URL once the first build finishes — verify you see the landing page (dark background, "scrml" H1).

### 2. Fill the repo About box

1. Go to the repo homepage (`https://github.com/bryanmaclee/scrmlTS`).
2. Click the ⚙️ gear next to **About** (top-right of the repo page).
3. **Description:** `A single-file, full-stack reactive web language. The compiler splits server from client, wires reactivity, routes HTTP, and emits plain HTML/CSS/JS.`
4. **Website:** `https://bryanmaclee.github.io/scrmlTS/` (change to custom domain later)
5. **Topics** (type each, press Enter): `scrml`, `scrml-lang`, `compiler`, `language`, `programming-language`, `reactive`, `full-stack`, `web-framework`, `typescript`, `bun`, `single-file`, `dsl`, `state-machine`, `no-build`, `server-components`
6. Leave **"Use your README..."** checked.
7. Click **Save changes**.

### 3. Register a domain (highest-leverage single move)

Candidates in rough priority order:

- `scrml.dev` (best — `.dev` is Google-owned and weighted for devtools)
- `scrml-lang.dev`
- `scrml.io`
- `scrml.org`
- `scrml.sh` (cute, decent ranking signal for CLI tools)

Register one, then:

1. Add a `CNAME` file to `docs/` with the bare domain (e.g. `scrml.dev`) — the GitHub Pages build picks it up automatically.
2. In the domain registrar DNS:
   - Add a CNAME record: `www` → `bryanmaclee.github.io`
   - Add A records for the apex (`@`) to GitHub's Pages IPs:
     - `185.199.108.153`
     - `185.199.109.153`
     - `185.199.110.153`
     - `185.199.111.153`
3. Back in GitHub Pages settings, the **Custom domain** box should auto-fill from the `CNAME` file. Enable **Enforce HTTPS** once DNS propagates (~10 min to 24 h).
4. Update `docs/index.html` meta tags: change `https://bryanmaclee.github.io/scrmlTS/` → the custom domain in the `canonical`, `og:url`, and schema `codeRepository` would stay on GitHub. Same for the README's site links.

---

## Launch burst (day-of-launch)

The single biggest SEO event is a public launch where authoritative sites link to yours within the same 24–48 h window. Queue these up and fire them together.

### Show HN post

**Title:** `Show HN: scrml – a single-file, full-stack reactive web language`

**URL:** site URL (GitHub Pages or custom domain once it's live).

**Text body (first comment by you):**

```
Hi HN — I've been building scrml for about a year. The short pitch:
one file, one language, full stack. Markup, reactive state, scoped
CSS, SQL, server functions, WebSocket channels, and inline tests
all live in the same .scrml file. The compiler splits server from
client, wires reactivity, routes HTTP, types the database schema,
and emits plain HTML/CSS/JS.

A few things that are different:

  - State is a first-class type. `< Card>` declares a state type;
    `<Card>` instantiates one. HTML elements like `<input>` ARE
    state types. Everything flows through `match`, `fn` signatures,
    and the server/client boundary with static checks.

  - Any variable can carry a compile-time contract. Value predicates
    (`@price: number(>0 && <10000)`), presence lifecycle (`lin`
    variables must be used exactly once), or full state transitions
    (`< machine>` rejects illegal moves at compile AND runtime).

  - N+1 gets rewritten automatically. A for-loop doing per-iteration
    SQL becomes one `WHERE id IN (...)` pre-fetch plus a Map lookup.
    Measured ~2–4× on SQLite depending on N.

Compiler is 6,800+ tests, MIT, ~45ms build time for TodoMVC. Runs on
Bun today.

The repo: https://github.com/bryanmaclee/scrmlTS
Landing page: <LIVE URL>

Happy to answer questions about the design. The spec is in the
repo (compiler/SPEC.md) if you want the detail — sections 14
(types), 18 (match), 42 (lifecycle), 51 (machines), and 52 (server
authority) are the meatiest.
```

**Best posting time:** Tuesday–Thursday, 8–10 a.m. US Pacific. Avoid Mondays (noise) and Fridays (dead zone).

### dev.to post

**Title:** `Introducing scrml: a single-file, full-stack reactive web language`

**Tags:** `#javascript`, `#typescript`, `#webdev`, `#compilers`, `#programming`, `#showdev`

**Body outline (write ~800 words; draft in a separate file when ready):**

1. **The problem** — web apps spread across 5+ files / tools. API layer to keep in sync. Route files. State management library. Build config. `node_modules` mountain.
2. **The idea** — what if the compiler OWNED the full stack? Same file, same language.
3. **A complete counter app** (15-line code sample).
4. **Three things that are different** — state as a type, mutability contracts, automatic N+1 elimination. One code example each.
5. **Where it is today** — pre-1.0, MIT, 6,800+ tests, runs on Bun. Bullet list.
6. **Try it / follow along** — repo, site, tutorial, HN discussion link.

### Other same-day posts

- **lobste.rs** — title `scrml: a single-file, full-stack reactive web language`, tag `programming` + `web`. Lobsters is harder to post to (invite-only) but has an active web-dev readership.
- **r/programming** — Reddit; same title + link. Expect downvote risk but exposure is worth it.
- **r/typescript** — more friendly; lead with "scrml compiles to TS/JS."
- **Bluesky / Mastodon / X** — short thread, pin the repo link.

### Submit to awesome-lists

Each merged PR into a popular awesome-list is a high-PR backlink:

- `sindresorhus/awesome` (main awesome list — hard bar)
- `awesome-compilers` (more niche, accepting)
- `awesome-web-frameworks` if one exists
- `awesome-bun`
- `awesome-reactive-programming`

Target 3–5 of these. Even if only 1 merges, it's a strong signal.

---

## Ongoing (weeks 1–8 post-launch)

- [ ] Publish a scoped npm package (even if it's `@scrml/compiler-preview` v0.x) so `npmjs.com/package/scrml` or `/~scrml` becomes a result.
- [ ] Write 2–3 dev.to / Medium follow-up posts on specific features: "How scrml eliminates N+1 automatically", "Mutability contracts vs TypeScript", "State machines that run at compile AND runtime".
- [ ] Record a 3–5 minute demo video, post to YouTube (title: "scrml — a single-file, full-stack reactive web language").
- [ ] Claim social handles: twitter/x `@scrmllang` or `@scrml_lang`, bluesky, mastodon, npm scope. Link them all back to the site.
- [ ] Open a GitHub Discussions tab in the repo — discussions URLs index independently.
- [ ] Make sure all replies on HN / Reddit / dev.to include a link to the site (not just the repo). Domain signals compound.

---

## Metrics to watch

- Google Search Console — add the site, submit the sitemap (`docs/sitemap.xml` — TODO), watch impressions for `scrml` climb from 0.
- GitHub Insights — repo traffic, referrers (HN + dev.to usually show up as top sources for first 7 days).
- `site:bryanmaclee.github.io/scrmlTS` in Google — confirms indexing started.
- Typing `scrml` in Google incognito once a week for 4 weeks — watch the position change.

Expected trajectory: week 1 shows up around position 20–40, week 3–4 should reach page 1 for bare `scrml` assuming the launch burst hits, week 6–8 should be top 3 once the domain + backlinks age.

---

## Disambiguation check

Look up the incumbent "scrml math markdown" — confirm:
- What domain does it own? (If none, you'll pass it in weeks.)
- Is it maintained? (Last commit date?)
- Does it have a CDN / npm / Homebrew footprint?

If it has `scrml.org` or a similar serious presence, consider a different search target like `scrml language` or `scrml compiler` as the primary phrase and let `scrml` alone be a bonus. But the single-word domain `scrml.dev` + Show HN combo has historically pushed past dormant competitors even with the same name.
