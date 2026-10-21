module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/style.css': 'style.css' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar.js': 'calendar.js' });
  eleventyConfig.addPassthroughCopy({ 'src/calendar-render.js': 'calendar-render.js' });
  eleventyConfig.addPassthroughCopy({ admin: 'admin' });
  // Decap CMS がアップロードした画像（content/images）を /assets/images で配信する。
  eleventyConfig.addPassthroughCopy({ 'content/images': 'assets/images' });

  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: '_includes',
      data: '_data'
    }
  };
};
