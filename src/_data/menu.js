const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');

const md = new MarkdownIt();

module.exports = function () {
  const filePath = path.join(__dirname, '..', '..', 'content', 'menu.md');
  const raw = fs.readFileSync(filePath, 'utf8');
  return { html: md.render(raw) };
};
