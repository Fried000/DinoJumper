const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'dist');
fs.mkdirSync(output, { recursive: true });
for (const file of ['index.html', 'play.html', 'instructions.html', 'achievements.html', 'style.css', 'game.js', 'achievements-data.js', 'achievement-engine.js', 'achievements.js', 'home.js', 'rules.js']) {
  fs.copyFileSync(path.join(root, file), path.join(output, file));
}
console.log('Built static game in dist/');
