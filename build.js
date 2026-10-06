import fs from "fs";
import path from "path";
import fm from "front-matter";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import katex from "@traptitech/markdown-it-katex";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const POSTS_DIR = "posts";
const DIST_DIR = "dist";
const TEMPLATE_DIR = "templates";
const SITE_NAME = "foodchain";
const SITE_DESCRIPTION =
  "Jeff Chung's personal blog: notes about tech, thoughts about life, and what I love.";

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------
const md = new MarkdownIt({ html: true, linkify: true }).use(katex);
const { escapeHtml } = md.utils;

function slugifyHeading(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/<[^>]*>/g, "")
    .replace(/&/g, "-and-")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Headings: add an id and a hover "#" anchor (like the reference site).
md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const inline = tokens[idx + 1];
  const text = inline && inline.type === "inline" ? inline.content : "";
  let slug = slugifyHeading(text) || "section";

  env.slugs = env.slugs || {};
  if (env.slugs[slug]) {
    env.slugs[slug] += 1;
    slug = `${slug}-${env.slugs[slug]}`;
  } else {
    env.slugs[slug] = 1;
  }

  token.attrSet("id", slug);
  return `${self.renderToken(tokens, idx, options)}<a class="anchor" href="#${slug}" aria-hidden="true" tabindex="-1"></a>`;
};

// Fenced code: wrap in .code-block so a copy button can be attached; mermaid
// blocks are rendered by mermaid.js in the browser.
md.renderer.rules.fence = (tokens, idx) => {
  const token = tokens[idx];
  const info = token.info ? token.info.trim() : "";
  const lang = info.split(/\s+/)[0] || "";
  const code = token.content;

  if (lang === "mermaid") {
    return `<pre class="mermaid">${escapeHtml(code)}</pre>\n`;
  }

  let highlighted = "";
  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value;
    } catch (_) {
      highlighted = "";
    }
  }
  if (!highlighted) highlighted = escapeHtml(code);

  const langClass = lang ? ` language-${escapeHtml(lang)}` : "";
  return (
    `<div class="code-block"${lang ? ` data-language="${escapeHtml(lang)}"` : ""}>` +
    `<pre><code class="hljs${langClass}">${highlighted}</code></pre>` +
    `</div>\n`
  );
};

// Images: resolve relative `img/...` paths (posts live two levels deep in
// dist/posts/<category>/), and render as a framed figure with optional caption.
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  let src = token.attrGet("src") || "";
  if (src.startsWith("img/")) src = `../${src}`;

  const alt = self.renderInlineAsText(token.children || [], options, env);
  const title = token.attrGet("title") || "";
  const size = /\bfull\b/i.test(title)
    ? " full"
    : /\bsmall\b/i.test(title)
      ? " small"
      : "";
  const caption = title.replace(/\b(full|small)\b/gi, "").trim();

  return (
    `<figure class="figure${size}">` +
    `<div class="frame"><img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" loading="lazy" /></div>` +
    (caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "") +
    `</figure>`
  );
};

// Tables: wrap for horizontal scrolling on small screens.
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
md.renderer.rules.table_close = () => "</table></div>\n";

// External links open in a new tab.
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const href = tokens[idx].attrGet("href") || "";
  if (/^https?:\/\//.test(href)) {
    tokens[idx].attrSet("target", "_blank");
    tokens[idx].attrSet("rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

function renderMarkdown(body) {
  let html = md.render(body, {});
  // A figure inside a paragraph is invalid HTML; lift it out.
  html = html.replace(/<p>\s*(<figure[\s\S]*?<\/figure>)\s*<\/p>/g, "$1");
  return html;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function isValidDate(d) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function formatDate(date) {
  if (!isValidDate(date)) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function isoDate(date) {
  return isValidDate(date) ? date.toISOString().slice(0, 10) : "";
}

function slugify(filename) {
  return filename.replace(/\.md$/, "");
}

function excerpt(html, max = 160) {
  const text = html
    .replace(/<pre[\s\S]*?<\/pre>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max).replace(/\s+\S*$/, "")}…`;
}

// Template substitution that does not interpret `$` sequences in values.
function fill(template, values) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

function renderPage({ title, description, content, base, ogType = "website" }) {
  return fill(baseTemplate, {
    title: escapeHtml(title),
    description: escapeHtml(description || SITE_DESCRIPTION),
    ogType,
    content,
    base,
  });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------
fs.mkdirSync(DIST_DIR, { recursive: true });

const baseTemplate = fs.readFileSync(`${TEMPLATE_DIR}/base.html`, "utf-8");
const postTemplate = fs.readFileSync(`${TEMPLATE_DIR}/post.html`, "utf-8");
const indexTemplate = fs.readFileSync(`${TEMPLATE_DIR}/index.html`, "utf-8");
const blogTemplate = fs.readFileSync(`${TEMPLATE_DIR}/blog.html`, "utf-8");

const posts = [];

const categoryDirs = fs
  .readdirSync(POSTS_DIR)
  .filter((f) => fs.statSync(path.join(POSTS_DIR, f)).isDirectory() && f !== "img")
  .sort();

for (const category of categoryDirs) {
  const categoryDir = path.join(POSTS_DIR, category);
  const distCategoryDir = path.join(DIST_DIR, "posts", category);
  fs.mkdirSync(distCategoryDir, { recursive: true });

  const files = fs.readdirSync(categoryDir).filter((f) => f.endsWith(".md"));

  for (const file of files) {
    const content = fs.readFileSync(path.join(categoryDir, file), "utf-8");
    const { attributes, body } = fm(content);
    const html = renderMarkdown(body);
    const slug = slugify(file);
    const title = attributes.title || slug;
    const date = new Date(attributes.date);

    if (!isValidDate(date)) {
      console.warn(`Warning: invalid date "${attributes.date}" in posts/${category}/${file}`);
    }

    posts.push({ slug, title, date, category, html });

    const postHtml = fill(postTemplate, {
      title: escapeHtml(title),
      date: formatDate(date) || "undated",
      isoDate: isoDate(date),
      category: escapeHtml(category),
      content: html,
      base: "../..",
    });

    fs.writeFileSync(
      `${distCategoryDir}/${slug}.html`,
      renderPage({
        title: `${title} | ${SITE_NAME}`,
        description: attributes.description || excerpt(html),
        content: postHtml,
        base: "../..",
        ogType: "article",
      })
    );
    console.log(`Built: posts/${category}/${slug}.html`);
  }
}

// Newest first; undated posts sink to the bottom.
posts.sort((a, b) => {
  const av = isValidDate(a.date) ? a.date.getTime() : -Infinity;
  const bv = isValidDate(b.date) ? b.date.getTime() : -Infinity;
  return bv - av;
});

// Group by year (like the reference design), keeping category as a filter.
const postsByYear = new Map();
for (const post of posts) {
  const year = isValidDate(post.date) ? String(post.date.getUTCFullYear()) : "undated";
  if (!postsByYear.has(year)) postsByYear.set(year, []);
  postsByYear.get(year).push(post);
}

let postIndex = 0;
let yearIndex = 0;
let postListHtml = "";
for (const [year, yearPosts] of postsByYear) {
  const items = yearPosts
    .map((p) => {
      const delay = (0.3 + postIndex++ * 0.05).toFixed(2);
      return `      <li data-title="${escapeHtml(p.title)}" data-category="${escapeHtml(p.category)}" style="animation-delay: ${delay}s">
        <div class="post-item">
          <a href="posts/${p.category}/${p.slug}.html" class="group">
            <span class="corners" aria-hidden="true"></span>
            <h3>${escapeHtml(p.title)}</h3>
            <span class="tag">${escapeHtml(p.category)}</span>
            <time datetime="${isoDate(p.date)}">${formatDate(p.date) || "undated"}</time>
          </a>
        </div>
      </li>`;
    })
    .join("\n");

  const delay = (0.2 + yearIndex++ * 0.1).toFixed(2);
  postListHtml += `  <div class="year-group" style="animation-delay: ${delay}s">
    <h2 id="year-${year}">${year}</h2>
    <ul class="post-list">
${items}
    </ul>
  </div>\n`;
}

const categories = [...new Set(posts.map((p) => p.category))];
const categoryOptions = categories
  .map(
    (c) =>
      `<button type="button" role="option" data-value="${escapeHtml(c)}" aria-selected="false">${escapeHtml(c)}</button>`
  )
  .join("\n          ");

// Writing (blog index)
fs.writeFileSync(
  `${DIST_DIR}/blog.html`,
  renderPage({
    title: `writing | ${SITE_NAME}`,
    description: "Notes about tech, thoughts about life, and things I am still figuring out.",
    content: fill(blogTemplate, { posts: postListHtml, categoryOptions, base: "." }),
    base: ".",
  })
);
console.log("Built: blog.html");

// Home
fs.writeFileSync(
  `${DIST_DIR}/index.html`,
  renderPage({
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    content: fill(indexTemplate, { base: "." }),
    base: ".",
  })
);
console.log("Built: index.html");

// Static pages
for (const page of ["about", "favourites"]) {
  const file = `${TEMPLATE_DIR}/${page}.html`;
  if (!fs.existsSync(file)) continue;
  const pageContent = fill(fs.readFileSync(file, "utf-8"), { base: "." });
  fs.writeFileSync(
    `${DIST_DIR}/${page}.html`,
    renderPage({
      title: `${page} | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      content: pageContent,
      base: ".",
    })
  );
  console.log(`Built: ${page}.html`);
}

// Static assets
fs.copyFileSync("styles.css", `${DIST_DIR}/styles.css`);
fs.copyFileSync("site.js", `${DIST_DIR}/site.js`);
copyDir(path.join(POSTS_DIR, "img"), path.join(DIST_DIR, "posts", "img"));
if (fs.existsSync("CNAME")) fs.copyFileSync("CNAME", `${DIST_DIR}/CNAME`);
console.log("Copied: styles.css, site.js, posts/img, CNAME");

console.log("\nBuild complete!");
