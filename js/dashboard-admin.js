import { auth, waitForSessionAccess } from "./firebase-init.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { callAuthedFunction } from "./api.js";

const adminView = document.body?.dataset.adminView || "overview";
const currentAdminPage = (() => {
  const file = String(window.location.pathname || "").split("/").pop();
  return file || "dashboard.html";
})();

const accessNoteEl = document.getElementById("admin-access-note");
const resultsMetaEl = document.getElementById("admin-results-meta");
const statusFilterEl = document.getElementById("admin-status-filter");
const searchInputEl = document.getElementById("admin-order-search");
const dateFromEl = document.getElementById("admin-date-from");
const dateToEl = document.getElementById("admin-date-to");
const clearFiltersBtn = document.getElementById("admin-clear-filters-btn");
const refreshBtn = document.getElementById("admin-refresh-btn");
const bootstrapBtn = document.getElementById("admin-bootstrap-btn");
const ordersSectionEl = document.getElementById("admin-orders-section");
const ordersBodyEl = document.getElementById("admin-orders-body");
const emptyStateEl = document.getElementById("admin-empty-state");
const statsEl = document.getElementById("admin-stats");

const statTotalEl = document.getElementById("stat-total");
const statPaidEl = document.getElementById("stat-paid");
const statPendingEl = document.getElementById("stat-pending");
const overviewProductsCountEl = document.getElementById("overview-products-count");
const overviewAnnouncementsCountEl = document.getElementById("overview-announcements-count");
const overviewCouponsCountEl = document.getElementById("overview-coupons-count");
const overviewBlogCountEl = document.getElementById("overview-blog-count");

const productsSectionEl = document.getElementById("admin-products-section");
const productsBodyEl = document.getElementById("admin-products-body");
const productsEmptyEl = document.getElementById("admin-products-empty");
const productNoteEl = document.getElementById("admin-product-note");
const productFormEl = document.getElementById("admin-product-form");
const productIdEl = document.getElementById("admin-product-id");
const productNameEl = document.getElementById("admin-product-name");
const productPriceEl = document.getElementById("admin-product-price");
const productStockEl = document.getElementById("admin-product-stock");
const productSalePriceEl = document.getElementById("admin-product-sale-price");
const productSaleStartEl = document.getElementById("admin-product-sale-start");
const productSaleEndEl = document.getElementById("admin-product-sale-end");
const productImageEl = document.getElementById("admin-product-image");
const productImageFileEl = document.getElementById("admin-product-image-file");
const productImagePreviewEl = document.getElementById("admin-product-image-preview");
const productDescriptionEl = document.getElementById("admin-product-description");
const productActiveEl = document.getElementById("admin-product-active");
const productSeedBtn = document.getElementById("admin-product-seed-btn");
const productNewBtn = document.getElementById("admin-product-new-btn");
const productDeleteAllBtn = document.getElementById("admin-product-delete-all-btn");
const productCancelBtn = document.getElementById("admin-product-cancel-btn");
const productSaveBtn = document.getElementById("admin-product-save-btn");

const marketingSectionEl = document.getElementById("admin-marketing-section");
const announcementFormEl = document.getElementById("admin-announcement-form");
const announcementIdEl = document.getElementById("admin-announcement-id");
const announcementTitleEl = document.getElementById("admin-announcement-title");
const announcementMessageEl = document.getElementById("admin-announcement-message");
const announcementTypeEl = document.getElementById("admin-announcement-type");
const announcementStartEl = document.getElementById("admin-announcement-start");
const announcementEndEl = document.getElementById("admin-announcement-end");
const announcementActiveEl = document.getElementById("admin-announcement-active");
const announcementClearBtn = document.getElementById("admin-announcement-clear");
const announcementNoteEl = document.getElementById("admin-announcement-note");
const announcementsBodyEl = document.getElementById("admin-announcements-body");

const couponFormEl = document.getElementById("admin-coupon-form");
const couponIdEl = document.getElementById("admin-coupon-id");
const couponCodeEl = document.getElementById("admin-coupon-code");
const couponTypeEl = document.getElementById("admin-coupon-type");
const couponValueEl = document.getElementById("admin-coupon-value");
const couponMinSubtotalEl = document.getElementById("admin-coupon-min-subtotal");
const couponDescriptionEl = document.getElementById("admin-coupon-description");
const couponStartEl = document.getElementById("admin-coupon-start");
const couponEndEl = document.getElementById("admin-coupon-end");
const couponActiveEl = document.getElementById("admin-coupon-active");
const couponClearBtn = document.getElementById("admin-coupon-clear");
const couponNoteEl = document.getElementById("admin-coupon-note");
const couponsBodyEl = document.getElementById("admin-coupons-body");

const siteExperienceFormEl = document.getElementById("admin-site-experience-form");
const siteSessionModeEl = document.getElementById("admin-site-session-mode");
const siteInactivityMinutesEl = document.getElementById("admin-site-inactivity-minutes");
const siteModalEnabledEl = document.getElementById("admin-site-modal-enabled");
const siteModalTitleEl = document.getElementById("admin-site-modal-title");
const siteModalMessageEl = document.getElementById("admin-site-modal-message");
const siteModalImageEl = document.getElementById("admin-site-modal-image");
const siteModalImageFileEl = document.getElementById("admin-site-modal-image-file");
const siteModalImagePreviewEl = document.getElementById("admin-site-modal-image-preview");
const siteModalButtonLabelEl = document.getElementById("admin-site-modal-button-label");
const siteModalButtonUrlEl = document.getElementById("admin-site-modal-button-url");
const siteExperienceClearBtn = document.getElementById("admin-site-experience-clear");
const siteExperienceSaveBtn = document.getElementById("admin-site-experience-save");
const siteExperienceDeactivateBtn = document.getElementById("admin-site-experience-deactivate");
const siteExperienceDeleteBtn = document.getElementById("admin-site-experience-delete");
const siteExperienceNoteEl = document.getElementById("admin-site-experience-note");

const blogSectionEl = document.getElementById("admin-blog-section");
const blogFormEl = document.getElementById("admin-blog-form");
const blogIdEl = document.getElementById("admin-blog-id");
const blogTitleEl = document.getElementById("admin-blog-title");
const blogSlugEl = document.getElementById("admin-blog-slug");
const blogExcerptEl = document.getElementById("admin-blog-excerpt");
const blogCoverEl = document.getElementById("admin-blog-cover");
const blogTagsEl = document.getElementById("admin-blog-tags");
const blogStatusEl = document.getElementById("admin-blog-status");
const blogPublishedAtEl = document.getElementById("admin-blog-published-at");
const blogContentEl = document.getElementById("admin-blog-content");
const blogClearBtn = document.getElementById("admin-blog-clear");
const blogNoteEl = document.getElementById("admin-blog-note");
const blogBodyEl = document.getElementById("admin-blog-body");

let allOrders = [];
let allProducts = [];
let allAnnouncements = [];
let allCoupons = [];
let allBlogPosts = [];
let filterTimer = null;
let adminLocked = false;
let productsBusy = false;
let announcementsBusy = false;
let couponsBusy = false;
let siteExperienceBusy = false;
let blogBusy = false;
let adminIdleTimer = null;
let adminLastHiddenAt = 0;
let adminSessionGuardBound = false;
const ADMIN_IDLE_TIMEOUT_MS = 10 * 60 * 1000;
const CATALOG_CACHE_KEY = "beulah_product_catalog_cache_v1";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clearLocalCatalogCache() {
  try {
    localStorage.removeItem(CATALOG_CACHE_KEY);
  } catch {
    // Ignore storage issues.
  }
}

function isImageSource(value) {
  return /^(https?:\/\/|\/?images\/|data:image\/)/i.test(String(value || "").trim());
}

function resolveImageSource(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return isImageSource(raw) ? raw : "";
}

function updateProductImagePreview(value) {
  if (!productImagePreviewEl) return;
  const src = resolveImageSource(value);
  if (!src) {
    productImagePreviewEl.hidden = true;
    productImagePreviewEl.removeAttribute("src");
    return;
  }
  productImagePreviewEl.src = src;
  productImagePreviewEl.hidden = false;
}

function updateSiteModalImagePreview(value) {
  if (!siteModalImagePreviewEl) return;
  const src = resolveImageSource(value);
  if (!src) {
    siteModalImagePreviewEl.hidden = true;
    siteModalImagePreviewEl.removeAttribute("src");
    return;
  }
  siteModalImagePreviewEl.src = src;
  siteModalImagePreviewEl.hidden = false;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not process the selected image."));
    img.src = dataUrl;
  });
}

async function compressImageToDataUrl(file) {
  if (!file || !String(file.type || "").startsWith("image/")) {
    throw new Error("Please choose a valid image file.");
  }

  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const maxSize = 900;
  const scale = Math.min(1, maxSize / image.width, maxSize / image.height);
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not process image on this browser.");
  }

  context.drawImage(image, 0, 0, width, height);

  let quality = 0.85;
  let output = canvas.toDataURL("image/jpeg", quality);
  while (output.length > 520000 && quality > 0.45) {
    quality -= 0.08;
    output = canvas.toDataURL("image/jpeg", quality);
  }

  if (output.length > 550000) {
    throw new Error("Image is too large. Choose a smaller photo.");
  }

  return output;
}

function setAccessNote(message, type = "") {
  if (!accessNoteEl) return;
  accessNoteEl.textContent = message;
  accessNoteEl.className = `admin-access-note${type ? ` ${type}` : ""}`;
}

function setProductNote(message, type = "") {
  if (!productNoteEl) return;
  productNoteEl.textContent = message;
  productNoteEl.className = `admin-product-note${type ? ` ${type}` : ""}`;
}

function setAnnouncementNote(message, type = "") {
  if (!announcementNoteEl) return;
  announcementNoteEl.textContent = message;
  announcementNoteEl.className = `admin-product-note${type ? ` ${type}` : ""}`;
}

function setCouponNote(message, type = "") {
  if (!couponNoteEl) return;
  couponNoteEl.textContent = message;
  couponNoteEl.className = `admin-product-note${type ? ` ${type}` : ""}`;
}

function setSiteExperienceNote(message, type = "") {
  if (!siteExperienceNoteEl) return;
  siteExperienceNoteEl.textContent = message;
  siteExperienceNoteEl.className = `admin-product-note${type ? ` ${type}` : ""}`;
}

function setBlogNote(message, type = "") {
  if (!blogNoteEl) return;
  blogNoteEl.textContent = message;
  blogNoteEl.className = `admin-product-note${type ? ` ${type}` : ""}`;
}

function setResultsMeta(filteredCount, sourceCount) {
  if (!resultsMetaEl) return;

  if (!sourceCount) {
    resultsMetaEl.textContent = "";
    return;
  }

  if (filteredCount === sourceCount) {
    resultsMetaEl.textContent = `Showing ${filteredCount} orders.`;
    return;
  }

  resultsMetaEl.textContent = `Showing ${filteredCount} of ${sourceCount} orders.`;
}

function updateMarketingOverviewCounts() {
  if (overviewAnnouncementsCountEl) {
    const liveAnnouncements = allAnnouncements.filter((item) => getAnnouncementStatusLabel(item) === "active").length;
    overviewAnnouncementsCountEl.textContent = `${liveAnnouncements} live`;
  }

  if (overviewCouponsCountEl) {
    const activeCoupons = allCoupons.filter((item) => item.active !== false).length;
    overviewCouponsCountEl.textContent = `${activeCoupons} active`;
  }
}

function setOrdersLoading(loading) {
  if (refreshBtn) {
    refreshBtn.disabled = loading;
    refreshBtn.textContent = loading ? "Loading..." : "Refresh";
  }

  if (adminLocked) return;

  if (statusFilterEl) statusFilterEl.disabled = loading;
  if (searchInputEl) searchInputEl.disabled = loading;
  if (dateFromEl) dateFromEl.disabled = loading;
  if (dateToEl) dateToEl.disabled = loading;
  if (clearFiltersBtn) clearFiltersBtn.disabled = loading;
}

function setProductsLoading(loading) {
  productsBusy = loading;
  if (productSeedBtn) productSeedBtn.disabled = loading;
  if (productNewBtn) productNewBtn.disabled = loading;
  if (productDeleteAllBtn) productDeleteAllBtn.disabled = loading;
  if (productCancelBtn) productCancelBtn.disabled = loading;
  if (productImageFileEl) productImageFileEl.disabled = loading;
  if (productSaveBtn) {
    productSaveBtn.disabled = loading;
    productSaveBtn.textContent = loading ? "Saving..." : "Save Product";
  }
}

function setAnnouncementsLoading(loading) {
  announcementsBusy = loading;
  if (announcementClearBtn) announcementClearBtn.disabled = loading;
  if (announcementFormEl) {
    Array.from(announcementFormEl.elements).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      element.toggleAttribute("disabled", loading);
    });
  }
}

function setCouponsLoading(loading) {
  couponsBusy = loading;
  if (couponClearBtn) couponClearBtn.disabled = loading;
  if (couponFormEl) {
    Array.from(couponFormEl.elements).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      element.toggleAttribute("disabled", loading);
    });
  }
}

function setSiteExperienceLoading(loading) {
  siteExperienceBusy = loading;
  if (siteExperienceClearBtn) siteExperienceClearBtn.disabled = loading;
  if (siteExperienceDeactivateBtn) siteExperienceDeactivateBtn.disabled = loading;
  if (siteExperienceDeleteBtn) siteExperienceDeleteBtn.disabled = loading;
  if (siteModalImageFileEl) siteModalImageFileEl.disabled = loading;
  if (siteExperienceFormEl) {
    Array.from(siteExperienceFormEl.elements).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      element.toggleAttribute("disabled", loading);
    });
  }
  if (siteExperienceSaveBtn) {
    siteExperienceSaveBtn.textContent = loading ? "Saving..." : "Save / Edit Welcome Modal";
  }
  toggleSiteInactivityField();
}

function setBlogLoading(loading) {
  blogBusy = loading;
  if (blogClearBtn) blogClearBtn.disabled = loading;
  if (blogFormEl) {
    Array.from(blogFormEl.elements).forEach((element) => {
      if (!(element instanceof HTMLElement)) return;
      element.toggleAttribute("disabled", loading);
    });
  }
}

function clearAdminIdleTimer() {
  if (!adminIdleTimer) return;
  window.clearTimeout(adminIdleTimer);
  adminIdleTimer = null;
}

function restartAdminIdleTimer() {
  clearAdminIdleTimer();
  adminIdleTimer = window.setTimeout(() => {
    void forceAdminReauth("Admin session timed out due to inactivity.");
  }, ADMIN_IDLE_TIMEOUT_MS);
}

async function forceAdminReauth(message = "Admin session expired. Please sign in again.") {
  clearAdminIdleTimer();
  setAccessNote(message, "error");
  sessionStorage.setItem("redirectAfterLogin", currentAdminPage);
  try {
    await signOut(auth);
  } catch {
    // Ignore sign-out errors and continue redirecting.
  }
  window.__beulahShowPageLoader?.();
  window.location.href = "admin-auth.html";
}

function bindAdminSessionGuard() {
  if (adminSessionGuardBound) {
    restartAdminIdleTimer();
    return;
  }
  adminSessionGuardBound = true;

  const markActivity = () => restartAdminIdleTimer();
  ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"].forEach((eventName) => {
    window.addEventListener(eventName, markActivity, { passive: true });
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      adminLastHiddenAt = Date.now();
      return;
    }
    if (adminLastHiddenAt && Date.now() - adminLastHiddenAt >= ADMIN_IDLE_TIMEOUT_MS) {
      void forceAdminReauth("Admin session locked after leaving the dashboard.");
      return;
    }
    restartAdminIdleTimer();
  });

  window.addEventListener("beforeunload", clearAdminIdleTimer);
  restartAdminIdleTimer();
}

function formatNgn(value) {
  return "NGN " + Number(value || 0).toLocaleString("en-NG");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function toDateTimeLocalValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

function parseDateTimeLocal(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    throw new Error("One of the date values is invalid.");
  }
  return date.toISOString();
}

function formatCompactDateRange(start, end) {
  if (!start && !end) return "No schedule";
  if (start && end) return `${formatDate(start)} -> ${formatDate(end)}`;
  if (start) return `Starts ${formatDate(start)}`;
  return `Ends ${formatDate(end)}`;
}

function normalizeCouponCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "")
    .slice(0, 30);
}

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function statusClass(status) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid") return "admin-status admin-status-paid";
  if (normalized === "pending") return "admin-status admin-status-pending";
  return "admin-status admin-status-other";
}

function productStatusClass(active) {
  return active ? "admin-status admin-status-paid" : "admin-status admin-status-other";
}

function productStockLabel(product) {
  if (product?.stockQuantity === null || product?.stockQuantity === undefined) {
    return '<span class="admin-field-help">Untracked</span>';
  }

  const quantity = Math.max(0, Number(product.stockQuantity || 0));
  const stockClass = quantity > 0 ? "admin-status admin-status-paid" : "admin-status admin-status-other";
  const stockText = quantity > 0 ? `${quantity} left` : "0 left";
  return `<span class="${stockClass}">${stockText}</span>`;
}

function renderSummary(orders = []) {
  const total = orders.length;
  const paid = orders.filter((order) => String(order.paymentStatus).toLowerCase() === "paid").length;
  const pending = orders.filter((order) => String(order.paymentStatus).toLowerCase() === "pending").length;

  if (statTotalEl) statTotalEl.textContent = String(total);
  if (statPaidEl) statPaidEl.textContent = String(paid);
  if (statPendingEl) statPendingEl.textContent = String(pending);
}

function renderOrders(orders) {
  if (!ordersBodyEl) return;
  ordersBodyEl.innerHTML = "";

  if (!orders.length) {
    if (emptyStateEl) emptyStateEl.style.display = "block";
    return;
  }

  if (emptyStateEl) emptyStateEl.style.display = "none";

  orders.forEach((order) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(order.orderRef || "-")}</td>
      <td>${escapeHtml(order.userEmail || order.userId || "-")}</td>
      <td>${formatNgn(order.total || 0)}</td>
      <td><span class="${statusClass(order.paymentStatus)}">${order.paymentStatus || "unknown"}</span></td>
      <td>${formatDate(order.createdAt)}</td>
    `;
    ordersBodyEl.appendChild(row);
  });
}

function renderProducts(products) {
  if (!productsBodyEl) return;
  productsBodyEl.innerHTML = "";

  if (!products.length) {
    if (productsEmptyEl) productsEmptyEl.style.display = "block";
    return;
  }

  if (productsEmptyEl) productsEmptyEl.style.display = "none";

  products.forEach((product) => {
    const managed = product.managed !== false;
    const nameCell = managed
      ? escapeHtml(product.name || "-")
      : `${escapeHtml(product.name || "-")}<div class="admin-field-help">Default product (import defaults to fully manage)</div>`;
    const unitPrice = Number(product.price || 0);
    const salePrice = Number(product.salePrice || 0);
    const hasSale = Number.isFinite(salePrice) && salePrice > 0 && salePrice < unitPrice;
    const saleStatus = hasSale
      ? `<div><strong>${formatNgn(salePrice)}</strong></div><div class="admin-field-help">${escapeHtml(formatCompactDateRange(product.saleStart, product.saleEnd))}</div>`
      : '<span class="admin-field-help">-</span>';

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${escapeHtml(product.id || "-")}</td>
      <td>${nameCell}</td>
      <td>${formatNgn(product.price || 0)}</td>
      <td>${productStockLabel(product)}</td>
      <td>${saleStatus}</td>
      <td><span class="${productStatusClass(product.active !== false)}">${product.active === false ? "inactive" : "active"}</span></td>
      <td>${formatDate(product.updatedAt)}</td>
      <td>
        <div class="admin-actions-row">
          <button class="admin-inline-btn" type="button" data-action="edit" data-id="${product.id}">Edit</button>
          <button class="admin-inline-btn" type="button" data-action="toggle" data-id="${product.id}">
            ${product.active === false ? "Activate" : "Deactivate"}
          </button>
          <button class="admin-inline-btn" type="button" data-action="delete" data-id="${product.id}" title="Delete product">
            Delete
          </button>
        </div>
      </td>
    `;
    productsBodyEl.appendChild(row);
  });
}

function getAnnouncementStatusLabel(item) {
  if (!item || item.active === false) return "inactive";
  const now = Date.now();
  const start = item.startsAt ? new Date(item.startsAt).getTime() : null;
  const end = item.endsAt ? new Date(item.endsAt).getTime() : null;
  if (start !== null && now < start) return "scheduled";
  if (end !== null && now > end) return "ended";
  return "active";
}

function announcementStatusClass(status) {
  if (status === "active") return "admin-status admin-status-paid";
  if (status === "scheduled") return "admin-status admin-status-pending";
  return "admin-status admin-status-other";
}

function renderAnnouncements(items) {
  if (!announcementsBodyEl) return;
  announcementsBodyEl.innerHTML = "";

  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5" class="admin-empty-inline">No announcements yet.</td>';
    announcementsBodyEl.appendChild(row);
    return;
  }

  items.forEach((item) => {
    const status = getAnnouncementStatusLabel(item);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${escapeHtml(item.title || "-")}</strong>
        <div class="admin-field-help">${escapeHtml(item.message || "")}</div>
      </td>
      <td>${escapeHtml(item.type || "info")}</td>
      <td><span class="${announcementStatusClass(status)}">${status}</span></td>
      <td>${formatDate(item.updatedAt)}</td>
      <td>
        <div class="admin-actions-row">
          <button class="admin-inline-btn" type="button" data-announcement-action="edit" data-id="${item.id}">Edit</button>
          <button class="admin-inline-btn" type="button" data-announcement-action="delete" data-id="${item.id}">Delete</button>
        </div>
      </td>
    `;
    announcementsBodyEl.appendChild(row);
  });
}

function renderCoupons(items) {
  if (!couponsBodyEl) return;
  couponsBodyEl.innerHTML = "";

  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5" class="admin-empty-inline">No coupons yet.</td>';
    couponsBodyEl.appendChild(row);
    return;
  }

  items.forEach((item) => {
    const status = item.active === false ? "inactive" : "active";
    const valueLabel = item.type === "fixed"
      ? formatNgn(item.value || 0)
      : `${Number(item.value || 0)}%`;
    const minLabel = Number(item.minSubtotal || 0) > 0
      ? `Min ${formatNgn(item.minSubtotal || 0)}`
      : "No minimum";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${escapeHtml(item.code || "-")}</strong>
        <div class="admin-field-help">${escapeHtml(item.description || minLabel)}</div>
      </td>
      <td>${escapeHtml(item.type || "percent")}</td>
      <td>${escapeHtml(valueLabel)}</td>
      <td><span class="${announcementStatusClass(status)}">${status}</span></td>
      <td>
        <div class="admin-actions-row">
          <button class="admin-inline-btn" type="button" data-coupon-action="edit" data-code="${item.code}">Edit</button>
          <button class="admin-inline-btn" type="button" data-coupon-action="delete" data-code="${item.code}">Delete</button>
        </div>
      </td>
    `;
    couponsBodyEl.appendChild(row);
  });
}

function renderBlogPosts(items) {
  if (!blogBodyEl) return;
  blogBodyEl.innerHTML = "";

  if (!items.length) {
    const row = document.createElement("tr");
    row.innerHTML = '<td colspan="5" class="admin-empty-inline">No blog posts yet.</td>';
    blogBodyEl.appendChild(row);
    return;
  }

  items.forEach((post) => {
    const status = String(post.status || "draft").toLowerCase() === "published" ? "published" : "draft";
    const publishedLabel = post.publishedAt ? formatDate(post.publishedAt) : "-";

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <strong>${escapeHtml(post.title || "-")}</strong>
        <div class="admin-field-help">/${escapeHtml(post.slug || "")}</div>
      </td>
      <td><span class="${announcementStatusClass(status === "published" ? "active" : "inactive")}">${status}</span></td>
      <td>${publishedLabel}</td>
      <td>${formatDate(post.updatedAt)}</td>
      <td>
        <div class="admin-actions-row">
          <button class="admin-inline-btn" type="button" data-blog-action="edit" data-id="${post.id}">Edit</button>
          <button class="admin-inline-btn" type="button" data-blog-action="delete" data-id="${post.id}">Delete</button>
        </div>
      </td>
    `;
    blogBodyEl.appendChild(row);
  });
}

function showForbiddenState(message) {
  adminLocked = true;
  setAccessNote(message, "error");
  setResultsMeta(0, 0);
  if (statsEl) statsEl.style.display = "none";
  if (ordersSectionEl) ordersSectionEl.style.display = "none";
  if (productsSectionEl) productsSectionEl.style.display = "none";
  if (marketingSectionEl) marketingSectionEl.style.display = "none";
  if (blogSectionEl) blogSectionEl.style.display = "none";
  if (statusFilterEl) statusFilterEl.disabled = true;
  if (searchInputEl) searchInputEl.disabled = true;
  if (dateFromEl) dateFromEl.disabled = true;
  if (dateToEl) dateToEl.disabled = true;
  if (refreshBtn) refreshBtn.style.display = "none";
  if (clearFiltersBtn) clearFiltersBtn.style.display = "none";
  if (bootstrapBtn) bootstrapBtn.style.display = "inline-block";
}

function parseDateStart(value) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateEnd(value) {
  if (!value) return null;
  const date = new Date(`${value}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function applyFilters() {
  const searchTerm = String(searchInputEl?.value || "").trim().toLowerCase();
  const fromDate = parseDateStart(dateFromEl?.value || "");
  const toDate = parseDateEnd(dateToEl?.value || "");

  const filtered = allOrders.filter((order) => {
    const identity = `${order.orderRef || ""} ${order.userEmail || ""} ${order.userId || ""}`.toLowerCase();
    if (searchTerm && !identity.includes(searchTerm)) {
      return false;
    }

    if (!fromDate && !toDate) {
      return true;
    }

    const createdAt = new Date(order.createdAt || "");
    if (Number.isNaN(createdAt.getTime())) {
      return false;
    }

    if (fromDate && createdAt < fromDate) {
      return false;
    }

    if (toDate && createdAt > toDate) {
      return false;
    }

    return true;
  });

  renderSummary(filtered);
  renderOrders(filtered);
  setResultsMeta(filtered.length, allOrders.length);
}

function scheduleFilterApply() {
  clearTimeout(filterTimer);
  filterTimer = setTimeout(() => {
    applyFilters();
  }, 150);
}

function resetProductForm() {
  if (!productFormEl) return;
  productFormEl.reset();
  if (productIdEl) productIdEl.value = "";
  if (productActiveEl) productActiveEl.checked = true;
  if (productStockEl) productStockEl.value = "";
  if (productSalePriceEl) productSalePriceEl.value = "";
  if (productSaleStartEl) productSaleStartEl.value = "";
  if (productSaleEndEl) productSaleEndEl.value = "";
  if (productImageFileEl) productImageFileEl.value = "";
  updateProductImagePreview("");
}

function openProductForm(product = null) {
  if (!productFormEl) return;
  productFormEl.hidden = false;

  if (!product) {
    resetProductForm();
    return;
  }

  if (productIdEl) productIdEl.value = product.id || "";
  if (productNameEl) productNameEl.value = product.name || "";
  if (productPriceEl) productPriceEl.value = String(product.price || "");
  if (productStockEl) {
    productStockEl.value = product.stockQuantity === null || product.stockQuantity === undefined
      ? ""
      : String(product.stockQuantity);
  }
  if (productSalePriceEl) productSalePriceEl.value = product.salePrice ? String(product.salePrice) : "";
  if (productSaleStartEl) productSaleStartEl.value = toDateTimeLocalValue(product.saleStart);
  if (productSaleEndEl) productSaleEndEl.value = toDateTimeLocalValue(product.saleEnd);
  if (productImageEl) productImageEl.value = product.image || "";
  if (productImageFileEl) productImageFileEl.value = "";
  updateProductImagePreview(product.image || "");
  if (productDescriptionEl) productDescriptionEl.value = product.description || "";
  if (productActiveEl) productActiveEl.checked = product.active !== false;
}

function closeProductForm() {
  if (!productFormEl) return;
  resetProductForm();
  productFormEl.hidden = true;
}

function getProductPayloadFromForm() {
  const id = String(productIdEl?.value || "").trim();
  const name = String(productNameEl?.value || "").trim();
  const price = Number(productPriceEl?.value || 0);
  const rawStockQuantity = String(productStockEl?.value || "").trim();
  const salePrice = Number(productSalePriceEl?.value || 0);
  const saleStart = parseDateTimeLocal(productSaleStartEl?.value || "");
  const saleEnd = parseDateTimeLocal(productSaleEndEl?.value || "");
  const image = String(productImageEl?.value || "").trim();
  const description = String(productDescriptionEl?.value || "").trim();
  const active = Boolean(productActiveEl?.checked);

  if (!name) {
    throw new Error("Product name is required.");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Product price must be greater than 0.");
  }

  if (rawStockQuantity && (!Number.isInteger(Number(rawStockQuantity)) || Number(rawStockQuantity) < 0)) {
    throw new Error("Stock quantity must be a whole number that is 0 or higher.");
  }

  if (salePrice && (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price)) {
    throw new Error("Flash sale price must be lower than regular price.");
  }

  if (saleStart && saleEnd && new Date(saleStart).getTime() > new Date(saleEnd).getTime()) {
    throw new Error("Sale start must be before sale end.");
  }

  if (image && !isImageSource(image)) {
    throw new Error("Image must be URL, images/ path, or selected from your device.");
  }

  if (/^data:image\//i.test(image) && image.length > 550000) {
    throw new Error("Selected image is too large. Choose a smaller one.");
  }

  return {
    id,
    name,
    price: Math.round(price),
    stockQuantity: rawStockQuantity ? Math.max(0, Math.trunc(Number(rawStockQuantity))) : null,
    salePrice: salePrice ? Math.round(salePrice) : 0,
    saleStart,
    saleEnd,
    image,
    description,
    active
  };
}

function findProductById(productId) {
  return allProducts.find((product) => product.id === productId) || null;
}

function resetAnnouncementForm() {
  if (!announcementFormEl) return;
  announcementFormEl.reset();
  if (announcementIdEl) announcementIdEl.value = "";
  if (announcementTypeEl) announcementTypeEl.value = "info";
  if (announcementActiveEl) announcementActiveEl.checked = true;
  if (announcementStartEl) announcementStartEl.value = "";
  if (announcementEndEl) announcementEndEl.value = "";
}

function fillAnnouncementForm(item) {
  if (!item) {
    resetAnnouncementForm();
    return;
  }
  if (announcementIdEl) announcementIdEl.value = item.id || "";
  if (announcementTitleEl) announcementTitleEl.value = item.title || "";
  if (announcementMessageEl) announcementMessageEl.value = item.message || "";
  if (announcementTypeEl) announcementTypeEl.value = item.type || "info";
  if (announcementStartEl) announcementStartEl.value = toDateTimeLocalValue(item.startsAt);
  if (announcementEndEl) announcementEndEl.value = toDateTimeLocalValue(item.endsAt);
  if (announcementActiveEl) announcementActiveEl.checked = item.active !== false;
}

function getAnnouncementPayloadFromForm() {
  const id = String(announcementIdEl?.value || "").trim();
  const title = String(announcementTitleEl?.value || "").trim();
  const message = String(announcementMessageEl?.value || "").trim();
  const type = String(announcementTypeEl?.value || "info").trim().toLowerCase();
  const startsAt = parseDateTimeLocal(announcementStartEl?.value || "");
  const endsAt = parseDateTimeLocal(announcementEndEl?.value || "");
  const active = Boolean(announcementActiveEl?.checked);

  if (!title || !message) {
    throw new Error("Announcement title and message are required.");
  }
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    throw new Error("Announcement start must be before end.");
  }

  return {
    id,
    title,
    message,
    type: ["info", "success", "warning"].includes(type) ? type : "info",
    startsAt,
    endsAt,
    active
  };
}

function findAnnouncementById(id) {
  return allAnnouncements.find((item) => item.id === id) || null;
}

function resetCouponForm() {
  if (!couponFormEl) return;
  couponFormEl.reset();
  if (couponIdEl) couponIdEl.value = "";
  if (couponTypeEl) couponTypeEl.value = "percent";
  if (couponActiveEl) couponActiveEl.checked = true;
  if (couponMinSubtotalEl) couponMinSubtotalEl.value = "";
  if (couponStartEl) couponStartEl.value = "";
  if (couponEndEl) couponEndEl.value = "";
}

function fillCouponForm(item) {
  if (!item) {
    resetCouponForm();
    return;
  }
  if (couponIdEl) couponIdEl.value = item.code || "";
  if (couponCodeEl) couponCodeEl.value = item.code || "";
  if (couponTypeEl) couponTypeEl.value = item.type || "percent";
  if (couponValueEl) couponValueEl.value = String(item.value || "");
  if (couponMinSubtotalEl) couponMinSubtotalEl.value = item.minSubtotal ? String(item.minSubtotal) : "";
  if (couponDescriptionEl) couponDescriptionEl.value = item.description || "";
  if (couponStartEl) couponStartEl.value = toDateTimeLocalValue(item.startsAt);
  if (couponEndEl) couponEndEl.value = toDateTimeLocalValue(item.endsAt);
  if (couponActiveEl) couponActiveEl.checked = item.active !== false;
}

function getCouponPayloadFromForm() {
  const originalCode = normalizeCouponCode(couponIdEl?.value || "");
  const code = normalizeCouponCode(couponCodeEl?.value || "");
  const type = String(couponTypeEl?.value || "percent").trim().toLowerCase();
  const value = Number(couponValueEl?.value || 0);
  const minSubtotal = Number(couponMinSubtotalEl?.value || 0);
  const description = String(couponDescriptionEl?.value || "").trim();
  const startsAt = parseDateTimeLocal(couponStartEl?.value || "");
  const endsAt = parseDateTimeLocal(couponEndEl?.value || "");
  const active = Boolean(couponActiveEl?.checked);

  if (!code) {
    throw new Error("Coupon code is required.");
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Coupon value must be greater than 0.");
  }
  if (type === "percent" && value > 90) {
    throw new Error("Percent coupon cannot be above 90.");
  }
  if (startsAt && endsAt && new Date(startsAt).getTime() > new Date(endsAt).getTime()) {
    throw new Error("Coupon start must be before end.");
  }
  if (Number.isFinite(minSubtotal) && minSubtotal < 0) {
    throw new Error("Minimum subtotal cannot be negative.");
  }

  return {
    originalCode,
    code,
    type: type === "fixed" ? "fixed" : "percent",
    value: Math.round(value),
    minSubtotal: Math.max(0, Math.round(minSubtotal || 0)),
    description,
    startsAt,
    endsAt,
    active
  };
}

function resetSiteExperienceForm() {
  if (!siteExperienceFormEl) return;
  siteExperienceFormEl.reset();
  if (siteModalEnabledEl) siteModalEnabledEl.checked = false;
  if (siteModalImageFileEl) siteModalImageFileEl.value = "";
  updateSiteModalImagePreview("");
  toggleSiteInactivityField();
}

function fillSiteExperienceForm(settings = {}) {
  if (!siteExperienceFormEl) return;
  if (siteModalEnabledEl) siteModalEnabledEl.checked = settings.modalEnabled === true;
  if (siteModalTitleEl) siteModalTitleEl.value = settings.modalTitle || "";
  if (siteModalMessageEl) siteModalMessageEl.value = settings.modalMessage || "";
  if (siteModalImageEl) siteModalImageEl.value = settings.modalImage || "";
  if (siteModalImageFileEl) siteModalImageFileEl.value = "";
  updateSiteModalImagePreview(settings.modalImage || "");
  if (siteModalButtonLabelEl) siteModalButtonLabelEl.value = settings.modalButtonLabel || "";
  if (siteModalButtonUrlEl) siteModalButtonUrlEl.value = settings.modalButtonUrl || "";
  toggleSiteInactivityField();
}

function getSiteExperiencePayloadFromForm() {
  const modalEnabled = Boolean(siteModalEnabledEl?.checked);
  const modalTitle = String(siteModalTitleEl?.value || "").trim();
  const modalMessage = String(siteModalMessageEl?.value || "").trim();
  const modalImage = String(siteModalImageEl?.value || "").trim();
  const modalButtonLabel = String(siteModalButtonLabelEl?.value || "").trim();
  const modalButtonUrl = String(siteModalButtonUrlEl?.value || "").trim();

  if (modalImage && !isImageSource(modalImage)) {
    throw new Error("Modal image must be URL, images/ path, or selected from your device.");
  }
  if (/^data:image\//i.test(modalImage) && modalImage.length > 550000) {
    throw new Error("Selected modal image is too large. Choose a smaller one.");
  }

  return {
    modalEnabled,
    modalTitle,
    modalMessage,
    modalImage,
    modalButtonLabel,
    modalButtonUrl
  };
}

async function loadSiteExperience() {
  if (adminLocked || !siteExperienceFormEl) return;
  setSiteExperienceNote("");

  try {
    const response = await callAuthedFunction(auth, "adminGetSiteExperience", {});
    fillSiteExperienceForm(response?.settings || {});
  } catch (error) {
    resetSiteExperienceForm();
    setSiteExperienceNote(error.message || "Unable to load welcome modal settings.", "error");
  }
}

function toggleSiteInactivityField() {
  if (siteInactivityMinutesEl) {
    siteInactivityMinutesEl.disabled = true;
  }
}

function findCouponByCode(code) {
  return allCoupons.find((item) => item.code === code) || null;
}

function resetBlogForm() {
  if (!blogFormEl) return;
  blogFormEl.reset();
  if (blogIdEl) blogIdEl.value = "";
  if (blogStatusEl) blogStatusEl.value = "draft";
  if (blogSlugEl) blogSlugEl.value = "";
  if (blogPublishedAtEl) blogPublishedAtEl.value = "";
}

function fillBlogForm(post) {
  if (!post) {
    resetBlogForm();
    return;
  }
  if (blogIdEl) blogIdEl.value = post.id || "";
  if (blogTitleEl) blogTitleEl.value = post.title || "";
  if (blogSlugEl) blogSlugEl.value = post.slug || "";
  if (blogExcerptEl) blogExcerptEl.value = post.excerpt || "";
  if (blogCoverEl) blogCoverEl.value = post.coverImage || "";
  if (blogTagsEl) blogTagsEl.value = Array.isArray(post.tags) ? post.tags.join(", ") : "";
  if (blogStatusEl) blogStatusEl.value = post.status === "published" ? "published" : "draft";
  if (blogPublishedAtEl) blogPublishedAtEl.value = toDateTimeLocalValue(post.publishedAt);
  if (blogContentEl) blogContentEl.value = post.content || "";
}

function getBlogPayloadFromForm() {
  const id = String(blogIdEl?.value || "").trim();
  const title = String(blogTitleEl?.value || "").trim();
  const slug = normalizeSlug(blogSlugEl?.value || title);
  const excerpt = String(blogExcerptEl?.value || "").trim();
  const coverImage = String(blogCoverEl?.value || "").trim();
  const tags = String(blogTagsEl?.value || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 20);
  const status = String(blogStatusEl?.value || "draft").trim().toLowerCase() === "published"
    ? "published"
    : "draft";
  const publishedAt = parseDateTimeLocal(blogPublishedAtEl?.value || "");
  const content = String(blogContentEl?.value || "").trim();

  if (!title || title.length < 5) {
    throw new Error("Blog title must be at least 5 characters.");
  }
  if (!slug) {
    throw new Error("Blog slug is required.");
  }
  if (!content || content.length < 20) {
    throw new Error("Blog content must be at least 20 characters.");
  }
  if (coverImage && !isImageSource(coverImage)) {
    throw new Error("Cover image must be URL, images/ path, or uploaded image.");
  }

  return {
    id,
    slug,
    title,
    excerpt,
    coverImage,
    tags,
    status,
    publishedAt: status === "published" ? publishedAt : "",
    content
  };
}

function findBlogPostById(id) {
  return allBlogPosts.find((post) => post.id === id) || null;
}

async function loadOrders() {
  adminLocked = false;
  if (refreshBtn) refreshBtn.style.display = "inline-block";
  if (clearFiltersBtn) clearFiltersBtn.style.display = "inline-block";
  if (bootstrapBtn) bootstrapBtn.style.display = "none";
  if (statsEl) statsEl.style.display = "grid";
  if (ordersSectionEl) ordersSectionEl.style.display = "block";
  setOrdersLoading(true);
  setAccessNote("");

  try {
    const response = await callAuthedFunction(auth, "adminListOrders", {
      paymentStatus: statusFilterEl?.value || "all",
      limit: adminView === "overview" ? 8 : 120
    });

    allOrders = Array.isArray(response.orders) ? response.orders : [];
    if (statTotalEl) statTotalEl.textContent = String(Number(response.summary?.total || allOrders.length || 0));
    if (statPaidEl) statPaidEl.textContent = String(Number(response.summary?.paid || 0));
    if (statPendingEl) statPendingEl.textContent = String(Number(response.summary?.pending || 0));
    applyFilters();

    if (statsEl) statsEl.style.display = "grid";
    if (ordersSectionEl) ordersSectionEl.style.display = "block";
  } catch (error) {
    allOrders = [];
    renderSummary([]);
    renderOrders([]);
    setResultsMeta(0, 0);

    const message = error.message || "Unable to load orders.";
    if (message.toLowerCase().includes("admin")) {
      showForbiddenState(message);
      return;
    }
    setAccessNote(message, "error");
  } finally {
    setOrdersLoading(false);
  }
}

async function loadProducts() {
  if (adminLocked) return;
  setProductNote("");

  try {
    const response = await callAuthedFunction(auth, "adminListProducts", {});
    allProducts = Array.isArray(response.products) ? response.products : [];
    if (overviewProductsCountEl) {
      overviewProductsCountEl.textContent = `${allProducts.length} tracked`;
    }
    renderProducts(allProducts);
    const unmanagedCount = allProducts.filter((product) => product.managed === false).length;
    if (unmanagedCount > 0) {
      setProductNote(
        `${unmanagedCount} default products are read-only until you click "Import Defaults".`,
        ""
      );
    }
    if (productsSectionEl) productsSectionEl.style.display = "block";
  } catch (error) {
    allProducts = [];
    renderProducts([]);
    setProductNote(error.message || "Unable to load products.", "error");
  }
}

async function loadAnnouncements() {
  if (adminLocked) return;
  setAnnouncementNote("");

  try {
    const response = await callAuthedFunction(auth, "adminListAnnouncements", {});
    allAnnouncements = Array.isArray(response.announcements) ? response.announcements : [];
    allAnnouncements.sort((left, right) => {
      const leftTs = new Date(left.updatedAt || 0).getTime();
      const rightTs = new Date(right.updatedAt || 0).getTime();
      return rightTs - leftTs;
    });
    updateMarketingOverviewCounts();
    renderAnnouncements(allAnnouncements);
    if (marketingSectionEl) marketingSectionEl.style.display = "block";
  } catch (error) {
    allAnnouncements = [];
    updateMarketingOverviewCounts();
    renderAnnouncements([]);
    setAnnouncementNote(error.message || "Unable to load announcements.", "error");
  }
}

async function loadCoupons() {
  if (adminLocked) return;
  setCouponNote("");

  try {
    const response = await callAuthedFunction(auth, "adminListCoupons", {});
    allCoupons = Array.isArray(response.coupons) ? response.coupons : [];
    allCoupons.sort((left, right) => {
      const leftTs = new Date(left.updatedAt || 0).getTime();
      const rightTs = new Date(right.updatedAt || 0).getTime();
      return rightTs - leftTs;
    });
    updateMarketingOverviewCounts();
    renderCoupons(allCoupons);
    if (marketingSectionEl) marketingSectionEl.style.display = "block";
  } catch (error) {
    allCoupons = [];
    updateMarketingOverviewCounts();
    renderCoupons([]);
    setCouponNote(error.message || "Unable to load coupons.", "error");
  }
}

async function loadBlogPosts() {
  if (adminLocked) return;
  setBlogNote("");

  try {
    const response = await callAuthedFunction(auth, "adminListBlogPosts", {});
    allBlogPosts = Array.isArray(response.posts) ? response.posts : [];
    allBlogPosts.sort((left, right) => {
      const leftTs = new Date(left.updatedAt || 0).getTime();
      const rightTs = new Date(right.updatedAt || 0).getTime();
      return rightTs - leftTs;
    });
    if (overviewBlogCountEl) {
      const publishedCount = allBlogPosts.filter((post) => post.status === "published").length;
      overviewBlogCountEl.textContent = `${publishedCount} published`;
    }
    renderBlogPosts(allBlogPosts);
    if (blogSectionEl) blogSectionEl.style.display = "block";
  } catch (error) {
    allBlogPosts = [];
    if (overviewBlogCountEl) {
      overviewBlogCountEl.textContent = "0 published";
    }
    renderBlogPosts([]);
    setBlogNote(error.message || "Unable to load blog posts.", "error");
  }
}

async function refreshDashboard() {
  if (adminView === "orders") {
    await loadOrders();
    return;
  }

  if (adminView === "products") {
    await loadProducts();
    return;
  }

  if (adminView === "marketing") {
    await loadAnnouncements();
    if (!adminLocked) {
      await loadCoupons();
      await loadSiteExperience();
    }
    return;
  }

  if (adminView === "blog") {
    await loadBlogPosts();
    return;
  }

  await loadOrders();
  if (!adminLocked) {
    await loadProducts();
    await loadAnnouncements();
    await loadCoupons();
    await loadSiteExperience();
    await loadBlogPosts();
  }
}

statusFilterEl?.addEventListener("change", loadOrders);
searchInputEl?.addEventListener("input", scheduleFilterApply);
dateFromEl?.addEventListener("change", applyFilters);
dateToEl?.addEventListener("change", applyFilters);
refreshBtn?.addEventListener("click", refreshDashboard);

clearFiltersBtn?.addEventListener("click", () => {
  if (searchInputEl) searchInputEl.value = "";
  if (dateFromEl) dateFromEl.value = "";
  if (dateToEl) dateToEl.value = "";

  if (statusFilterEl && statusFilterEl.value !== "all") {
    statusFilterEl.value = "all";
    loadOrders();
    return;
  }

  applyFilters();
});

bootstrapBtn?.addEventListener("click", async () => {
  bootstrapBtn.disabled = true;
  bootstrapBtn.textContent = "Activating...";

  try {
    const response = await callAuthedFunction(auth, "bootstrapAdminAccess", {});
    setAccessNote(response.message || "Admin access activated.", "success");
    bootstrapBtn.style.display = "none";
    await refreshDashboard();
  } catch (error) {
    setAccessNote(error.message || "Unable to activate admin access.", "error");
    bootstrapBtn.disabled = false;
    bootstrapBtn.textContent = "Activate Admin Access";
  }
});

productNewBtn?.addEventListener("click", () => {
  openProductForm();
  setProductNote("");
});

productDeleteAllBtn?.addEventListener("click", async () => {
  if (productsBusy || adminLocked) return;

  const confirmed = window.confirm(
    "Delete all products from the store? This will empty the storefront until you add or import products again."
  );
  if (!confirmed) return;

  try {
    setProductsLoading(true);
    const response = await callAuthedFunction(auth, "adminDeleteAllProducts", {});
    clearLocalCatalogCache();
    closeProductForm();
    await loadProducts();
    setProductNote(`Deleted ${Number(response.deletedCount || 0)} products. Store is now empty.`, "success");
  } catch (error) {
    setProductNote(error.message || "Unable to delete all products.", "error");
  } finally {
    setProductsLoading(false);
  }
});

productCancelBtn?.addEventListener("click", () => {
  closeProductForm();
  setProductNote("");
});

productSeedBtn?.addEventListener("click", async () => {
  if (productsBusy || adminLocked) return;

  try {
    setProductsLoading(true);
    const response = await callAuthedFunction(auth, "adminSeedDefaultProducts", {
      overwrite: false
    });
    clearLocalCatalogCache();
    await loadProducts();
    setProductNote(
      `Defaults imported. Created ${response.created || 0}, updated ${response.updated || 0}.`,
      "success"
    );
  } catch (error) {
    setProductNote(error.message || "Unable to import default products.", "error");
  } finally {
    setProductsLoading(false);
  }
});

productImageEl?.addEventListener("input", () => {
  updateProductImagePreview(productImageEl.value);
});

productImageFileEl?.addEventListener("change", async () => {
  const file = productImageFileEl.files?.[0];
  if (!file) {
    return;
  }

  try {
    if (productSaveBtn) productSaveBtn.disabled = true;
    setProductNote("Processing image...", "");
    const compressedDataUrl = await compressImageToDataUrl(file);
    if (productImageEl) {
      productImageEl.value = compressedDataUrl;
    }
    updateProductImagePreview(compressedDataUrl);
    setProductNote("Image is ready. Save product to apply.", "success");
  } catch (error) {
    setProductNote(error.message || "Could not process image.", "error");
    if (productImageFileEl) productImageFileEl.value = "";
  } finally {
    if (productSaveBtn) productSaveBtn.disabled = false;
  }
});

productFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (productsBusy || adminLocked) return;

  try {
    const payload = getProductPayloadFromForm();
    setProductsLoading(true);
    const response = await callAuthedFunction(auth, "adminUpsertProduct", payload);
    const savedName = response?.product?.name || payload.name;
    clearLocalCatalogCache();
    closeProductForm();
    await loadProducts();
    setProductNote(`Saved "${savedName}" successfully.`, "success");
  } catch (error) {
    setProductNote(error.message || "Unable to save product.", "error");
  } finally {
    setProductsLoading(false);
  }
});

productsBodyEl?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (productsBusy || adminLocked) return;

  const button = target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action || "";
  const id = button.dataset.id || "";
  const product = findProductById(id);
  if (!product) return;

  if (action === "edit") {
    openProductForm(product);
    setProductNote("");
    return;
  }

  if (action === "toggle") {
    try {
      setProductsLoading(true);
      await callAuthedFunction(auth, "adminSetProductActive", {
        id: product.id,
        active: product.active === false
      });
      clearLocalCatalogCache();
      await loadProducts();
      setProductNote(
        `${product.name} is now ${product.active === false ? "active" : "inactive"}.`,
        "success"
      );
    } catch (error) {
      setProductNote(error.message || "Unable to update product status.", "error");
    } finally {
      setProductsLoading(false);
    }
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setProductsLoading(true);
      if (product.managed === false) {
        // Promote fallback defaults to managed docs first so they can be truly deleted.
        await callAuthedFunction(auth, "adminSeedDefaultProducts", { overwrite: false });
      }
      await callAuthedFunction(auth, "adminDeleteProduct", { id: product.id });
      clearLocalCatalogCache();
      if (productIdEl?.value === product.id) {
        closeProductForm();
      }
      await loadProducts();
      setProductNote(`"${product.name}" deleted.`, "success");
    } catch (error) {
      setProductNote(error.message || "Unable to delete product.", "error");
    } finally {
      setProductsLoading(false);
    }
  }
});

announcementClearBtn?.addEventListener("click", () => {
  if (announcementsBusy) return;
  resetAnnouncementForm();
  setAnnouncementNote("");
});

announcementFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (announcementsBusy || adminLocked) return;

  try {
    const payload = getAnnouncementPayloadFromForm();
    setAnnouncementsLoading(true);
    await callAuthedFunction(auth, "adminUpsertAnnouncement", payload);
    resetAnnouncementForm();
    await loadAnnouncements();
    setAnnouncementNote("Announcement saved.", "success");
  } catch (error) {
    setAnnouncementNote(error.message || "Unable to save announcement.", "error");
  } finally {
    setAnnouncementsLoading(false);
  }
});

announcementsBodyEl?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (announcementsBusy || adminLocked) return;

  const button = target.closest("button[data-announcement-action]");
  if (!button) return;

  const action = button.dataset.announcementAction || "";
  const id = button.dataset.id || "";
  const item = findAnnouncementById(id);
  if (!item) return;

  if (action === "edit") {
    fillAnnouncementForm(item);
    setAnnouncementNote("");
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm(`Delete announcement "${item.title}"?`);
    if (!confirmed) return;
    try {
      setAnnouncementsLoading(true);
      await callAuthedFunction(auth, "adminDeleteAnnouncement", { id: item.id });
      if (announcementIdEl?.value === item.id) {
        resetAnnouncementForm();
      }
      await loadAnnouncements();
      setAnnouncementNote("Announcement deleted.", "success");
    } catch (error) {
      setAnnouncementNote(error.message || "Unable to delete announcement.", "error");
    } finally {
      setAnnouncementsLoading(false);
    }
  }
});

couponClearBtn?.addEventListener("click", () => {
  if (couponsBusy) return;
  resetCouponForm();
  setCouponNote("");
});

siteExperienceClearBtn?.addEventListener("click", async () => {
  if (siteExperienceBusy || adminLocked) return;
  await loadSiteExperience();
});

siteExperienceDeactivateBtn?.addEventListener("click", async () => {
  if (siteExperienceBusy || adminLocked) return;
  const confirmed = window.confirm("Deactivate welcome modal for all users?");
  if (!confirmed) return;

  try {
    const payload = getSiteExperiencePayloadFromForm();
    payload.modalEnabled = false;
    setSiteExperienceLoading(true);
    const response = await callAuthedFunction(auth, "adminUpsertSiteExperience", payload);
    fillSiteExperienceForm(response?.settings || payload);
    setSiteExperienceNote("Welcome modal deactivated.", "success");
  } catch (error) {
    setSiteExperienceNote(error.message || "Unable to deactivate welcome modal.", "error");
  } finally {
    setSiteExperienceLoading(false);
  }
});

siteExperienceDeleteBtn?.addEventListener("click", async () => {
  if (siteExperienceBusy || adminLocked) return;
  const confirmed = window.confirm("Delete welcome modal settings completely?");
  if (!confirmed) return;

  try {
    setSiteExperienceLoading(true);
    const response = await callAuthedFunction(auth, "adminDeleteSiteExperience", {});
    fillSiteExperienceForm(response?.settings || {});
    setSiteExperienceNote("Welcome modal settings deleted.", "success");
  } catch (error) {
    setSiteExperienceNote(error.message || "Unable to delete welcome modal settings.", "error");
  } finally {
    setSiteExperienceLoading(false);
  }
});

siteSessionModeEl?.addEventListener("change", toggleSiteInactivityField);

siteModalImageEl?.addEventListener("input", () => {
  updateSiteModalImagePreview(siteModalImageEl.value);
});

siteModalImageFileEl?.addEventListener("change", async () => {
  const file = siteModalImageFileEl.files?.[0];
  if (!file) return;

  try {
    if (siteExperienceSaveBtn) siteExperienceSaveBtn.disabled = true;
    setSiteExperienceNote("Processing modal image...", "");
    const compressedDataUrl = await compressImageToDataUrl(file);
    if (siteModalImageEl) {
      siteModalImageEl.value = compressedDataUrl;
    }
    updateSiteModalImagePreview(compressedDataUrl);
    setSiteExperienceNote("Modal image is ready. Save the welcome modal to publish it.", "success");
  } catch (error) {
    setSiteExperienceNote(error.message || "Could not process modal image.", "error");
    if (siteModalImageFileEl) siteModalImageFileEl.value = "";
  } finally {
    if (siteExperienceSaveBtn) siteExperienceSaveBtn.disabled = false;
  }
});

siteExperienceFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (siteExperienceBusy || adminLocked) return;

  try {
    const payload = getSiteExperiencePayloadFromForm();
    setSiteExperienceLoading(true);
    const response = await callAuthedFunction(auth, "adminUpsertSiteExperience", payload);
    fillSiteExperienceForm(response?.settings || payload);
    setSiteExperienceNote("Welcome modal saved. New logins will see the updated version.", "success");
  } catch (error) {
    setSiteExperienceNote(error.message || "Unable to save welcome modal.", "error");
  } finally {
    setSiteExperienceLoading(false);
  }
});

couponFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (couponsBusy || adminLocked) return;

  try {
    const payload = getCouponPayloadFromForm();
    setCouponsLoading(true);

    await callAuthedFunction(auth, "adminUpsertCoupon", {
      code: payload.code,
      type: payload.type,
      value: payload.value,
      minSubtotal: payload.minSubtotal,
      description: payload.description,
      startsAt: payload.startsAt,
      endsAt: payload.endsAt,
      active: payload.active
    });

    if (payload.originalCode && payload.originalCode !== payload.code) {
      await callAuthedFunction(auth, "adminDeleteCoupon", { code: payload.originalCode });
    }

    resetCouponForm();
    await loadCoupons();
    setCouponNote("Coupon saved.", "success");
  } catch (error) {
    setCouponNote(error.message || "Unable to save coupon.", "error");
  } finally {
    setCouponsLoading(false);
  }
});

couponsBodyEl?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (couponsBusy || adminLocked) return;

  const button = target.closest("button[data-coupon-action]");
  if (!button) return;

  const action = button.dataset.couponAction || "";
  const code = normalizeCouponCode(button.dataset.code || "");
  const item = findCouponByCode(code);
  if (!item) return;

  if (action === "edit") {
    fillCouponForm(item);
    setCouponNote("");
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm(`Delete coupon "${item.code}"?`);
    if (!confirmed) return;
    try {
      setCouponsLoading(true);
      await callAuthedFunction(auth, "adminDeleteCoupon", { code: item.code });
      if (normalizeCouponCode(couponIdEl?.value || "") === item.code) {
        resetCouponForm();
      }
      await loadCoupons();
      setCouponNote("Coupon deleted.", "success");
    } catch (error) {
      setCouponNote(error.message || "Unable to delete coupon.", "error");
    } finally {
      setCouponsLoading(false);
    }
  }
});

blogTitleEl?.addEventListener("input", () => {
  if (!blogSlugEl) return;
  if (blogIdEl?.value) return;
  blogSlugEl.value = normalizeSlug(blogTitleEl.value || "");
});

blogClearBtn?.addEventListener("click", () => {
  if (blogBusy) return;
  resetBlogForm();
  setBlogNote("");
});

blogFormEl?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (blogBusy || adminLocked) return;

  try {
    const payload = getBlogPayloadFromForm();
    setBlogLoading(true);
    const response = await callAuthedFunction(auth, "adminUpsertBlogPost", payload);
    resetBlogForm();
    await loadBlogPosts();
    setBlogNote(`Saved "${response?.post?.title || payload.title}".`, "success");
  } catch (error) {
    setBlogNote(error.message || "Unable to save blog post.", "error");
  } finally {
    setBlogLoading(false);
  }
});

blogBodyEl?.addEventListener("click", async (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (blogBusy || adminLocked) return;

  const button = target.closest("button[data-blog-action]");
  if (!button) return;

  const action = button.dataset.blogAction || "";
  const id = button.dataset.id || "";
  const post = findBlogPostById(id);
  if (!post) return;

  if (action === "edit") {
    fillBlogForm(post);
    setBlogNote("");
    return;
  }

  if (action === "delete") {
    const confirmed = window.confirm(`Delete blog post "${post.title}"?`);
    if (!confirmed) return;
    try {
      setBlogLoading(true);
      await callAuthedFunction(auth, "adminDeleteBlogPost", { id: post.id });
      if (blogIdEl?.value === post.id) {
        resetBlogForm();
      }
      await loadBlogPosts();
      setBlogNote("Blog post deleted.", "success");
    } catch (error) {
      setBlogNote(error.message || "Unable to delete blog post.", "error");
    } finally {
      setBlogLoading(false);
    }
  }
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", currentAdminPage);
    clearAdminIdleTimer();
    window.__beulahShowPageLoader?.();
    window.location.href = "admin-auth.html";
    return;
  }

  try {
    window.__beulahShowPageLoader?.();
    bindAdminSessionGuard();
    await waitForSessionAccess();
    await refreshDashboard();
  } finally {
    window.__beulahHidePageLoader?.();
  }
});
