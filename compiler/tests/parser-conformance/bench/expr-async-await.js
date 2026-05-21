// Bench: callback / promise-chain / sync-only control flow.
//
// M4.3 — scrml has no source-level `async`/`await` at the language level
// (parallel-by-default, no colored functions). The canonical async surface
// is the compiler body-split (server functions / reactive state). This
// bench is now a SYNC-callback fixture; the prior async/await bench would
// fire E-ASYNC-NOT-IN-SCRML / E-AWAIT-NOT-IN-SCRML. See
// compiler/tests/parser-conformance-stmt.test.js the M4.3 retraction
// describe block for the retraction surface.
function fetchAll(urls, done) {
  const results = [];
  let pending = urls.length;
  for (const url of urls) {
    fetch(url, (r) => {
      r.json((j) => {
        results.push(j);
        pending = pending - 1;
        if (pending === 0) {
          done(results);
        }
      });
    });
  }
}

const inline = (cb) => {
  const a = 1;
  const b = 2;
  cb(a + b);
};
