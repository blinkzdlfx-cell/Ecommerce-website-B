import { backendConfig } from "./backend-config.js";

export const CART_KEY = "beulah_cart";
const CATALOG_CACHE_KEY = "beulah_product_catalog_cache_v1";
const CATALOG_CACHE_TTL_MS = 5 * 60 * 1000;
const LOCAL_WORKER_URL = "http://127.0.0.1:8787";
const PLACEHOLDER_TOKEN = "REPLACE_WITH_YOUR_WORKER_URL";

const FALLBACK_PRODUCTS = Object.freeze({
  "plantain-flour": {
    id: "plantain-flour",
    name: "Plantain Flour",
    description: "Sun-dried premium plantains, milled fresh.",
    price: 5000,
    image: "images/plantain-flour.jpg",
    active: true
  },
  "rice-flour": {
    id: "rice-flour",
    name: "Rice Flour",
    description: "Smooth local rice flour. Gluten-free and versatile.",
    price: 4000,
    image: "images/rice-flour.jpg",
    active: true
  },
  "guinea-corn-flour": {
    id: "guinea-corn-flour",
    name: "Guinea Corn Flour",
    description: "Stone-ground guinea corn flour with rich nutrients.",
    price: 3500,
    image: "images/guinea-corn-flour.jpg",
    active: true
  },
  "iru-ekiti-125g": {
    id: "iru-ekiti-125g",
    name: "Iru Ekiti (125g)",
    description: "Traditional fermented locust beans from Ekiti.",
    price: 5000,
    image: "images/iru-ekiti-125g.jpg",
    active: true
  },
  "iru-ekiti-500g": {
    id: "iru-ekiti-500g",
    name: "Iru Ekiti (500g)",
    description: "Large pack of authentic fermented locust beans.",
    price: 10000,
    image: "images/iru-ekiti-500g.jpg",
    active: true
  }
});

let products = { ...FALLBACK_PRODUCTS };
window.products = products;

let uiAudioContext = null;

function getUiAudioContext() {
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) return null;

  if (!uiAudioContext) {
    uiAudioContext = new AudioContextCtor();
  }

  return uiAudioContext;
}

export function playUiClickSound(kind = "tap") {
  try {
    const context = getUiAudioContext();
    if (!context) return;

    if (context.state === "suspended") {
      void context.resume();
    }

    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = kind === "checkout" ? "triangle" : "sine";
    oscillator.frequency.setValueAtTime(kind === "checkout" ? 720 : 620, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === "checkout" ? 520 : 460, now + 0.11);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.13);
  } catch {
    // Ignore audio API errors.
  }
}

function trimTrailingSlash(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function getConfiguredApiBaseUrl() {
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

function getProductsEndpoint() {
  const base = getConfiguredApiBaseUrl();
  if (!base) return "";
  return `${base}/listProducts`;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStockQuantity(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return Math.max(0, Math.trunc(parsed));
}

function normalizeProduct(raw) {
  const value = raw && typeof raw === "object" ? raw : {};
  const id = String(value.id || "")
    .toLowerCase()
    .trim();
  if (!id) return null;

  const name = String(value.name || "").trim();
  const price = Math.round(toNumber(value.price, 0));
  const stockQuantity = normalizeStockQuantity(value.stockQuantity);

  if (!name || price <= 0) return null;

  return {
    id,
    name,
    description: String(value.description || "").trim(),
    price,
    originalPrice: Math.round(toNumber(value.originalPrice, price)),
    effectivePrice: Math.round(toNumber(value.effectivePrice, price)),
    salePrice: Math.round(toNumber(value.salePrice, 0)),
    saleStart: String(value.saleStart || "").trim(),
    saleEnd: String(value.saleEnd || "").trim(),
    saleActive: Boolean(value.saleActive),
    image: String(value.image || "").trim(),
    stockQuantity,
    inStock: stockQuantity === null || stockQuantity > 0,
    active: value.active !== false,
    managed: value.managed !== false
  };
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function safeImageSrc(value) {
  const raw = String(value || "").trim();
  if (!raw) return "images/logo.png";
  if (/^(https?:\/\/|\/?images\/|data:image\/)/i.test(raw)) return raw;
  return "images/logo.png";
}

function toProductMap(rows) {
  const map = {};
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const product = normalizeProduct(row);
    if (!product || product.active === false) return;
    map[product.id] = product;
  });
  return map;
}

function readCatalogCache() {
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const expiresAt = Number(parsed?.expiresAt || 0);
    if (Date.now() > expiresAt) return null;

    const map = toProductMap(parsed?.products);
    return map;
  } catch {
    return null;
  }
}

function writeCatalogCache(rows) {
  try {
    localStorage.setItem(
      CATALOG_CACHE_KEY,
      JSON.stringify({
        expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
        products: rows
      })
    );
  } catch {
    // Ignore storage quota/private mode issues.
  }
}

function syncWindowProducts() {
  window.products = products;
  window.dispatchEvent(
    new CustomEvent("beulah:catalog-loaded", {
      detail: {
        products: getProductsList()
      }
    })
  );
}

export function getProductsMap() {
  return products;
}

export function getProductsList() {
  return Object.values(products);
}

export function getProductById(productId) {
  return products[String(productId || "").trim()] || null;
}

export function clearProductCatalogCache() {
  try {
    localStorage.removeItem(CATALOG_CACHE_KEY);
  } catch {
    // Ignore storage issues.
  }
}

export async function loadProductCatalog(options = {}) {
  const forceRefresh = Boolean(options?.forceRefresh);
  const cached = !forceRefresh ? readCatalogCache() : null;

  if (cached !== null) {
    products = cached;
    syncWindowProducts();
  }

  const endpoint = getProductsEndpoint();
  if (!endpoint) {
    products = cached !== null ? cached : { ...FALLBACK_PRODUCTS };
    syncWindowProducts();
    return products;
  }

  try {
    const response = await fetch(endpoint, { method: "GET" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload?.error || "Could not load products.");
    }

    const mapped = toProductMap(payload?.products || []);
    products = mapped;
    writeCatalogCache(payload?.products || []);
    syncWindowProducts();
    return products;
  } catch {
    products = cached !== null ? cached : { ...FALLBACK_PRODUCTS };
    syncWindowProducts();
    return products;
  }
}

export function getCart() {
  try {
    const cart = localStorage.getItem(CART_KEY);
    return cart ? JSON.parse(cart) : {};
  } catch {
    return {};
  }
}

export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart || {}));
  window.dispatchEvent(
    new CustomEvent("beulah:cart-updated", {
      detail: {
        cart: getCart()
      }
    })
  );
}

export function addToCart(productKey) {
  const id = String(productKey || "").trim();
  if (!id) return;
  const product = getProductById(id);
  if (!product || product.inStock === false) {
    return false;
  }

  const cart = getCart();
  if (product.stockQuantity !== null && (cart[id] || 0) >= product.stockQuantity) {
    return false;
  }
  cart[id] = (cart[id] || 0) + 1;
  saveCart(cart);
  playUiClickSound("cart");
  return true;
}

export function formatNgn(value) {
  return `NGN ${Number(value || 0).toLocaleString("en-NG")}`;
}

export async function displayCart() {
  const cartItemsDiv = document.getElementById("cart-items");
  const cartTotalDiv = document.getElementById("cart-total");
  const checkoutBtn = document.getElementById("go-to-checkout");
  const stockNoteEl = document.getElementById("cart-stock-note");

  if (!cartItemsDiv || !cartTotalDiv) return 0;

  await loadProductCatalog();

  const cart = getCart();
  cartItemsDiv.innerHTML = "";

  let total = 0;
  let hasUnavailableItems = false;
  const keys = Object.keys(cart);

  if (!keys.length) {
    cartItemsDiv.innerHTML = "<p>Your cart is empty.</p>";
    cartTotalDiv.textContent = "Total: NGN 0";
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Proceed to Checkout";
    }
    if (stockNoteEl) {
      stockNoteEl.hidden = true;
      stockNoteEl.textContent = "";
    }
    return 0;
  }

  keys.forEach((key) => {
    const product = products[key];
    if (!product) return;

    const quantity = Number(cart[key] || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) return;
    const availableStock = product.stockQuantity;
    const isOutOfStock = product.inStock === false;
    const exceedsStock = availableStock !== null && quantity > availableStock;

    const unitPrice = Number(product.effectivePrice || product.price || 0);
    const itemTotal = unitPrice * quantity;
    total += itemTotal;
    hasUnavailableItems = hasUnavailableItems || isOutOfStock || exceedsStock;

    const itemDiv = document.createElement("div");
    itemDiv.className = "cart-item";
    const stockLine = isOutOfStock
      ? '<p class="cart-stock-status out">Out of stock</p>'
      : availableStock !== null
        ? `<p class="cart-stock-status ${exceedsStock ? "out" : "in"}">${exceedsStock ? `Only ${availableStock} left in stock` : "In stock"}</p>`
        : '<p class="cart-stock-status in">In stock</p>';
    const canIncrease = !isOutOfStock && (availableStock === null || quantity < availableStock);
    itemDiv.innerHTML = `
      <img src="${safeImageSrc(product.image)}" alt="${escapeHtml(product.name)}" class="product-image">
      <div class="item-details">
        <p><strong>${escapeHtml(product.name)}</strong></p>
        <p>${formatNgn(unitPrice)} x ${quantity} = ${formatNgn(itemTotal)}</p>
        ${stockLine}
        <div class="cart-controls">
          <button class="qty-btn" data-action="decrease" data-id="${key}">-</button>
          <span class="qty">${quantity}</span>
          <button class="qty-btn" data-action="increase" data-id="${key}" ${canIncrease ? "" : "disabled"}>+</button>
          <button class="remove-btn" data-id="${key}">Remove</button>
        </div>
      </div>
    `;
    cartItemsDiv.appendChild(itemDiv);
  });

  if (!cartItemsDiv.children.length) {
    cartItemsDiv.innerHTML = "<p>Your cart has unavailable items. Please shop again.</p>";
    cartTotalDiv.textContent = "Total: NGN 0";
    if (checkoutBtn) {
      checkoutBtn.disabled = true;
      checkoutBtn.textContent = "Resolve Cart Before Checkout";
    }
    if (stockNoteEl) {
      stockNoteEl.hidden = false;
      stockNoteEl.textContent = "Some cart items are unavailable. Remove them before checkout.";
    }
    return 0;
  }

  cartTotalDiv.textContent = `Total: ${formatNgn(total)}`;
  if (checkoutBtn) {
    checkoutBtn.disabled = hasUnavailableItems;
    checkoutBtn.textContent = hasUnavailableItems ? "Resolve Cart Before Checkout" : "Proceed to Checkout";
  }
  if (stockNoteEl) {
    stockNoteEl.hidden = !hasUnavailableItems;
    stockNoteEl.textContent = hasUnavailableItems
      ? "One or more items are out of stock or above available quantity. Update your cart before checkout."
      : "";
  }
  return total;
}

document.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  if (target.classList.contains("qty-btn")) {
    const id = target.dataset.id || "";
    const action = target.dataset.action || "";
    const cart = getCart();
    if (!cart[id]) return;
    const product = getProductById(id);
    if (!product) return;

    if (action === "increase") {
      if (product.inStock === false) return;
      if (product.stockQuantity !== null && cart[id] >= product.stockQuantity) return;
      cart[id] += 1;
    }
    if (action === "decrease") {
      cart[id] -= 1;
      if (cart[id] <= 0) delete cart[id];
    }

    saveCart(cart);
    displayCart();
  }

  if (target.classList.contains("remove-btn")) {
    const id = target.dataset.id || "";
    const cart = getCart();
    delete cart[id];
    saveCart(cart);
    displayCart();
  }
});

window.addToCart = addToCart;
window.getCart = getCart;
window.displayCart = displayCart;
window.loadProductCatalog = loadProductCatalog;
window.formatNgn = formatNgn;
window.clearProductCatalogCache = clearProductCatalogCache;
window.__beulahPlayTapSound = playUiClickSound;

document.addEventListener("DOMContentLoaded", async () => {
  await loadProductCatalog();
  displayCart();
});
