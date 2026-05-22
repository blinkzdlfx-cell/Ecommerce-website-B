import {
  getCart,
  loadProductCatalog,
  getProductById,
  formatNgn
} from "./script.js";

const itemsEl = document.getElementById("checkout-items");
const subtotalEl = document.getElementById("checkout-total");
const grandTotalEl = document.getElementById("checkout-grand-total");

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

function setEmptyState() {
  if (itemsEl) itemsEl.innerHTML = "<p>Your cart is empty.</p>";
  if (subtotalEl) subtotalEl.textContent = "NGN 0";
  if (grandTotalEl) grandTotalEl.textContent = "NGN 0";
}

function renderCartItem(product, qty) {
  const unitPrice = Number(product.effectivePrice || product.price || 0);
  const itemTotal = unitPrice * qty;
  const row = document.createElement("div");
  row.className = "cart-item";
  row.innerHTML = `
    <img src="${safeImageSrc(product.image)}" class="product-image" alt="${escapeHtml(product.name)}">
    <div>
      <strong>${escapeHtml(product.name)}</strong><br>
      ${formatNgn(unitPrice)} x ${qty}
    </div>
    <div><strong>${formatNgn(itemTotal)}</strong></div>
  `;
  return {
    row,
    itemTotal
  };
}

async function renderCheckoutItems() {
  if (!itemsEl || !subtotalEl || !grandTotalEl) return;

  await loadProductCatalog({ forceRefresh: true });

  const cart = getCart();
  const entries = Object.entries(cart);
  itemsEl.innerHTML = "";

  if (!entries.length) {
    setEmptyState();
    return;
  }

  let total = 0;
  entries.forEach(([productId, rawQty]) => {
    const product = getProductById(productId);
    const qty = Number(rawQty || 0);
    if (!product || !Number.isInteger(qty) || qty <= 0) return;

    const { row, itemTotal } = renderCartItem(product, qty);
    total += itemTotal;
    itemsEl.appendChild(row);
  });

  if (!itemsEl.children.length) {
    setEmptyState();
    return;
  }

  subtotalEl.textContent = formatNgn(total);
  grandTotalEl.textContent = formatNgn(total);
}

document.addEventListener("DOMContentLoaded", renderCheckoutItems);
window.addEventListener("beulah:catalog-loaded", renderCheckoutItems);
window.addEventListener("beulah:cart-updated", renderCheckoutItems);
