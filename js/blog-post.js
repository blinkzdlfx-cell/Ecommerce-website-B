import { backendConfig } from "./backend-config.js";

const LOCAL_WORKER_URL = "http://127.0.0.1:8787";
const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_WORKER_URL";
const SITE_NAME = "Beulah Foods";
const SITE_URL = "https://beulahfoods.com";
const DEFAULT_IMAGE = `${SITE_URL}/images/logo.png`;
const DEFAULT_DESCRIPTION = "Read the latest Beulah Foods blog post for healthy food tips, product insights, and updates.";

const titleEl = document.getElementById("blog-post-title");
const metaEl = document.getElementById("blog-post-meta");
const excerptEl = document.getElementById("blog-post-excerpt");
const coverEl = document.getElementById("blog-post-cover");
const contentEl = document.getElementById("blog-post-content");
const schemaEl = document.getElementById("blog-post-schema");

function trimTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getApiBase() {
  const configured = trimTrailingSlash(backendConfig?.apiBaseUrl);
  if (configured && !configured.includes(PLACEHOLDER_TOKEN)) {
    return configured;
  }
  const host = window.location.hostname;
  if (host === "127.0.0.1" || host === "localhost") {
    return LOCAL_WORKER_URL;
  }
  return "";
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeImage(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:\/\/|\/?images\/|data:image\/)/i.test(raw)) return raw;
  return "";
}

function formatDate(value) {
  if (!value) return "Recent update";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recent update";
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function ensureMeta(selector, attributeName) {
  let tag = document.head.querySelector(selector);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute(selector.includes("property") ? "property" : "name", attributeName);
    document.head.appendChild(tag);
  }
  return tag;
}

function ensureCanonical() {
  let tag = document.head.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.rel = "canonical";
    document.head.appendChild(tag);
  }
  return tag;
}

function updateSeo(post, slug) {
  const postTitle = post?.title || "Blog Post";
  const postDescription = post?.excerpt || DEFAULT_DESCRIPTION;
  const postImage = safeImage(post?.coverImage) || DEFAULT_IMAGE;
  const pageUrl = slug ? `${SITE_URL}/blog-post.html?slug=${encodeURIComponent(slug)}` : `${SITE_URL}/blog-post.html`;
  const pageTitle = `${postTitle} | ${SITE_NAME}`;

  document.title = pageTitle;
  ensureCanonical().href = pageUrl;
  ensureMeta('meta[name="description"]', "description").content = postDescription;
  ensureMeta('meta[property="og:title"]', "og:title").content = pageTitle;
  ensureMeta('meta[property="og:description"]', "og:description").content = postDescription;
  ensureMeta('meta[property="og:type"]', "og:type").content = "article";
  ensureMeta('meta[property="og:url"]', "og:url").content = pageUrl;
  ensureMeta('meta[property="og:image"]', "og:image").content = postImage;
  ensureMeta('meta[name="twitter:card"]', "twitter:card").content = "summary_large_image";
  ensureMeta('meta[name="twitter:title"]', "twitter:title").content = pageTitle;
  ensureMeta('meta[name="twitter:description"]', "twitter:description").content = postDescription;
  ensureMeta('meta[name="twitter:image"]', "twitter:image").content = postImage;

  if (!schemaEl) return;

  if (!post) {
    schemaEl.textContent = "";
    return;
  }

  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": postTitle,
    "description": postDescription,
    "image": postImage,
    "url": pageUrl,
    "publisher": {
      "@type": "Organization",
      "name": SITE_NAME,
      "logo": {
        "@type": "ImageObject",
        "url": DEFAULT_IMAGE
      }
    }
  };

  const published = post.publishedAt || post.createdAt || post.updatedAt;
  if (published) schema.datePublished = published;
  if (post.updatedAt || published) schema.dateModified = post.updatedAt || published;

  schemaEl.textContent = JSON.stringify(schema, null, 2);
}

function renderContent(text) {
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (!paragraphs.length) {
    return "<p>No content available.</p>";
  }

  return paragraphs.map((item) => `<p>${escapeHtml(item)}</p>`).join("");
}

function renderPost(post) {
  const slug = String(new URLSearchParams(window.location.search).get("slug") || "").trim();
  updateSeo(post, slug);

  if (!post) {
    if (titleEl) titleEl.textContent = "Post not found";
    if (metaEl) metaEl.textContent = "";
    if (excerptEl) excerptEl.textContent = "This blog post is not available.";
    if (contentEl) {
      contentEl.innerHTML = '<p>Please go back to the blog list and open another post.</p>';
    }
    if (coverEl) coverEl.hidden = true;
    return;
  }

  if (titleEl) titleEl.textContent = post.title || "Blog Post";
  if (metaEl) metaEl.textContent = formatDate(post.publishedAt || post.updatedAt);
  if (excerptEl) excerptEl.textContent = post.excerpt || "";

  const image = safeImage(post.coverImage);
  if (coverEl) {
    if (image) {
      coverEl.src = image;
      coverEl.alt = post.title || "Blog cover image";
      coverEl.hidden = false;
    } else {
      coverEl.hidden = true;
      coverEl.removeAttribute("src");
    }
  }

  if (contentEl) {
    contentEl.innerHTML = renderContent(post.content || "");
  }
}

async function loadPost() {
  const slug = String(new URLSearchParams(window.location.search).get("slug") || "").trim();
  if (!slug) {
    renderPost(null);
    return;
  }

  const apiBase = getApiBase();
  if (!apiBase) {
    renderPost(null);
    return;
  }

  try {
    const response = await fetch(`${apiBase}/getBlogPost?slug=${encodeURIComponent(slug)}`, {
      method: "GET"
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Could not load blog post.");
    }
    renderPost(payload.post || null);
  } catch {
    renderPost(null);
  }
}

document.addEventListener("DOMContentLoaded", loadPost);