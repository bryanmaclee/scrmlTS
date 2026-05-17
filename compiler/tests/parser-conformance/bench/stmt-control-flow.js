// Bench: control-flow statements — if/else, for, for-of, while, do-while.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
function controlFlow(items) {
  let sum = 0;
  if (items.length === 0) {
    return 0;
  } else if (items.length === 1) {
    return items[0];
  } else {
    for (let i = 0; i < items.length; i++) {
      sum += items[i];
    }
  }
  for (const x of items) {
    sum += x;
  }
  let n = 0;
  while (n < 10) {
    n++;
  }
  do {
    n--;
  } while (n > 0);
  return sum;
}
