// body-mode.js — JS-host shadow of body-mode.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors body-mode.scrml's header.
//
// BodyMode is the §4.18 quoted-text engine (charter Q1.D) — the
// markup-layer engine that answers "is display text in THIS body bare or
// quoted?". SPEC §4.18.1's two-body-mode model materialized as a composed
// engine: a markup/state body is scanned in free-text mode (a bare run is
// display text) or code-default mode (a bare run is code; display text is
// an explicit `"..."` display-text literal).
//
// MK3.1 SCOPE: the BodyMode engine declaration is complete (both variants,
// the full rule= contract, the `.CodeDefault` composite state-child
// carrying the DisplayTextLiteral engine — see the .scrml). MK3.1 adds the
// body-mode ESTABLISHMENT calculations (bodyModeForChildOf etc.) — which
// bodies are code-default vs free-text, computed from MK2's TagFrame
// payloads. The substantive `"..."` literal-scanning logic is MK3.2; the
// `${...}` interpolation is MK3.3.
//
// THE THIRD BODY MODE — default-logic (SPEC §40.8; S111 R3). §4.18's
// free-text / code-default split is a TWO-mode split; `<program>` /
// `<page>` bodies parse in a distinct THIRD mode — `default-logic` —
// owned by §40.8. The BodyMode engine carries only FreeText / CodeDefault
// (the §4.18 two-mode enum); `default-logic` is surfaced as a separate
// tag (ProgramBodyMode) so the markup layer recognizes all three modes
// without conflating §40.8's mode into the §4.18 engine. See the .scrml
// header's THIRD-BODY-MODE note.
//
// MK3.1 RESOLVES roadmap §4.4 K1 — block-context.scrml forward-references
// `<engine for=BodyMode>`; with BodyMode declared here (and the .scrml
// importing it) that E-ENGINE-004 .scrml-compile error resolves.

// DisplayTextLiteral is imported by the .scrml so the `.CodeDefault`
// composite state-child's inner engine resolves; the .js shadow does not
// need the import (the engine is the .scrml's canonical SHAPE — the .js
// carries only the live-surface helpers). Kept as a comment so the
// .scrml<->.js pair stays legible 1:1.
// import { DisplayTextLiteral } from "./display-text-literal.js";

// BodyMode variant tags — both 2 per charter Q1.D / SPEC §4.18.1.
//   FreeText    — plain-markup element bodies; a bare run is display text
//                 (the §4.18 default body mode).
//   CodeDefault — engine state-child / match arm / `:`-shorthand bodies;
//                 a bare run is code, display text is a `"..."` literal.
export const BodyMode = Object.freeze({
    FreeText:    "FreeText",
    CodeDefault: "CodeDefault",
});

// initialBodyMode — calculation. Matches `initial=.FreeText` — SPEC
// §4.18.1 "the default body mode is free-text mode".
export function initialBodyMode() {
    return BodyMode.FreeText;
}

// ProgramBodyMode — pure data tag for the §40.8 `default-logic` THIRD
// body mode. NOT a variant of the BodyMode enum (the BodyMode engine is
// the §4.18 TWO-mode engine). A `<program>` / `<page>` body's mode is
// `default-logic`; the establishment calculation surfaces it as this tag
// so the markup layer can recognize all three modes.
export const ProgramBodyMode = Object.freeze({
    DefaultLogic: "DefaultLogic",
});

// ===========================================================================
// BODY-MODE ESTABLISHMENT (SPEC §4.18.1 — the establishment rule).
//
// SPEC §4.18.1 normative: "The block splitter SHALL assign a body mode to
// every markup/state body at the point the body's opener is recognized"
// and "the body mode SHALL be determined by the ENCLOSING ELEMENT KIND".
//
// The native parser establishes body mode per TagFrame: when MK2's
// recognizeOpener pushes a frame, the body mode of the body that frame
// opens is computed here and stamped on the frame's `bodyMode` payload
// (MK2.1 created the field as null; MK3.1 sets it).
//
// The rule — SPEC §4.18.1's three code-bearing loci:
//   1. an engine state-child body (a tag inside an `<engine>`) — §51.0;
//   2. a match block-form arm body (a tag inside a `<match>`) — §18.0.1;
//   3. a `:`-shorthand body slot — §4.14 (a within-body construct, not a
//      delimited block — surfaced by shorthandBodyMode below).
//   Every other body — plain markup, and the `<engine>` / `<match>` body
//   itself — is free-text mode (the §4.18.1 default). A `<program>` /
//   `<page>` body is `default-logic` (§40.8 — the THIRD mode).
//
// Body modes NEST, they do NOT propagate (SPEC §4.18.1 statement 3): the
// establishment is a function of the ELEMENT itself + its immediate
// PARENT — never an inherited mode.
//
// PILLAR 5b: the establishment functions are CALCULATIONS — pure fns of a
// TagFrame's payload + the parent TagFrame's payload; they COMPUTE the
// mode a BodyMode engine instance initializes in, they are not engine
// transitions.
// ===========================================================================

// STRUCTURAL_PARENT_CODE_DEFAULT — the closed set of structural-element
// parent names whose CHILD tags open code-default bodies. SPEC §4.18.1
// code-bearing loci 1 + 2: `<engine>` (state-children) and `<match>`
// (block-form arms). A frozen membership map: parent-name -> true.
export const STRUCTURAL_PARENT_CODE_DEFAULT = Object.freeze({
    engine: true,
    match:  true,
});

// isCodeBearingParentName — calculation (predicate). Is `name` a
// structural-element parent whose child tags open code-default bodies (an
// `<engine>` or a `<match>`)? A closed-name-set lookup. Returns false on a
// null/undefined `name` (a top-level tag has no enclosing element).
export function isCodeBearingParentName(name) {
    if (name === null || name === undefined) return false;
    return STRUCTURAL_PARENT_CODE_DEFAULT[name] === true;
}

// PROGRAM_BODY_ELEMENTS — the closed set of element names whose body is
// `default-logic` mode (SPEC §40.8 — the THIRD body mode): `<program>`
// and `<page>`. A frozen membership map: name -> true.
export const PROGRAM_BODY_ELEMENTS = Object.freeze({
    program: true,
    page:    true,
});

// isProgramBodyElementName — calculation (predicate). Is `name` a
// `<program>` / `<page>` element — whose body parses in §40.8
// `default-logic` mode (the THIRD body mode)?
export function isProgramBodyElementName(name) {
    if (name === null || name === undefined) return false;
    return PROGRAM_BODY_ELEMENTS[name] === true;
}

// bodyModeForChildOf — calculation. The §4.18 body mode of the body a tag
// opens, given the tag's own name + the PARENT element's name (the name
// of the TagFrame immediately enclosing this one, or null when the tag is
// top-level).
//
// Returns BodyMode.FreeText, BodyMode.CodeDefault, or
// ProgramBodyMode.DefaultLogic (the §40.8 THIRD mode).
//
// The rule (SPEC §4.18.1, in priority order):
//   1. `<program>` / `<page>` -> `default-logic` (§40.8). Checked first —
//      the program-body mode is the element's OWN fixed mode.
//   2. PARENT is `<engine>` / `<match>` -> the tag is an engine
//      state-child / match arm; its body is code-default (loci 1 + 2).
//   3. otherwise -> free-text (the §4.18.1 default — covers plain markup
//      AND the `<engine>` / `<match>` body itself).
export function bodyModeForChildOf(tagName, parentName) {
    // 1. A `<program>` / `<page>` body is the §40.8 THIRD mode.
    if (isProgramBodyElementName(tagName)) {
        return ProgramBodyMode.DefaultLogic;
    }
    // 2. A child of an `<engine>` / `<match>` opens a code-default body —
    //    SPEC §4.18.1 code-bearing loci 1 + 2.
    if (isCodeBearingParentName(parentName)) {
        return BodyMode.CodeDefault;
    }
    // 3. The §4.18.1 default — free-text mode.
    return BodyMode.FreeText;
}

// shorthandBodyMode — calculation (constant accessor). The body mode of a
// `:`-shorthand body slot (SPEC §4.18.1 code-bearing locus 3 / §4.14). A
// `:`-shorthand body — the slot after `:` in a `<Name : expr>` opener —
// is ALWAYS code-default (SPEC §4.14 line 973 + §4.18.1).
//
// The `:`-shorthand body is a within-body construct, not a delimited
// block; it has no separate TagFrame. Recognizing that an opener carries
// a `:`-shorthand body needs the `:`-shorthand opener grammar (at MK2
// tokenizeOpener scans the opener's attribute region opaquely) — that
// recognition is a FORWARD SEAM. MK3.1 establishes the CONSTANT (the
// mode) so the rule is in one place; the recognizer is later-milestone.
export function shorthandBodyMode() {
    return BodyMode.CodeDefault;
}

// currentBodyMode — calculation (read). The §4.18 body mode IN EFFECT at
// the cursor — the mode of the innermost enclosing markup/state body.
// SPEC §4.18.1 statement 3: "the mode in effect at any cursor position is
// the mode of the INNERMOST enclosing body."
//
// The innermost enclosing body is the body opened by the topmost open
// TagFrame on `ctx.tagFrameStack` — its `bodyMode` payload (stamped by
// recognizeOpener — MK3.1). When no tag is open (the cursor is at the
// top level of the file, outside any element body), there is no enclosing
// body — the §4.18.1 default, free-text mode, applies.
//
// This reads `ctx.tagFrameStack` as a plain data field — it needs no
// import of tag-frame.js (which would create a tag-frame <-> body-mode
// import cycle). The TagFrame stack IS the §51.0.Q.1 instance hierarchy;
// reading its top frame's payload is the body-mode-of-the-current-body
// query. A self-closing tag's frame is popped immediately on recognition
// (it has no body and no `bodyMode`); the top frame here is therefore
// always an .OpenExpectingChildren frame carrying a `bodyMode`.
//
// PUNCH-LIST P7 — the markup layer threads this value into every
// markup->JS DelegationFrame so a delegated JS body knows the §4.18 body
// mode it sits inside.
export function currentBodyMode(ctx) {
    if (ctx === null || ctx === undefined) return BodyMode.FreeText;
    const stack = ctx.tagFrameStack;
    if (stack === null || stack === undefined || stack.length === 0) {
        return BodyMode.FreeText;
    }
    const top = stack[stack.length - 1];
    if (top === null || top === undefined ||
        top.bodyMode === null || top.bodyMode === undefined) {
        return BodyMode.FreeText;
    }
    return top.bodyMode;
}

// isCodeDefault — calculation (predicate). Is `mode` the §4.18
// code-default mode?
export function isCodeDefault(mode) {
    return mode === BodyMode.CodeDefault;
}

// isFreeText — calculation (predicate). Is `mode` the §4.18 free-text
// mode (the default)?
export function isFreeText(mode) {
    return mode === BodyMode.FreeText;
}

// isDefaultLogic — calculation (predicate). Is `mode` the §40.8
// `default-logic` THIRD body mode? (mode is ProgramBodyMode.DefaultLogic,
// NOT a BodyMode enum variant.)
export function isDefaultLogic(mode) {
    return mode === ProgramBodyMode.DefaultLogic;
}
