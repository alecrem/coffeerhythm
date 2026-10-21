const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

module.exports = function () {
  const filePath = path.join(__dirname, '..', '..', 'content', 'calendar.yml');
  const raw = fs.readFileSync(filePath, 'utf8');
  return yaml.load(raw);
};
