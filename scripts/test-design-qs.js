const { compileScrml } = require("../compiler/src/api.js");
const { readFileSync, writeFileSync } = require("fs");

function test(name, src) {
  writeFileSync("/tmp/_dq.scrml", src);
  const r = compileScrml({ inputFiles: ["/tmp/_dq.scrml"], mode: "browser", write: false });
  const errs = (r.errors || []).filter(e => e.severity !== "warning");
  const out = r.outputs?.values()?.next()?.value;
  const js = out?.clientJs || "";
  console.log(`${errs.length === 0 ? "PASS" : "FAIL"} ${name} (${errs.length} errs, ${js.length} js)`);
  if (errs.length > 0) errs.slice(0,3).forEach(e => console.log(`  ${e.code}: ${e.message?.slice(0,100)}`));
  return { errs, js };
}

// Q1: lift inside match arms
test("Q1: lift in match arm",
`<program>
\${
  type Status:enum = { Loading | Done | Error }
  @s = Status.Loading
}
\${
  match @s {
    .Loading => lift <p>Loading...</>
    .Done => lift <p>Done!</>
    else => lift <p>Error</>
  }
}
</program>`);

// Q5: match as RHS expression
test("Q5: match as RHS",
`<program>
\${
  type Color:enum = { Red | Green | Blue }
  @c = Color.Red
  const label = match @c {
    .Red => "red"
    .Green => "green"
    else => "blue"
  }
}
<p>\${label}</>
</program>`);

// Q6: match on primitives
test("Q6: match on number",
`<program>
\${
  @score = 3
  const msg = match @score {
    3 => "Perfect"
    2 => "Good"
    else => "Try again"
  }
}
<p>\${msg}</>
</program>`);

// Q7: bare match as statement with lift
test("Q7: bare match stmt",
`<program>
\${
  type Mode:enum = { Edit | View }
  @mode = Mode.View
  match @mode {
    .Edit => lift <input type="text"/>
    .View => lift <span>viewing</>
  }
}
</program>`);

// Q8: file-level scope shared
test("Q8: shared scope",
`<program>
\${
  @count = 0
  function inc() { @count = @count + 1 }
}
<div>
  <button onclick=inc()>+</>
  <span>\${@count}</>
</>
</program>`);

// Q13: bind:value
test("Q13: bind:value",
`<program>
\${ @name = "" }
<input bind:value=@name/>
<p>\${@name}</>
</program>`);

// Q20: .length passthrough
test("Q20: .length",
`<program>
\${ const items = [1, 2, 3] }
<p>\${items.length}</>
</program>`);

// Q21: bracket indexing with reactive var
test("Q21: bracket index",
`<program>
\${
  const items = ["a", "b", "c"]
  @idx = 0
}
<p>\${items[@idx]}</>
</program>`);

// Q18: template literal in class attr
test("Q18: template attr",
`<program>
\${ @color = "red" }
<div class="badge badge-\${@color}">hi</>
</program>`);

// Q24: top-level #{}
test("Q24: top-level #{}",
`<program>
#{ .box { color: red; } }
<div class="box">styled</>
</program>`);

// Q16: class:name with negated expr
test("Q16: class:name negated",
`<program>
\${ @isValid = true }
<div class:invalid=!@isValid>form</>
</program>`);

// Q22: < machine> inside <program>
test("Q22: machine in program",
`<program>
\${
  type Light:enum = { Red | Green | Yellow }
  @light = Light.Red
}
< machine Controller for Light>
  .Red => .Green
  .Green => .Yellow
  .Yellow => .Red
</>
</program>`);
