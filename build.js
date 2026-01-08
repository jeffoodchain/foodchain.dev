import fs from "fs";
import path from "path";
import fm from "front-matter";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import katex from "@traptitech/markdown-it-katex";

// Setup markdown parser
const md = new MarkdownIt({
  html: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value;
      } catch (_) {}
    }
    return "";
  },
}).use(katex);

// Paths
const POSTS_DIR = "posts";
const DIST_DIR = "dist";
const TEMPLATE_DIR = "templates";

// Base path for GitHub Pages (set via env or defaults to "/")
// For local: BASE_PATH="" bun run build
// For GH Pages: BASE_PATH="/foodchain.dev" bun run build
const BASE_PATH = process.env.BASE_PATH || "";

// Ensure directories exist
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });
if (!fs.existsSync(`${DIST_DIR}/posts`))
  fs.mkdirSync(`${DIST_DIR}/posts`, { recursive: true });

// Read templates
const baseTemplate = fs.readFileSync(`${TEMPLATE_DIR}/base.html`, "utf-8");
const postTemplate = fs.readFileSync(`${TEMPLATE_DIR}/post.html`, "utf-8");
const indexTemplate = fs.readFileSync(`${TEMPLATE_DIR}/index.html`, "utf-8");

// Helper to format date
function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper to create slug from filename
function slugify(filename) {
  return filename.replace(/\.md$/, "");
}

// Collect all posts
const posts = [];

// Process markdown files
const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith(".md"));

for (const file of files) {
  const content = fs.readFileSync(path.join(POSTS_DIR, file), "utf-8");
  const { attributes, body } = fm(content);
  const html = md.render(body);
  const slug = slugify(file);

  posts.push({
    slug,
    title: attributes.title,
    date: new Date(attributes.date),
    category: attributes.category,
    html,
  });

  // Generate post HTML
  const postHtml = postTemplate
    .replace("{{title}}", attributes.title)
    .replace("{{date}}", formatDate(attributes.date))
    .replace("{{content}}", html);

  const finalHtml = baseTemplate
    .replace("{{title}}", `${attributes.title} | foodchain`)
    .replace("{{content}}", postHtml)
    .replace(/\{\{base\}\}/g, BASE_PATH);

  fs.writeFileSync(`${DIST_DIR}/posts/${slug}.html`, finalHtml);
  console.log(`Built: posts/${slug}.html`);
}

// Sort posts by date (newest first)
posts.sort((a, b) => b.date - a.date);

// Group posts by category
const postsByCategory = {};
for (const post of posts) {
  if (!postsByCategory[post.category]) {
    postsByCategory[post.category] = [];
  }
  postsByCategory[post.category].push(post);
}

// Generate post list HTML
// Get all categories from posts, sorted (tech first, then alphabetically)
const categories = Object.keys(postsByCategory).sort((a, b) => {
  if (a === "tech") return -1;
  if (b === "tech") return 1;
  return a.localeCompare(b);
});
let postListHtml = "";

for (const category of categories) {
  const categoryPosts = postsByCategory[category];

  postListHtml += `<section class="category">
  <h2>${category}</h2>
  <ul class="post-list">
    ${categoryPosts
      .map(
        (p) => `<li>
      <a href="${BASE_PATH}/posts/${p.slug}.html">${p.title}</a>
      <time>${formatDate(p.date)}</time>
    </li>`
      )
      .join("\n    ")}
  </ul>
</section>\n`;
}

// Generate index page
const indexHtml = baseTemplate
  .replace("{{title}}", "foodchain")
  .replace("{{content}}", indexTemplate.replace("{{posts}}", postListHtml))
  .replace(/\{\{base\}\}/g, BASE_PATH);

fs.writeFileSync(`${DIST_DIR}/index.html`, indexHtml);
console.log("Built: index.html");

// Copy static pages
for (const page of ["about", "favourites"]) {
  if (fs.existsSync(`${TEMPLATE_DIR}/${page}.html`)) {
    const pageContent = fs.readFileSync(`${TEMPLATE_DIR}/${page}.html`, "utf-8");
    const pageHtml = baseTemplate
      .replace("{{title}}", `${page.charAt(0).toUpperCase() + page.slice(1)} | foodchain`)
      .replace("{{content}}", pageContent)
      .replace(/\{\{base\}\}/g, BASE_PATH);
    fs.writeFileSync(`${DIST_DIR}/${page}.html`, pageHtml);
    console.log(`Built: ${page}.html`);
  }
}

// Copy styles
fs.copyFileSync("styles.css", `${DIST_DIR}/styles.css`);
console.log("Copied: styles.css");

console.log("\nBuild complete!");

