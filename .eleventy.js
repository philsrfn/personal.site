const markdownIt = require("markdown-it");

module.exports = function (eleventyConfig) {
  // Passthrough copy for static assets
  eleventyConfig.addPassthroughCopy("src/style.css");

  // Configure markdown-it
  const md = markdownIt({
    html: true,
    linkify: true,
    typographer: true,
  });
  eleventyConfig.setLibrary("md", md);

  // Date filter for blog posts
  eleventyConfig.addFilter("postDate", (dateObj) => {
    const d = new Date(dateObj);
    const months = [
      "jan", "feb", "mar", "apr", "may", "jun",
      "jul", "aug", "sep", "oct", "nov", "dec",
    ];
    return `${d.getFullYear()}-${months[d.getMonth()]}-${String(d.getDate()).padStart(2, "0")}`;
  });

  // ISO date filter
  eleventyConfig.addFilter("isoDate", (dateObj) => {
    return new Date(dateObj).toISOString().split("T")[0];
  });

  // Collection: all posts sorted by date descending
  eleventyConfig.addCollection("posts", (collectionApi) => {
    return collectionApi
      .getFilteredByTag("post")
      .sort((a, b) => b.date - a.date);
  });

  return {
    pathPrefix: "/personal.site/",
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
