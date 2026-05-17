// Bench: async function + await.
// Per scrml-native-parser-design-2026-05-17.md §D5 MUST-PARSE list.
async function fetchAll(urls) {
  const results = [];
  for (const url of urls) {
    const r = await fetch(url);
    results.push(await r.json());
  }
  return results;
}

const inline = async () => {
  const a = await Promise.resolve(1);
  const b = await Promise.resolve(2);
  return a + b;
};
