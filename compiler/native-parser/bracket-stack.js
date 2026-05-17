// bracket-stack.js — JS-host shadow of bracket-stack.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors bracket-stack.scrml's header — see that file.

export const BracketKind = Object.freeze({
    Paren:   "Paren",
    Brace:   "Brace",
    Bracket: "Bracket",
});

export function makeBracketStack() {
    return { frames: [] };
}

export function depth(stack) {
    return stack.frames.length;
}

export function isBalanced(stack) {
    return stack.frames.length === 0;
}

export function push(stack, opener, span) {
    stack.frames.push({ opener, span });
}

export function pop(stack) {
    if (stack.frames.length === 0) return null;
    return stack.frames.pop();
}

export function topOpener(stack) {
    if (stack.frames.length === 0) return null;
    return stack.frames[stack.frames.length - 1].opener;
}

export function closerMatchesOpener(closerChar, opener) {
    if (opener === BracketKind.Paren)   return closerChar === ")";
    if (opener === BracketKind.Brace)   return closerChar === "}";
    if (opener === BracketKind.Bracket) return closerChar === "]";
    return false;
}
