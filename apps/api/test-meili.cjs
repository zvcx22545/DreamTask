const meili = require('meilisearch');
console.log('--- meilisearch investigation ---');
console.log('Type of meili:', typeof meili);
console.log('Keys of meili:', Object.keys(meili));
if (meili.MeiliSearch) {
  console.log('MeiliSearch found in keys');
  console.log('Type of MeiliSearch:', typeof meili.MeiliSearch);
}
if (meili.default && meili.default.MeiliSearch) {
  console.log('MeiliSearch found in default');
}
