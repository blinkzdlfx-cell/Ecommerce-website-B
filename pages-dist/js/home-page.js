import { backendConfig } from "./backend-config.js";
import { formatNgn, getProductsList, loadProductCatalog } from "./script.js";

const featuredProductsEl = document.getElementById("home-featured-products");
const featuredEmptyEl = document.getElementById("home-featured-empty");
const blogListEl = document.getElementById("home-blog-list");
const blogEmptyEl = document.getElementById("home-blog-empty");

const LOCAL_WORKER_URL = "http://127.0.0.1:8787";
const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_WORKER_URL";

const fallbackPosts = [
  {
    slug: "healthy-staples-for-busy-weeks",
    title: "Healthy Staples For Busy Weeks",
    excerpt: "A quick guide to building a reliable pantry with nutritious Nigerian staples.",
    updatedAt: "",
    coverImage: "images/beulah-logop.jpg"
  },
  {
    slug: "how-to-use-plantain-flour",
    title: "How To Use Plantain Flour Beyond Swallow",
    excerpt: "Simple ways to use plantain flour for breakfast, baking, and everyday meals.",
    updatedAt: "",
    coverImage: "images/beulah-logop.jpg"
  }
];

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
  if (!raw) return "images/beulah-logop.jpg";
  if (/^(https?:\/\/|\/?images\/|data:image\/)/i.test(raw)) return raw;
  return "images/beulah-logop.jpg";
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

function getProductDescription(product) {
  const text = String(product?.description || "").trim();
  if (!text) return "Available now on the Beulah Foods shop page.";
  return text.length > 160 ? `${text.slice(0, 157)}...` : text;
}

function getProductPriceMarkup(product) {
  const originalPrice = Number(product?.originalPrice || product?.price || 0);
  const effectivePrice = Number(product?.effectivePrice || product?.price || 0);
  if (product?.saleActive && effectivePrice > 0 && effectivePrice < originalPrice) {
    return `<span class="price-old">${formatNgn(originalPrice)}</span><span>${formatNgn(effectivePrice)}</span>`;
  }
  return `<span>${formatNgn(originalPrice)}</span>`;
}

function pickFeaturedProducts(products) {
  return [...products]
    .filter((product) => product && product.active !== false)
    .sort((left, right) => {
      if (left.saleActive !== right.saleActive) return left.saleActive ? -1 : 1;
      if (left.inStock !== right.inStock) return left.inStock ? -1 : 1;
      return String(left.name || "").localeCompare(String(right.name || ""));
    })
    .slice(0, 2);
}

function renderFeaturedProducts() {
  if (!featuredProductsEl) return;
  const featured = pickFeaturedProducts(getProductsList());
  featuredProductsEl.innerHTML = "";

  if (!featured.length) {
    if (featuredEmptyEl) featuredEmptyEl.style.display = "block";
    return;
  }

  if (featuredEmptyEl) featuredEmptyEl.style.display = "none";

  featured.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    const stockClass = product.inStock === false ? "out" : "in";
    const stockText = product.inStock === false ? "Out of Stock" : "In Stock";
    card.innerHTML = `
      <img src="${safeImage(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">
      <h3>${escapeHtml(product.name)}</h3>
      <p class="price">${getProductPriceMarkup(product)}</p>
      <p class="product-stock ${stockClass}">${stockText}</p>
      <p class="description">${escapeHtml(getProductDescription(product))}</p>
      <a href="shop.html" class="btn">View in Shop</a>
    `;
    featuredProductsEl.appendChild(card);
  });
}

function getPostExcerpt(post) {
  const excerpt = String(post?.excerpt || "").trim();
  if (excerpt) return excerpt;
  const content = String(post?.content || "").trim();
  if (!content) return "Read the latest update from Beulah Foods.";
  return content.length > 150 ? `${content.slice(0, 147)}...` : content;
}

function renderBlogPosts(posts) {
  if (!blogListEl) return;
  blogListEl.innerHTML = "";

  if (!posts.length) {
    if (blogEmptyEl) blogEmptyEl.style.display = "block";
    return;
  }

  if (blogEmptyEl) blogEmptyEl.style.display = "none";

  posts.slice(0, 3).forEach((post) => {
    const card = document.createElement("article");
    card.className = "blog-card";
    const thumbnail = "images/beulah-logop.jpg";
    card.innerHTML = `
      <img src="${thumbnail}" alt="${escapeHtml(post.title)}" loading="lazy">
      <div class="blog-card-body">
        <p class="blog-post-meta">${formatDate(post.publishedAt || post.updatedAt)}</p>
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(getPostExcerpt(post))}</p>
        <a class="footer-link" href="blog-post.html?slug=${encodeURIComponent(post.slug || "")}">Continue reading</a>
      </div>
    `;
    blogListEl.appendChild(card);
  });
}

async function loadBlogPreview() {
  const apiBase = getApiBase();
  if (!apiBase) {
    renderBlogPosts(fallbackPosts);
    return;
  }

  try {
    const response = await fetch(`${apiBase}/listBlogPosts`, { method: "GET" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Could not load blog posts.");
    }

    const posts = Array.isArray(payload.posts) ? payload.posts : [];
    posts.sort((left, right) => {
      const leftTs = new Date(left.publishedAt || left.updatedAt || 0).getTime();
      const rightTs = new Date(right.publishedAt || right.updatedAt || 0).getTime();
      return rightTs - leftTs;
    });
    renderBlogPosts(posts.length ? posts : fallbackPosts);
  } catch {
    renderBlogPosts(fallbackPosts);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadProductCatalog();
  renderFeaturedProducts();
  await loadBlogPreview();
});
