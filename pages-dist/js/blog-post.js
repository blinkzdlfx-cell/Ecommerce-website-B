import { backendConfig } from "./backend-config.js";

const LOCAL_WORKER_URL = "http://127.0.0.1:8787";
const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_WORKER_URL";

const titleEl = document.getElementById("blog-post-title");
const metaEl = document.getElementById("blog-post-meta");
const excerptEl = document.getElementById("blog-post-excerpt");
const coverEl = document.getElementById("blog-post-cover");
const contentEl = document.getElementById("blog-post-content");

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

  document.title = `${post.title || "Blog Post"} | Beulah Foods`;
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
