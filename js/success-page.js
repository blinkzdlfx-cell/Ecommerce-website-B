import { auth, waitForSessionAccess } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { callAuthedFunction } from "./api.js";

const refEl = document.getElementById("order-ref");
const dateEl = document.getElementById("receipt-date");
const statusEl = document.getElementById("receipt-status");
const kickerEl = document.querySelector(".receipt-kicker");
const noteEl = document.querySelector(".receipt-note");
const itemsEl = document.getElementById("receipt-items");
const subtotalEl = document.getElementById("receipt-subtotal");
const couponRowEl = document.getElementById("receipt-coupon-row");
const couponCodeEl = document.getElementById("receipt-coupon-code");
const discountRowEl = document.getElementById("receipt-discount-row");
const discountEl = document.getElementById("receipt-discount");
const totalEl = document.getElementById("receipt-total");
const downloadPdfBtn = document.getElementById("download-receipt-pdf-btn");
const downloadImageBtn = document.getElementById("download-receipt-image-btn");
const backLinkEl = document.getElementById("receipt-back-link");
const continueBtn = document.getElementById("receipt-continue-btn");

const queryParams = new URLSearchParams(window.location.search);
const queryRef = queryParams.get("ref");
const source = String(queryParams.get("source") || "").trim().toLowerCase();
const downloadMode = String(queryParams.get("download") || "").trim().toLowerCase();
const shouldAutoImage = downloadMode === "image" || downloadMode === "img" || downloadMode === "png";
const isFromSettings = source === "settings";
const sessionRef = sessionStorage.getItem("orderRef");
const orderRef = queryRef || sessionRef || "";
let autoImageTriggered = false;

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

function setStatus(status) {
  if (!statusEl) return;
  const normalized = String(status || "").toLowerCase();

  if (normalized === "paid") {
    statusEl.textContent = "Paid";
    statusEl.className = "paid-badge";
    return;
  }

  if (normalized === "pending") {
    statusEl.textContent = "Pending";
    statusEl.className = "pending-badge";
    return;
  }

  statusEl.textContent = status || "Unknown";
  statusEl.className = "failed-badge";
}

function renderOrder(order) {
  if (!order || !Array.isArray(order.items) || !order.items.length) {
    window.location.href = "shop.html";
    return;
  }

  if (refEl) refEl.textContent = order.orderRef || orderRef || "-";
  if (dateEl) dateEl.textContent = formatDate(order.createdAt);
  setStatus(order.paymentStatus || "pending");

  if (kickerEl) {
    kickerEl.textContent =
      order.paymentStatus === "paid"
        ? "Payment Confirmed"
        : "Payment Pending Verification";
  }

  if (itemsEl) {
    itemsEl.innerHTML = "";
    order.items.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.name || "Item"}</td>
        <td>${Number(item.qty || 0)}</td>
        <td>${formatNgn(item.unitPrice || 0)}</td>
        <td>${formatNgn(item.lineTotal || 0)}</td>
      `;
      itemsEl.appendChild(row);
    });
  }

  if (subtotalEl) subtotalEl.textContent = formatNgn(order.subtotal || 0);

  const couponCode = String(order.couponCode || "").trim();
  const discount = Number(order.discount || 0);

  if (couponRowEl) couponRowEl.hidden = !couponCode;
  if (couponCodeEl) couponCodeEl.textContent = couponCode || "-";

  if (discountRowEl) discountRowEl.hidden = discount <= 0;
  if (discountEl) discountEl.textContent = `- ${formatNgn(discount)}`;

  if (totalEl) totalEl.textContent = formatNgn(order.total || 0);

  if (noteEl && order.paymentStatus !== "paid") {
    noteEl.innerHTML =
      'Your payment is being verified. We will confirm your order shortly. Need help? Contact us via <a class="footer-link" href="https://wa.me/2347044845526">WhatsApp</a> or <a class="footer-link" href="mailto:beulahfoods2025@gmail.com">email</a>.';
  }

  if (order.paymentStatus === "paid") {
    localStorage.removeItem("beulah_cart");
    window.dispatchEvent(
      new CustomEvent("beulah:cart-updated", {
        detail: { cart: {} }
      })
    );
  }
}

function sanitizeFilePart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
}

function getReceiptImageFileName() {
  const part = sanitizeFilePart(orderRef || refEl?.textContent || Date.now());
  return `beulah-receipt-${part || "order"}.png`;
}

function getReceiptPdfFileName() {
  const part = sanitizeFilePart(orderRef || refEl?.textContent || Date.now());
  return `beulah-receipt-${part || "order"}.pdf`;
}

async function loadHtml2Canvas() {
  if (typeof window.html2canvas === "function") return window.html2canvas;

  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-beulah-html2canvas="1"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load image export library.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js";
    script.async = true;
    script.dataset.beulahHtml2canvas = "1";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load image export library.")), { once: true });
    document.head.appendChild(script);
  });

  if (typeof window.html2canvas !== "function") {
    throw new Error("Image export library did not initialize.");
  }

  return window.html2canvas;
}

async function loadJsPdf() {
  if (window.jspdf && typeof window.jspdf.jsPDF === "function") return window.jspdf;

  await new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-beulah-jspdf="1"]');
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load PDF export library.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    script.async = true;
    script.dataset.beulahJspdf = "1";
    script.addEventListener("load", resolve, { once: true });
    script.addEventListener("error", () => reject(new Error("Could not load PDF export library.")), { once: true });
    document.head.appendChild(script);
  });

  if (!window.jspdf || typeof window.jspdf.jsPDF !== "function") {
    throw new Error("PDF export library did not initialize.");
  }

  return window.jspdf;
}

async function captureReceiptCanvas() {
  const receiptEl = document.querySelector(".receipt-shell");
  if (!receiptEl) {
    throw new Error("Receipt is not ready yet.");
  }

  const actionBar = receiptEl.querySelector(".success-actions");
  const previousActionDisplay = actionBar instanceof HTMLElement ? actionBar.style.display : "";
  if (actionBar instanceof HTMLElement) {
    actionBar.style.display = "none";
  }

  const html2canvas = await loadHtml2Canvas();
  try {
    return await html2canvas(receiptEl, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false
    });
  } finally {
    if (actionBar instanceof HTMLElement) {
      actionBar.style.display = previousActionDisplay;
    }
  }
}

async function downloadReceiptAsImage() {
  const canvas = await captureReceiptCanvas();
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = getReceiptImageFileName();
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function downloadReceiptAsPdf() {
  const canvas = await captureReceiptCanvas();
  const { jsPDF } = await loadJsPdf();

  const width = canvas.width;
  const height = canvas.height;
  const orientation = width >= height ? "landscape" : "portrait";
  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [width, height]
  });

  pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, height, undefined, "FAST");
  pdf.save(getReceiptPdfFileName());
}

async function triggerReceiptImageDownload() {
  const button = downloadImageBtn;
  const previousText = button?.textContent || "Download as Image";

  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
    button.textContent = "Preparing image...";
  }

  try {
    await downloadReceiptAsImage();
  } catch (error) {
    alert(error?.message || "Unable to download image receipt.");
  } finally {
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

async function maybeAutoImageReceipt() {
  if (!shouldAutoImage || autoImageTriggered) return;
  autoImageTriggered = true;
  window.setTimeout(() => {
    void triggerReceiptImageDownload();
  }, 450);
}

async function triggerReceiptPdfDownload() {
  const button = downloadPdfBtn;
  const previousText = button?.textContent || "Download as PDF";

  if (button instanceof HTMLButtonElement) {
    button.disabled = true;
    button.textContent = "Preparing PDF...";
  }

  try {
    await downloadReceiptAsPdf();
  } catch (error) {
    alert(error?.message || "Unable to download PDF receipt.");
  } finally {
    if (button instanceof HTMLButtonElement) {
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

function goToUrl(href) {
  window.__beulahShowPageLoader?.();
  window.location.href = href;
}

function configureReceiptActions() {
  if (backLinkEl) {
    backLinkEl.hidden = !isFromSettings;
  }
}

async function loadReceipt() {
  if (!orderRef) {
    window.location.href = "shop.html";
    return;
  }

  const response = await callAuthedFunction(auth, "getOrderStatus", { orderRef });
  if (!response.order) {
    throw new Error("Unable to load order");
  }

  sessionStorage.setItem("orderRef", response.order.orderRef || orderRef);
  renderOrder(response.order);
  await maybeAutoImageReceipt();
}

configureReceiptActions();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const redirectParams = new URLSearchParams();
    if (orderRef) redirectParams.set("ref", orderRef);
    if (isFromSettings) redirectParams.set("source", "settings");
    if (shouldAutoImage) {
      redirectParams.set("download", "image");
    }
    const redirect = redirectParams.toString()
      ? `success.html?${redirectParams.toString()}`
      : "success.html";
    sessionStorage.setItem("redirectAfterLogin", redirect);
    window.__beulahShowPageLoader?.();
    window.location.href = "auth.html";
    return;
  }

  try {
    window.__beulahShowPageLoader?.();
    await waitForSessionAccess();
    await loadReceipt();
  } catch (error) {
    alert(error.message || "Unable to load receipt");
    window.location.href = "shop.html";
  } finally {
    window.__beulahHidePageLoader?.();
  }
});

downloadImageBtn?.addEventListener("click", () => {
  void triggerReceiptImageDownload();
});

downloadPdfBtn?.addEventListener("click", triggerReceiptPdfDownload);

continueBtn?.addEventListener("click", () => {
  goToUrl("shop.html");
});
