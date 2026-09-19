const fs = require('fs');
const path = require('path');

const locales = JSON.parse(fs.readFileSync('src/locales/es.json', 'utf8'));

// Flatten JSON keys
function flattenObj(obj, prefix = '') {
  let keys = [];
  for (const k in obj) {
    if (typeof obj[k] === 'object') {
      keys = keys.concat(flattenObj(obj[k], prefix + k + '.'));
    } else {
      keys.push(prefix + k);
    }
  }
  return keys;
}
const validKeys = flattenObj(locales);

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('src');
let missingKeys = new Set();
let foundKeys = new Set();

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  // Match t('key') or t("key") or i18n.t('key')
  const regex = /[^a-zA-Z]t\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    const key = match[1];
    foundKeys.add(key);
    if (!validKeys.includes(key)) {
      missingKeys.add(key);
    }
  }
});

console.log('Missing Keys:');
missingKeys.forEach(k => console.log(k));
console.log('---');
