# The scrml Lagrangian

```
                  (HTML ⊗ CSS ⊗ JS ⊗ SQL)
  ℒ_scrml  =  ─────────────────────────────  · e^(@reactive)
                      S_framework

                  +  ∮ match(𝓔) · d(state)

                  +  ∇ · lin

                  +  ℏ · channel

                  +  ∂(server)/∂(client)

                  +  ∮ @scope · dA

                  −   lim    ceremony_n
                     n → ∞
```

## Legend

| symbol | meaning |
|---|---|
| `ℒ_scrml` | the scrml Lagrangian — total action of a running app |
| `HTML ⊗ CSS ⊗ JS ⊗ SQL` | tensor product of the four native surfaces — SQL is first-class (bun pass-through, no ORM tax) |
| `S_framework` | framework entropy — churn, boilerplate, lock-in, node_modules heat-death |
| `e^(@reactive)` | reactivity as a natural exponential — fine-grained, compiled, no VDOM |
| `∮ match(𝓔) · d(state)` | closed-loop exhaustive pattern match over enum field `𝓔` (Rust-descended algebraic data types) |
| `∇ · lin` | divergence of the linear-resource field — move semantics, no aliasing, no use-after-free |
| `ℏ · channel` | websockets quantized as first-class `<channel>` |
| `∂(server)/∂(client)` | server functions — one surface, two runtimes |
| `∮ @scope · dA` | native CSS `@scope` integrated over surface area — no selector pollution |
| `lim ceremony_n → 0` | ceremony vanishes as n (lines of config) tends to infinity |
