# Stdlib Dispatch — `scrml:oauth` (OAuth 2.0 client)

**Status:** PRE-WRITTEN brief, not yet launched.
**Target agent:** `scrml-dev-pipeline` (T2 or T3, worktree-isolated)
**Authorization:** scoped to this brief; "no holds barred" requires session-scoped re-confirmation at dispatch time.
**Date drafted:** 2026-05-04 (S57)
**Drafted by:** PA (S57 conversation)

---

## §0 What this dispatch is

A focused dispatch to add **`scrml:oauth`** — an OAuth 2.0 / OpenID Connect client to the scrml stdlib. This closes the single biggest remaining "kills npm reach" gap identified in the S57 stdlib audit, replacing `passport.js`, `simple-oauth2`, `googleapis` (auth portion), `@octokit/oauth-app`, `next-auth` (server-side primitives), and similar npm packages.

This is a **standalone dispatch** — does NOT modify SPEC.md or any other stdlib module. Touches only `stdlib/oauth/`, `compiler/tests/unit/stdlib-oauth*.test.js`, and the kickstarter v2 §9 catalog.

---

## §1 Why a focused dispatch

Earlier in S57, OAuth was held back from Tier 1/2/3 stdlib batches because of surface-area + edge-case complexity:

- **Multiple OAuth flows:** authorization code (with PKCE), client credentials, device code, refresh token. The auth code + refresh token + PKCE combination is the v0.2.0 target; client_credentials is a stretch.
- **Provider quirks:**
  - Google uses two tokens (access + ID token) and OIDC discovery.
  - GitHub has classic vs fine-grained personal-access-token paths.
  - Microsoft Identity has tenant-scoped endpoints + multi-audience tokens.
  - Discord has scope concatenation conventions.
  - Auth0 / Okta / Keycloak are OIDC-discovery-driven.
- **Security-sensitive primitives:** CSRF state, PKCE verifier storage, token revocation, refresh-token rotation. Bugs here are vulnerabilities.
- **Storage assumption:** OAuth flows need session-scoped storage for state + verifier. The wrapper must NOT assume a specific storage backend; the caller injects one.

A focused dispatch with a clean brief produces better output than a freehand session-side build.

---

## §2 CRITICAL — Tool-use mandate (inherits from D1.5/D2 success)

1. **Modify code via Edit / Write tools.** New module files use Write; modifications to existing files (kickstarter §9) use Edit.
2. **Do NOT use `python3`, `sed`, `awk`, `node -e`, or heredoc shell scripts to modify any file.** Bash will deny these.
3. **Bash is for `git`, `grep`, `head`, `wc`, `cat`, `find` (read-only) + `bun test` + `bun run` for compile-smoke tests.**
4. **If Write fails or Edit's `old_string` is not unique, narrow it — do not pivot to a script-based approach.**

---

## §3 Startup verification + path discipline

You are running with `isolation: "worktree"`.

1. Run `pwd` via Bash. Save as WORKTREE_ROOT.
2. `git rev-parse --show-toplevel` MUST equal WORKTREE_ROOT.
3. `git status --short` — clean tree.
4. `git log --oneline -3` — confirm HEAD is at or after `f700116` (the Tier 3 stdlib commit) — `scrml:http` middleware + `scrml:regex` must be present.
5. Confirm `stdlib/redis/`, `stdlib/cron/`, `stdlib/regex/` exist; confirm `stdlib/auth/index.scrml` exists (existing `scrml:auth` is the JWT/password module — NOT to be modified by this dispatch).

If any check fails: STOP and report.

**Path discipline:**
- All Write/Edit paths under WORKTREE_ROOT (relative paths preferred).
- NEVER write to `.claire/...` (typo path leak — common model error). The directory is `.claude/`.
- NEVER write to `/home/bryan-maclee/scrmlMaster/scrmlTS/...` directly — that's main, not your worktree.

---

## §4 Crash recovery

1. **Commit after each meaningful change.** WIP commits per module-file or per provider preset. Don't batch.
2. **Update progress.md after each step.** Path: `docs/changes/stdlib-oauth/progress.md`. Append-only, timestamped.
3. **Pre-commit hook:** Do NOT bypass. If it fails, fix the underlying issue.
4. **Do NOT push.** Main-PA handles integration.

---

## §5 LOAD-BEARING SOURCES (read before any code)

1. This brief in full.
2. `stdlib/auth/index.scrml` — existing scrml:auth module (JWT/password). Look at the shape, the export style, the `<program>${ ... }</program>` wrapping, and the inline `~{}` test block convention. Your scrml:oauth module must match this shape.
3. `stdlib/http/index.scrml` — your runtime dependency. You will import `get`, `post`, `withDefaults`, `withAuth` from scrml:http for token-exchange / refresh-token / userinfo calls.
4. `stdlib/crypto/index.scrml` — for PKCE code_verifier / code_challenge generation. Use `generateToken(bytes)` for verifier; SHA-256 + base64url for challenge.
5. `stdlib/redis/index.scrml` — example for how a network-bound module looks (async functions, caller-injected client option).
6. `docs/articles/llm-kickstarter-v2-2026-05-04.md` — particularly §9 (stdlib catalog where you'll add the new row) and §11.2 (auth recipe).
7. `pa.md` — repo conventions, no-destructive-ops rule.
8. **OAuth 2.0 RFC 6749** + **PKCE RFC 7636** + **OAuth 2.1 IETF draft** for the protocol shape. You don't need to memorize the RFCs; the brief below sketches the function shapes you need.

---

## §6 SCOPE — module shape

### §6.1 Module file layout

```
stdlib/oauth/
├── index.scrml              # main module; provider-agnostic core + provider helpers
├── google.scrml             # Google-specific preset
├── github.scrml             # GitHub-specific preset
├── microsoft.scrml          # Microsoft Identity preset
├── discord.scrml            # Discord preset
└── pkce.scrml               # PKCE verifier/challenge helpers (used internally)
```

`index.scrml` re-exports from the provider files for convenience.

### §6.2 Core API surface (provider-agnostic)

```scrml
// Configuration object — caller constructs this per provider.
//
// {
//   clientId:     "...",
//   clientSecret: "...",        // optional for public clients (PKCE-only)
//   redirectUri:  "https://app.example.com/callback",
//   authorizeUrl: "https://provider.example.com/authorize",
//   tokenUrl:     "https://provider.example.com/token",
//   userInfoUrl:  "https://provider.example.com/userinfo",   // optional
//   scopes:       ["openid", "email", "profile"],
//   usePKCE:      true,                                       // default true
//   storage:      <session storage adapter>                   // see §6.3
// }

// Step 1 — generate the authorization URL the user is redirected to.
// Side effect: writes state + verifier into storage scoped by sessionKey.
// Returns the URL string.
export async function startFlow(config, sessionKey) { ... }

// Step 2 — exchange the authorization code for tokens.
// Reads + clears state/verifier from storage; verifies state matches.
// Returns { accessToken, refreshToken?, idToken?, expiresAt, tokenType, scope }.
// Throws on state mismatch (CSRF), code error, network error.
export async function exchangeCode(config, sessionKey, code, state) { ... }

// Step 3 — refresh an expired access token.
// Returns updated token object. May rotate the refresh token (RFC 8693).
export async function refreshToken(config, refreshTokenStr) { ... }

// Step 4 — call the provider's userinfo endpoint with an access token.
// Returns the parsed user object (provider-shape; not normalized).
export async function getUserInfo(config, accessToken) { ... }

// Step 5 — revoke a token (provider-supported revocation endpoint, optional).
export async function revoke(config, token, tokenTypeHint) { ... }
```

### §6.3 Storage adapter contract

OAuth flows need session-scoped storage for `state` (CSRF) + `code_verifier` (PKCE). The module does NOT assume a backend — caller injects one.

```scrml
// Adapter shape — any object satisfying this works.
// {
//   put: async (key, value, ttlSeconds) => void,
//   get: async (key) => string | null,
//   del: async (key) => void
// }
//
// Example caller wires this from scrml:redis:
//
//   import { setex, get as redisGet, del as redisDel } from 'scrml:redis'
//   const oauthStorage = {
//       put: (k, v, ttl) => setex(k, v, ttl),
//       get: (k) => redisGet(k),
//       del: (k) => redisDel(k)
//   }
//
// Or from scrml:store:
//
//   import { createSessionStore } from 'scrml:store'
//   const oauthStorage = createSessionStore("./oauth.db")
//   // (createSessionStore must satisfy put/get/del; verify shape)
//
// The module also provides an in-memory adapter for development:
//   import { memoryAdapter } from 'scrml:oauth'
//   const oauthStorage = memoryAdapter()  // NOT for production
```

### §6.4 PKCE helpers (`pkce.scrml`)

```scrml
// generate a 43-128 char code_verifier (URL-safe random)
export function generateVerifier() { ... }

// derive code_challenge = base64url(SHA-256(verifier))
export async function deriveChallenge(verifier) { ... }
```

PKCE is enabled by default (`config.usePKCE !== false`). Public clients (mobile, SPA, no clientSecret) MUST use PKCE; confidential clients SHOULD. The module enforces "if no clientSecret, PKCE is required" — error if neither is set.

### §6.5 Provider presets

Each provider file exports a `config` factory and any provider-specific quirks.

```scrml
// stdlib/oauth/google.scrml
//
// export function googleConfig({ clientId, clientSecret?, redirectUri, scopes, storage }) {
//     return {
//         clientId,
//         clientSecret,
//         redirectUri,
//         authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
//         tokenUrl:     "https://oauth2.googleapis.com/token",
//         userInfoUrl:  "https://openidconnect.googleapis.com/v1/userinfo",
//         scopes:       scopes || ["openid", "email", "profile"],
//         usePKCE:      true,
//         extraAuthParams: { access_type: "offline", prompt: "consent" }, // for refresh tokens
//         storage
//     }
// }
//
// // Google-specific: parse the id_token from a token response (JWT decode)
// export function parseIdToken(tokens) { ... }
```

Similar shapes for `github.scrml`, `microsoft.scrml`, `discord.scrml`. Each preset has its own quirks documented inline.

**Microsoft note:** the tenant ID is variable. `microsoftConfig({tenant: "common" | "organizations" | "consumers" | "<tenant-id>"})`.

**GitHub note:** classic OAuth apps have one shape; GitHub Apps another. Start with classic OAuth apps; GitHub-Apps preset is a stretch (own dispatch if needed).

### §6.6 Error handling

- All async functions throw on protocol error with a structured Error message including the OAuth `error` and `error_description` fields when present.
- State-mismatch and code-verifier-mismatch errors are explicit error classes (or Error with a clear name) so callers can catch them specifically.

---

## §7 Test posture

### §7.1 Shape tests (always run)

Like `stdlib-redis.test.js` and `stdlib-cron.test.js`, the bulk of tests are SHAPE tests with stubbed http + storage. Coverage:

- `startFlow` writes state + verifier to storage, returns URL with correct query params.
- `exchangeCode` validates state, calls token endpoint with correct body, parses response.
- State mismatch throws.
- PKCE flow generates verifier + challenge correctly (base64url-safe; no padding).
- `refreshToken` calls token endpoint with `grant_type=refresh_token`.
- `getUserInfo` calls userinfo endpoint with Bearer token.
- `revoke` calls revocation endpoint when configured.
- Provider preset configs produce correct URLs + scopes + extraAuthParams.

### §7.2 Live integration tests (gated)

Optional, gated on env vars (`OAUTH_TEST_GITHUB_CLIENT_ID` etc.) and run against actual provider sandboxes / test apps. Skipped in CI by default.

### §7.3 PKCE crypto correctness

Verifier/challenge round-trip MUST be cryptographically correct (Node's crypto.subtle.digest). Test with RFC 7636 test vectors.

---

## §8 Kickstarter v2 §9 update

Add a new row to the catalog:

```
| `scrml:oauth` | OAuth 2.0 client (auth code + PKCE + refresh + userinfo + revoke).
  Provider presets for Google, GitHub, Microsoft, Discord. Storage-adapter
  injection for state/verifier (works with scrml:redis, scrml:store, or
  in-memory). RFC-7636 PKCE compliant. Server-side only. |
  passport.js, simple-oauth2, next-auth (server primitives), googleapis (auth) |
```

Also: extend §11.2 (auth recipe) with an OAuth example showing the typical signin-with-Google flow.

---

## §9 SUCCESS CRITERIA

The dispatch is DONE when:

1. **`stdlib/oauth/` directory exists** with `index.scrml`, `pkce.scrml`, `google.scrml`, `github.scrml`, `microsoft.scrml`, `discord.scrml`.
2. **Core API shipped:** `startFlow`, `exchangeCode`, `refreshToken`, `getUserInfo`, `revoke`, plus `memoryAdapter` for dev storage.
3. **PKCE correct:** verifier 43-128 chars, URL-safe random; challenge = base64url(SHA-256(verifier)) with no padding. RFC 7636 test vectors pass.
4. **All four provider presets** (Google, GitHub, Microsoft, Discord) ship with correct URLs + recommended-default scopes + provider-specific quirks documented inline.
5. **Tests:** shape-tests via stubbed http+storage cover every export. Live tests gated on env vars. RFC 7636 test-vector test for PKCE.
6. **Compile smoke:** `bun run compiler/src/cli.js compile <test-file-importing-scrml:oauth>` exits clean.
7. **Kickstarter v2 §9** — new scrml:oauth row added; §11.2 auth recipe extended with OAuth example.
8. **Each meaningful change committed independently;** `progress.md` captures the timeline.
9. **Final commit message:** `stdlib(oauth): add scrml:oauth — OAuth 2.0 + PKCE client, 4 provider presets`.

---

## §10 What this dispatch does NOT do

- **Does NOT** modify `stdlib/auth/index.scrml` (existing JWT/password module). They are sibling modules with different concerns.
- **Does NOT** modify SPEC.md or PIPELINE.md — pure stdlib work.
- **Does NOT** add OIDC discovery (RFC 8414) — caller passes URLs explicitly per provider preset. OIDC discovery is a stretch / v0.3.0+.
- **Does NOT** add session/cookie middleware — caller wires that.
- **Does NOT** ship a "client_credentials" or "device_code" flow — auth-code + refresh + userinfo + revoke is the v0.2.0 scope.
- **Does NOT** ship a GitHub-Apps preset (classic OAuth apps only). GitHub Apps would be its own future dispatch.
- **Does NOT** push.

---

## §11 Estimated wall-time

- Core API + PKCE crypto: 4-6 hours
- Provider presets (4 providers): 3-5 hours
- Tests (shape + RFC vectors): 4-6 hours
- Kickstarter §9 + §11.2 update: 1 hour

**Total: 12-18 hours focused work.**

---

## §12 Open questions to resolve at dispatch time

1. **JWT decode for id_token:** Google's flow returns an id_token JWT. Should the OAuth module decode it (calling `scrml:auth.decodeJwt` for header+payload), or leave that to the caller? PA leans: provide a helper `parseIdToken(tokens)` that does verify-signature-OR-not-verify based on whether the caller passes the provider's JWKS endpoint.
2. **Token storage:** the module manages state+verifier via the storage adapter. Should it ALSO manage access/refresh-token storage, or leave that to the caller? PA leans: leave to the caller. The module returns tokens; the app stores them.
3. **OIDC discovery (RFC 8414):** worth a v0.3.0+ candidate. Logged in roadmap §8.5 alongside Bun candidates? PA leans: yes, log it.
4. **Storage adapter shape verification:** at startFlow time, validate that the adapter has put/get/del methods or fail with a clear error.

---

## §13 Cross-references

- **OAuth 2.0:** RFC 6749
- **PKCE:** RFC 7636
- **OAuth 2.1 (best practices):** IETF draft (informational)
- **Kickstarter v2 §11.2 (auth recipe):** `docs/articles/llm-kickstarter-v2-2026-05-04.md`
- **Stdlib catalog (§9):** same file
- **Existing scrml:auth:** `stdlib/auth/index.scrml`
- **Existing scrml:http (your runtime dep):** `stdlib/http/index.scrml`
- **Existing scrml:crypto (your PKCE helper dep):** `stdlib/crypto/index.scrml`
- **Existing scrml:redis (storage example):** `stdlib/redis/index.scrml`
- **PA directives:** `pa.md`

---

## §14 Tags

#stdlib-dispatch #scrml-oauth #oauth-2.0 #pkce #provider-presets #brief-only-not-launched #s57-prep
