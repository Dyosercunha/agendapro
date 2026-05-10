const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'App.tsx');
let source = fs.readFileSync(appPath, 'utf8');

const before = source;
source = source.replace(/<button(?![^>]*\btype=)/g, '<button type="button"');

if (source !== before) {
  fs.writeFileSync(appPath, source);
  console.log('Button type safety patch applied.');
} else {
  console.log('Button type safety patch skipped.');
}
