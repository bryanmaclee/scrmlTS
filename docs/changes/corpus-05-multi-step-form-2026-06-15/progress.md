# Progress — corpus-05-multi-step-form-2026-06-15

Rewrite examples/05-multi-step-form.scrml to the canonical WIZARD-AS-ENGINE + decl-coupled-validators idiom.

## 2026-06-15
- Startup verified: pwd under agent worktree, toplevel matches, tree clean, base cd822f7a. bun install + pretest OK.
- Required reads done: primary.map.md (Task-Shape Routing), kickstarter v2 (§4 engines, §7 anti-patterns, §11.1 engine recipe), PRIMER §7/§8, SPEC §51.0.B-F.1 + §55.1/.2/.5/.6/.7/.8, current 05 file.
- Smells located in current file: L13 hand-built <currentStep>; L15-21 5 loose cells + <submitted> bool; L23-37 next()/back() match-transition tables; L46-51 submit() with if(@submitted) return guard; L161-163 if=/else-if=/else instance chain; ZERO validators. No ${for/lift} site (no Tier-0 fold needed).
- Next: probe inline-write-inside-state-child engine idiom + compound-validator gating, then author the rewrite.

## 2026-06-15 (cont.)
- Probed idiom clean before authoring: engine inline-write onclick=${ @step = .X } from inside state-child bodies (compile-time rule= checked, no W-ENGINE-SELF-WRITE); compound <signup> with decl-coupled validators; render fields via wrapping form <signup><firstName/></> (bare <signup/> is E-CELL-NO-RENDER-SPEC, §6.4 compound-parent); <errors of=@signup.firstName/>; select/checkbox bind:value=@signup.field; ternary display ${@signup.newsletter ? "Yes" : "No"}. All clean.
- Authored the rewrite by hand. KEEPS Step enum, persistSignup()/?{} INSERT, co-located #{} blocks + custom Tailwind-free classes (S86). DELETES <currentStep>, next()/back(), if=/else-if=/else chain, <submitted> + if(@submitted) return guard, five loose cells.
- Next-gating form chosen: PER-STEP. Info-step Next disabled=(!@signup.firstName.isValid || !@signup.lastName.isValid || !@signup.email.isValid); Preferences has no validators (optional choices) so no gating; final Submit disabled=!@signup.isValid (full-compound). Per-step gating compiled clean with no wrinkle — no fallback to compound needed.
- COMPILE-VERIFY: exit 0, ZERO E- errors. client+server node --check OK. client.js carries NO server SQL (INSERT/_scrml_sql only in server.js — security split correct). Greps: 0 if=/else-if=/else chain, 0 next()/back(), 0 <submitted>/@submitted, 0 try/catch/throw/===/!==, 0 null/undefined. (newsletter=false is a legit form-field default in the compound, NOT a UI-gating flag.)
- Full pre-commit suite via hook: 17038 pass / 0 fail / 90 skip / 1 todo (929 files). No regression.

### DEFERRED — discovered compiler bug (OUT OF SCOPE, surfaced not fixed)
An ODD number of apostrophes (') inside an HTML comment `<!-- ... -->` placed in an
engine state-child body breaks state-child recognition → spurious E-ENGINE-STATE-CHILD-MISSING
for every variant. Root cause: the block-splitter/tokenizer tracks single-quote string state
and does NOT exempt apostrophes inside `<!-- -->` comments, so a lone `'` opens a phantom
string that swallows the rest of the engine body. Minimal repro:
  <engine for=Step initial=.Info>
    <Info rule=.Preferences>
      <!-- gated on this step's fields -->   <!-- one apostrophe → breaks -->
      <div>info</div>
    </>
    ... (other state-children) ...
  </>
A BALANCED pair of apostrophes (e.g. "form's ... there's") parses fine (phantom string closes).
Workaround in the example: avoid apostrophes in engine-body comments. The compiler-source fix
(exempt `<!-- -->` spans from quote-state tracking in block-splitter) is OUT OF SCOPE for this
example-authoring dispatch — surfaced to PA for a separate compiler-source dispatch.
