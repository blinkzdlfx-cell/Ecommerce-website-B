import {
  buildResponsiveImageMarkup,
  loadProductCatalog,
  getProductsList,
  addToCart,
  formatNgn
} from "./script.js";

const listEl = document.querySelector(".product-list");
const modalEl = document.querySelector(".product-modal");
const modalImageEl = document.getElementById("modal-image");
const modalTitleEl = document.getElementById("modal-title");
const modalPriceEl = document.getElementById("modal-price");
const modalDescriptionEl = document.getElementById("modal-description");
const closeModalEl = document.querySelector(".close-modal");

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

function setModalContent(product) {
  if (!product) return;
  const unitPrice = Number(product.effectivePrice || product.price || 0);
  const originalPrice = Number(product.originalPrice || product.price || unitPrice);
  if (modalImageEl) modalImageEl.src = safeImageSrc(product.image);
  if (modalImageEl) modalImageEl.alt = product.name || "Product image";
  if (modalTitleEl) modalTitleEl.textContent = product.name || "Product";
  if (modalPriceEl) {
    if (product.saleActive && originalPrice > unitPrice) {
      modalPriceEl.innerHTML = `<span class="price-old">${formatNgn(originalPrice)}</span> <span>${formatNgn(unitPrice)}</span>`;
    } else {
      modalPriceEl.textContent = formatNgn(unitPrice);
    }
  }
  if (modalDescriptionEl) {
    modalDescriptionEl.textContent = product.description || "No description available.";
  }
}

function openModal(product) {
  if (!modalEl || !product) return;
  setModalContent(product);
  modalEl.classList.add("active");
}

function closeModal() {
  if (!modalEl) return;
  modalEl.classList.remove("active");
}

function renderProducts(products) {
  if (!listEl) return;
  listEl.innerHTML = "";

  if (!products.length) {
    listEl.innerHTML = "<p>No products available right now. Please check back soon.</p>";
    return;
  }

  products.forEach((product) => {
    const unitPrice = Number(product.effectivePrice || product.price || 0);
    const originalPrice = Number(product.originalPrice || product.price || unitPrice);
    const stockMarkup = `<p class="product-stock ${product.inStock === false ? "out" : "in"}">${product.inStock === false ? "Out of Stock" : "In Stock"}</p>`;
    const saleMarkup = product.saleActive && originalPrice > unitPrice
      ? `<div class="price"><span class="price-old">${formatNgn(originalPrice)}</span> <span>${formatNgn(unitPrice)}</span></div><p class="admin-field-help">Flash Sale</p>`
      : `<div class="price">${formatNgn(unitPrice)}</div>`;

    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = product.id;
    card.innerHTML = `
      ${buildResponsiveImageMarkup(product.image, product.name)}
      <h3>${escapeHtml(product.name)}</h3>
      ${saleMarkup}
      ${stockMarkup}
      <p class="description">${escapeHtml(product.description || "")}</p>
      <button class="btn shop-add-btn" type="button" data-id="${product.id}" ${product.inStock === false ? "disabled" : ""}>
        ${product.inStock === false ? "Out of Stock" : "Add to Cart"}
      </button>
    `;
    listEl.appendChild(card);
  });
}

function bindShopEvents() {
  if (!listEl) return;

  listEl.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const image = target.closest(".product-card img");
    if (image) {
      const card = image.closest(".product-card");
      const productId = card?.dataset.id || "";
      const product = getProductsList().find((item) => item.id === productId);
      openModal(product || null);
      return;
    }

    const button = target.closest(".shop-add-btn");
    if (!button) return;

    const productId = button.dataset.id || "";
    if (!productId) return;

    const added = addToCart(productId);
    if (!added) {
      button.textContent = "Out of Stock";
      button.setAttribute("disabled", "true");
      return;
    }

    button.textContent = "Added!";
    button.setAttribute("disabled", "true");
    window.setTimeout(() => {
      button.textContent = "Add to Cart";
      button.removeAttribute("disabled");
    }, 1200);
  });
}

closeModalEl?.addEventListener("click", closeModal);
modalEl?.addEventListener("click", (event) => {
  if (event.target === modalEl) closeModal();
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadProductCatalog({ forceRefresh: true });
  renderProducts(getProductsList());
  bindShopEvents();
});
