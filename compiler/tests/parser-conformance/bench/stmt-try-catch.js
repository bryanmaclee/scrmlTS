// Bench: try/catch/finally.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
// NOTE: forbidden in scrml SOURCE per primer §6 + §11; parser MUST accept
// because emitted JS, stdlib, and adopter-imported code may contain it.
function risky() {
  try {
    return doWork();
  } catch (e) {
    return fallback(e);
  } finally {
    cleanup();
  }
}

function noBinding() {
  try {
    return doWork();
  } catch {
    return 0;
  }
}

function doWork() { return 1; }
function fallback(e) { return -1; }
function cleanup() {}
