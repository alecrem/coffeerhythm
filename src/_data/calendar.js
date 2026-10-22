const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { normalizeCalendarData } = require('../calendar.js');

module.exports = function () {
  const filePath = path.join(__dirname, '..', '..', 'content', 'calendar.yml');
  const raw = fs.readFileSync(filePath, 'utf8');
  return normalizeCalendarData(yaml.load(raw));
};
