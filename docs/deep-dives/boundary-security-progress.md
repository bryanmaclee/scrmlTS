# Deep Dive Progress: Server/Client Boundary Security for Indirect References

## Progress Log

- 2026-04-24 T1: Scope lock complete. Read memory, agent registry, shared directives.
- 2026-04-24 T2: Read all 4 bug reproducers (H, I, J, K). Read hand-off-39.md for S38 context.
- 2026-04-24 T3: Read route-inference.ts (full — 1300+ lines). Key finding: transitive escalation is DISABLED (Step 4 comment: "Calling a server function is NOT a trigger. The caller stays client-side and uses a fetch stub"). Direct-only triggers: explicit `server`, `?{}` SQL, protect= fields, server-only APIs.
- 2026-04-24 T4: Read reactive-deps.ts (full). Key finding: `extractReactiveDeps` only scans the expression STRING for `@var` patterns — it does NOT recurse into called function bodies. This is the root cause of Bug J.
- 2026-04-24 T5: Read emit-client.ts name-mangling section (lines 545-665). Key finding: post-process regex replace `fnNameMap` replaces ALL occurrences of user fn names with mangled names, including inside record literal values. Bug D fix added negative lookbehind for `.` but Bug I shows it still fires for `n.lines` where `lines` matches a user function name.
- 2026-04-24 T6: Read _ensureBoundary in emit-logic.ts (lines 310-327). Confirmed NC-4: it's a warning shim that defaults to "client" when boundary is missing.
- 2026-04-24 T7: Read SPEC §12 (Route Inference, lines 5474-5623), §11.4 (server annotation, lines 5450-5471), §15.11.4 (function-typed props escape hatch, lines 6856-6951), §15.11.6 interaction notes with §12 (lines 6995-6998).
- 2026-04-24 T8: Prior art research complete. Searched: React "use server", Qwik $, Rust Send/Sync, Haskell IO monad, Swift Sendable, Elm ports. Fetched Qwik dollar sign docs and React use server docs for detailed rules.
- 2026-04-24 T9: Writing full deep dive report.
