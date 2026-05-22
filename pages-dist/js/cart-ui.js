const CART_KEY = "beulah_cart";
const MOBILE_QUERY = "(max-width: 768px)";
const FLOATING_SKIP_PAGES = new Set(["cart.html", "checkout.html", "auth.html"]);

const badgeTargets = [];

function playCartTapSound() {
  if (typeof window.__beulahPlayTapSound === "function") {
    window.__beulahPlayTapSound("cart");
  }
}

function bindCartTapSound(element) {
  if (!(element instanceof HTMLElement)) return;
  if (element.dataset.cartSoundBound === "1") return;

  element.addEventListener("click", () => {
    playCartTapSound();
  }, { passive: true });
  element.dataset.cartSoundBound = "1";
}

function getCurrentPageName() {
  const pathname = window.location.pathname || "";
  const file = pathname.split("/").pop();
  return file || "index.html";
}

function isCartLink(link) {
  const href = String(link.getAttribute("href") || "").trim().toLowerCase();
  return href === "cart.html" || href.endsWith("/cart.html");
}

function parseCartCount() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return 0;

    return Object.values(parsed).reduce((sum, value) => {
      const qty = Number(value || 0);
      if (!Number.isFinite(qty) || qty <= 0) return sum;
      return sum + Math.floor(qty);
    }, 0);
  } catch {
    return 0;
  }
}

function setBadgeCount(badge, count) {
  if (!badge) return;
  const safeCount = Number.isFinite(count) ? Math.max(0, count) : 0;
  badge.hidden = safeCount <= 0;
  badge.textContent = safeCount > 99 ? "99+" : String(safeCount);
}

function refreshCartBadges() {
  for (let index = badgeTargets.length - 1; index >= 0; index -= 1) {
    if (!badgeTargets[index].isConnected) {
      badgeTargets.splice(index, 1);
    }
  }
  const count = parseCartCount();
  badgeTargets.forEach((badge) => setBadgeCount(badge, count));
}

function createBadge(className) {
  const badge = document.createElement("span");
  badge.className = className;
  badge.hidden = true;
  badge.textContent = "0";
  badgeTargets.push(badge);
  return badge;
}

function decorateHeaderCartLinks() {
  const links = document.querySelectorAll("nav a");
  links.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (!isCartLink(link)) return;
    if (link.dataset.cartUiReady === "1") return;

    const label = document.createElement("span");
    label.className = "cart-nav-text";
    label.textContent = "Cart";

    const icon = document.createElement("span");
    icon.className = "cart-nav-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "🛒";

    const badge = createBadge("cart-count-badge");

    link.textContent = "";
    link.classList.add("cart-nav-link");
    link.setAttribute("aria-label", "Cart");
    link.append(icon, label, badge);
    bindCartTapSound(link);
    link.dataset.cartUiReady = "1";
  });
}

function decorateHeaderCartButtons() {
  const links = document.querySelectorAll(".header-cart-btn");
  links.forEach((link) => {
    if (!(link instanceof HTMLAnchorElement)) return;
    if (link.dataset.cartUiReady === "1") return;

    const badge = createBadge("cart-count-badge");
    link.append(badge);
    bindCartTapSound(link);
    link.dataset.cartUiReady = "1";
  });
}

function mountFloatingCartButton() {
  const existing = document.getElementById("floating-cart-btn");
  const shouldShow = window.matchMedia(MOBILE_QUERY).matches
    && !FLOATING_SKIP_PAGES.has(getCurrentPageName().toLowerCase());

  if (!shouldShow) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const button = document.createElement("a");
  button.id = "floating-cart-btn";
  button.href = "cart.html";
  button.className = "floating-cart-btn";
  button.setAttribute("aria-label", "Open cart");

  const icon = document.createElement("span");
  icon.className = "floating-cart-icon";
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "🛒";

  const badge = createBadge("floating-cart-badge");
  button.append(icon, badge);
  bindCartTapSound(button);
  document.body.appendChild(button);
  refreshCartBadges();
}

function initCartUi() {
  decorateHeaderCartLinks();
  decorateHeaderCartButtons();
  mountFloatingCartButton();
  refreshCartBadges();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initCartUi);
} else {
  initCartUi();
}

window.addEventListener("beulah:cart-updated", refreshCartBadges);
window.addEventListener("storage", (event) => {
  if (event.key === CART_KEY) {
    refreshCartBadges();
  }
});
window.addEventListener("resize", mountFloatingCartButton);
window.addEventListener("pageshow", refreshCartBadges);
window.addEventListener("focus", refreshCartBadges);
window.__beulahRefreshCartUi = initCartUi;
