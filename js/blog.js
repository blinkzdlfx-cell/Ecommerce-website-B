import { backendConfig } from "./backend-config.js";
import { buildResponsiveImageMarkup } from "./script.js";

const LOCAL_WORKER_URL = "http://127.0.0.1:8787";
const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_WORKER_URL";

const featuredEl = document.getElementById("blog-featured");
const listEl = document.getElementById("blog-list");
const emptyEl = document.getElementById("blog-empty");
const searchEl = document.getElementById("blog-search");

let allPosts = [];

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
  if (!raw) return "images/logo.png";
  if (/^(https?:\/\/|\/?images\/|data:image\/)/i.test(raw)) return raw;
  return "images/logo.png";
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

function getExcerpt(post) {
  const excerpt = String(post?.excerpt || "").trim();
  if (excerpt) return excerpt;
  const content = String(post?.content || "").trim();
  if (!content) return "Read this update from Beulah Foods.";
  return content.slice(0, 160) + (content.length > 160 ? "..." : "");
}

function renderFeatured(post) {
  if (!featuredEl) return;
  if (!post) {
    featuredEl.hidden = true;
    featuredEl.innerHTML = "";
    return;
  }

  const tags = Array.isArray(post.tags) ? post.tags.slice(0, 3) : [];
  featuredEl.innerHTML = `
    ${buildResponsiveImageMarkup(post.coverImage, post.title)}
    <div>
      <p class="blog-post-meta">Featured � ${formatDate(post.publishedAt || post.updatedAt)}</p>
      <h2>${escapeHtml(post.title)}</h2>
      <p>${escapeHtml(getExcerpt(post))}</p>
      <p class="blog-tag-line">${tags.map((tag) => `#${escapeHtml(tag)}`).join(" ")}</p>
      <a class="btn-outline" href="blog-post.html?slug=${encodeURIComponent(post.slug || "")}">Read Post</a>
    </div>
  `;
  featuredEl.hidden = false;
}

function renderList(posts) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!posts.length) {
    if (emptyEl) emptyEl.hidden = false;
    return;
  }

  if (emptyEl) emptyEl.hidden = true;

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "blog-card";
    card.innerHTML = `
      ${buildResponsiveImageMarkup(post.coverImage, post.title)}
      <div class="blog-card-body">
        <p class="blog-post-meta">${formatDate(post.publishedAt || post.updatedAt)}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(getExcerpt(post))}</p>
        <a class="footer-link" href="blog-post.html?slug=${encodeURIComponent(post.slug || "")}">Continue reading</a>
      </div>
    `;
    listEl.appendChild(card);
  });
}

function applySearch() {
  const term = String(searchEl?.value || "").trim().toLowerCase();
  if (!term) {
    renderFeatured(allPosts[0] || null);
    renderList(allPosts.slice(1));
    return;
  }

  const filtered = allPosts.filter((post) => {
    const blob = `${post.title || ""} ${post.excerpt || ""} ${post.content || ""} ${(post.tags || []).join(" ")}`.toLowerCase();
    return blob.includes(term);
  });

  renderFeatured(filtered[0] || null);
  renderList(filtered.slice(1));
}

async function loadPosts() {
  const apiBase = getApiBase();
  if (!apiBase) {
    renderFeatured(null);
    renderList([]);
    return;
  }

  try {
    const response = await fetch(`${apiBase}/listBlogPosts`, { method: "GET" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Could not load blog posts.");
    }

    allPosts = Array.isArray(payload.posts) ? payload.posts : [];
    allPosts.sort((left, right) => {
      const leftTs = new Date(left.publishedAt || left.updatedAt || 0).getTime();
      const rightTs = new Date(right.publishedAt || right.updatedAt || 0).getTime();
      return rightTs - leftTs;
    });
    applySearch();
  } catch {
    renderFeatured(null);
    renderList([]);
  }
}

searchEl?.addEventListener("input", applySearch);
document.addEventListener("DOMContentLoaded", loadPosts);
