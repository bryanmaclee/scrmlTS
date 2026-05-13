# S89 null-eradication: mutability-contracts article

## 2026-05-13 — migration complete

- Inventoried 14 `\bnull\b` sites in docs/articles/mutability-contracts-devto-2026-04-29.md
- Classified:
  - scrml-syntax-migrate: 7 sites (L14, L129, L130, L134x3, L138, L151, L157, L232, L248x2)
  - TS-contrast-leave: 3 sites (L37, L121, L151 `T | null`)
  - JS-host-leave: 3 sites (L144, L250, scrml-block comment about JS ceremony)
  - meta/external-link-leave: 2 sites (L20 design-choice prose, L274 external article title)
- Applied migrations:
  - L14 status banner: `(null -> string)` -> `(not -> string)`
  - L129 struct field: `(null -> string)` -> `(not -> string)`
  - L130 struct field: `(!null && !number)` -> `(!not && !number)`
  - L134 prose (3 occurrences): null -> not where describing scrml lifecycle semantics
  - L138 scrml-block comment: "user.passwordHash is null" -> "is not"
  - L151 `(null -> string)` -> `(not -> string)` (T|null contrast kept)
  - L157 prose: `null -> T` -> `not -> T`
  - L232: `(null -> string)` -> `(not -> string)`
  - L248: "this field is null until loaded" -> "absent until loaded"; `(null -> T)` -> `(not -> T)`
- Added S89 update banner after status banner
- Verified post-migration grep: 8 remaining `null` references, all legitimate (TS/JS-host contrast, external article title, banner self-reference)
