import { auth } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

const MODAL_ID = "guest-auth-modal";
const SIGNIN_SELECTOR = "[data-guest-auth-signin]";
const SECONDARY_SELECTOR = "[data-guest-auth-secondary]";
const CLOSE_SELECTOR = ".auth-close";
const PAGE_NAME = String(window.location.pathname.split("/").pop() || "index.html").trim() || "index.html";
const CART_PAGE = "cart.html";
const CHECKOUT_PAGE = "checkout.html";

const modal = document.getElementById(MODAL_ID);
const signinLink = modal?.querySelector(SIGNIN_SELECTOR);
const secondaryAction = modal?.querySelector(SECONDARY_SELECTOR);
const closeBtn = modal?.querySelector(CLOSE_SELECTOR);

let currentRedirectTarget = PAGE_NAME;
let currentSecondaryTarget = "shop.html";

function isGuestGatePage() {
  return PAGE_NAME === CART_PAGE || PAGE_NAME === CHECKOUT_PAGE;
}

function setRedirectTarget(targetPage) {
  currentRedirectTarget = targetPage === CHECKOUT_PAGE ? CHECKOUT_PAGE : targetPage === CART_PAGE ? CART_PAGE : PAGE_NAME;
  sessionStorage.setItem("redirectAfterLogin", currentRedirectTarget);
}

function setSecondaryAction(targetPage) {
  currentSecondaryTarget = targetPage === CHECKOUT_PAGE ? CART_PAGE : "shop.html";
  if (!(secondaryAction instanceof HTMLElement)) return;

  if (secondaryAction instanceof HTMLAnchorElement) {
    secondaryAction.href = currentSecondaryTarget;
  } else {
    secondaryAction.dataset.target = currentSecondaryTarget;
  }

  secondaryAction.textContent = targetPage === CHECKOUT_PAGE ? "Back to Cart" : "Continue Shopping";
}

function updateModalCopy(targetPage) {
  const titleEl = modal?.querySelector("[data-guest-auth-title]");
  const copyEl = modal?.querySelector("[data-guest-auth-copy]");
  const kickerEl = modal?.querySelector("[data-guest-auth-kicker]");

  if (kickerEl) kickerEl.textContent = "Sign in required";
  if (titleEl) {
    titleEl.textContent = targetPage === CHECKOUT_PAGE ? "Sign in to finish checkout" : "Sign in to view your cart";
  }
  if (copyEl) {
    copyEl.textContent = targetPage === CHECKOUT_PAGE
      ? "You can browse the store without logging in, but checkout needs a signed-in account."
      : "You can browse products without logging in, but signing in keeps checkout ready and saves your experience.";
  }

  setSecondaryAction(targetPage);
}

function showGuestAuthModal(targetPage = PAGE_NAME) {
  if (!modal) return;
  setRedirectTarget(targetPage);
  updateModalCopy(targetPage);
  modal.classList.remove("hidden");
  document.body.classList.add("guest-auth-open");
}

function hideGuestAuthModal() {
  if (!modal) return;
  modal.classList.add("hidden");
  document.body.classList.remove("guest-auth-open");
}

function ensureSigninRedirect() {
  setRedirectTarget(currentRedirectTarget);
}

function bindModalControls() {
  if (!(closeBtn instanceof HTMLButtonElement)) return;

  closeBtn.addEventListener("click", () => {
    hideGuestAuthModal();
  });

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) {
      hideGuestAuthModal();
    }
  });

  if (signinLink instanceof HTMLAnchorElement) {
    signinLink.addEventListener("click", () => {
      ensureSigninRedirect();
    });
  }

  if (secondaryAction instanceof HTMLButtonElement) {
    secondaryAction.addEventListener("click", () => {
      const target = currentSecondaryTarget || "shop.html";
      window.location.href = target;
    });
  }
}

function bindCartCheckoutButton() {
  const checkoutBtn = document.getElementById("go-to-checkout");
  if (!(checkoutBtn instanceof HTMLButtonElement) || checkoutBtn.dataset.guestGateBound === "1") return;

  checkoutBtn.addEventListener("click", (event) => {
    if (auth.currentUser) return;
    event.preventDefault();
    showGuestAuthModal(CHECKOUT_PAGE);
  });

  checkoutBtn.dataset.guestGateBound = "1";
}

function bindCheckoutPageButtons() {
  const confirmPayBtn = document.getElementById("confirm-pay-btn");
  if (!(confirmPayBtn instanceof HTMLButtonElement) || confirmPayBtn.dataset.guestGateBound === "1") return;

  confirmPayBtn.addEventListener("click", (event) => {
    if (auth.currentUser) return;
    event.preventDefault();
    showGuestAuthModal(CHECKOUT_PAGE);
  });

  confirmPayBtn.dataset.guestGateBound = "1";
}

window.__beulahShowGuestAuthModal = showGuestAuthModal;
window.__beulahHideGuestAuthModal = hideGuestAuthModal;
window.__beulahGuestAuthTarget = () => currentRedirectTarget;

bindModalControls();

onAuthStateChanged(auth, (user) => {
  if (user) {
    hideGuestAuthModal();
    return;
  }

  if (isGuestGatePage()) {
    showGuestAuthModal(PAGE_NAME);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  if (PAGE_NAME === CART_PAGE) {
    bindCartCheckoutButton();
  }
  if (PAGE_NAME === CHECKOUT_PAGE) {
    bindCheckoutPageButtons();
  }
  if (isGuestGatePage() && !auth.currentUser) {
    showGuestAuthModal(PAGE_NAME);
  }
});