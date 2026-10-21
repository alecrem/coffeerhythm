module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ 'src/assets': 'assets' });
  eleventyConfig.addPassthroughCopy({ 'src/style.css': 'style.css' });

  return {
    dir: {
      input: 'src',
      output: 'public',
      includes: '_includes',
      data: '_data'
    }
  };
};
