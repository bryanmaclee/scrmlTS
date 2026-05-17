// error-recovery.js — JS-host shadow of error-recovery.scrml.
// See span.js header for the .scrml<->.js duplication rationale.
// PILLAR 5b classification mirrors error-recovery.scrml's header — see that file.

export const ErrorRecovery = Object.freeze({
    ParsingNormally:     "ParsingNormally",
    AccumulatingSkipped: "AccumulatingSkipped",
    ReSynchronized:      "ReSynchronized",
});

export const SyncToken = Object.freeze({
    Semicolon:             "Semicolon",
    NewlineAtStmtBoundary: "NewlineAtStmtBoundary",
    ClosingBrace:          "ClosingBrace",
    EofToken:              "EofToken",
});

export function makeRecovery() {
    return {
        mode:    ErrorRecovery.ParsingNormally,
        skipped: [],
        syncAt:  null,
    };
}

export function isParsingNormally(recovery) {
    return recovery.mode === ErrorRecovery.ParsingNormally;
}

export function beginRecovery(recovery) {
    recovery.mode = ErrorRecovery.AccumulatingSkipped;
    recovery.skipped = [];
    recovery.syncAt = null;
}

export function accumulateSkipped(recovery, token) {
    recovery.skipped.push(token);
}

export function markResync(recovery, syncTokenKind) {
    recovery.mode = ErrorRecovery.ReSynchronized;
    recovery.syncAt = syncTokenKind;
}

export function resumeNormal(recovery) {
    recovery.mode = ErrorRecovery.ParsingNormally;
    recovery.skipped = [];
    recovery.syncAt = null;
}
