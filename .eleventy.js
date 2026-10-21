module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/style.css': 'style.css' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar.js': 'calendar.js' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar-render.js': 'calendar-render.js' });
  eleventyConfig.addPassthroughCopy({ admin: 'admin' });

  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: '_includes',
      data: '_data'
    }
  };
};
