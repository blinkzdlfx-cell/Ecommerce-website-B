import { auth, waitForSessionAccess } from "./firebase-init.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import { callAuthedFunction } from "./api.js";

const payBtn = document.getElementById("confirm-pay-btn");
const cancelPayBtn = document.getElementById("cancel-payment-btn");
const orderRefEl = document.getElementById("order-ref");
const feedbackEl = document.getElementById("checkout-feedback");
const couponInputEl = document.getElementById("coupon-code");
const applyCouponBtn = document.getElementById("apply-coupon-btn");
const couponFeedbackEl = document.getElementById("coupon-feedback");
const subtotalEl = document.getElementById("checkout-total");
const discountEl = document.getElementById("checkout-discount");
const grandTotalEl = document.getElementById("checkout-grand-total");
const cancelPaymentModalEl = document.getElementById("cancel-payment-modal");
const cancelPaymentDismissBtn = document.getElementById("cancel-payment-dismiss-btn");
const cancelPaymentConfirmBtn = document.getElementById("cancel-payment-confirm-btn");

const CART_KEY = "beulah_cart";

let activeCheckoutSession = null;
let checkoutVerificationReady = false;
let activeCouponCode = "";

function setPayButton(disabled, text) {
  if (!payBtn) return;
  payBtn.disabled = disabled;
  payBtn.textContent = text;
  payBtn.style.opacity = disabled ? "0.72" : "1";
}

function setFeedback(message = "", type = "") {
  if (!feedbackEl) return;

  const text = String(message || "").trim();
  feedbackEl.hidden = !text;
  feedbackEl.textContent = text;
  feedbackEl.className = `checkout-feedback${type ? ` ${type}` : ""}`;
}

function setCouponFeedback(message = "", type = "") {
  if (!couponFeedbackEl) return;
  couponFeedbackEl.textContent = String(message || "").trim();
  couponFeedbackEl.className = `coupon-feedback${type ? ` ${type}` : ""}`;
}

function formatNgn(value) {
  return "NGN " + Number(value || 0).toLocaleString("en-NG");
}

function updateCheckoutTotals(summary = {}) {
  if (subtotalEl) subtotalEl.textContent = formatNgn(summary.subtotal || 0);
  if (discountEl) discountEl.textContent = formatNgn(summary.discount || 0);
  if (grandTotalEl) grandTotalEl.textContent = formatNgn(summary.total || summary.subtotal || 0);
}

function toUserMessage(error, fallback = "Unable to continue checkout.") {
  const raw = String(error?.message || fallback).trim();
  const normalized = raw.toLowerCase();

  if (normalized.includes("could not reach payment server")) {
    return "Could not reach payment server. Please refresh and try again.";
  }

  if (normalized.includes("invalid or expired sign-in token")) {
    return "Your sign-in session expired. Please sign in again.";
  }

  return raw;
}

function getCartSnapshot() {
  return JSON.parse(localStorage.getItem(CART_KEY)) || {};
}

function notifyCartUpdate(cart = {}) {
  window.dispatchEvent(
    new CustomEvent("beulah:cart-updated", {
      detail: { cart }
    })
  );
}

function clearCartSnapshot() {
  localStorage.removeItem(CART_KEY);
  notifyCartUpdate({});
}

function resetCheckoutAfterCancel() {
  activeCheckoutSession = null;
  checkoutVerificationReady = false;
  activeCouponCode = "";

  if (couponInputEl) couponInputEl.value = "";
  if (orderRefEl) orderRefEl.textContent = "-";

  updateCheckoutTotals({ subtotal: 0, discount: 0, total: 0 });
  setPayButton(true, "Confirm & Pay");
  setCouponFeedback("Cart cleared.", "info");
  setFeedback("Payment cancelled and cart has been cleared.", "success");
}

function toggleCancelPaymentModal(open) {
  if (!cancelPaymentModalEl) return;

  cancelPaymentModalEl.hidden = !open;
  cancelPaymentModalEl.setAttribute("aria-hidden", open ? "false" : "true");
  document.body.classList.toggle("checkout-confirm-open", open);

  if (open) {
    cancelPaymentConfirmBtn?.focus();
  } else {
    cancelPayBtn?.focus();
  }
}

function requestCancelPayment() {
  const cart = getCartSnapshot();
  if (!Object.keys(cart).length) {
    setFeedback("Your cart is already empty.", "info");
    setPayButton(true, "Confirm & Pay");
    return;
  }

  toggleCancelPaymentModal(true);
}

function confirmCancelPayment() {
  toggleCancelPaymentModal(false);

  const cart = getCartSnapshot();
  if (!Object.keys(cart).length) {
    setFeedback("Your cart is already empty.", "info");
    setPayButton(true, "Confirm & Pay");
    return;
  }

  clearCartSnapshot();
  resetCheckoutAfterCancel();
}

function closeCancelPaymentModal() {
  toggleCancelPaymentModal(false);
}

function handleCancelPaymentModalBackdrop(event) {
  if (event.target === cancelPaymentModalEl) {
    closeCancelPaymentModal();
  }
}

function handleCancelPaymentModalEscape(event) {
  if (event.key === "Escape" && cancelPaymentModalEl && !cancelPaymentModalEl.hidden) {
    closeCancelPaymentModal();
  }
}

async function previewCheckoutTotals(couponCode = "") {
  const cart = getCartSnapshot();
  const keys = Object.keys(cart);
  if (!keys.length) {
    updateCheckoutTotals({ subtotal: 0, discount: 0, total: 0 });
    setCouponFeedback("Your cart is empty.", "error");
    setPayButton(true, "Confirm & Pay");
    return null;
  }

  const response = await callAuthedFunction(auth, "previewCheckout", {
    cart,
    couponCode
  });
  updateCheckoutTotals(response);
  setPayButton(false, "Confirm & Pay");
  return response;
}

async function createSessionFromBackend() {
  const cart = getCartSnapshot();
  const keys = Object.keys(cart);
  if (!keys.length) {
    throw new Error("Your cart is empty");
  }

  const session = await callAuthedFunction(auth, "createCheckoutSession", {
    cart,
    couponCode: activeCouponCode
  });
  if (!session.orderRef || !session.amountKobo || !session.publicKey) {
    throw new Error("Invalid checkout session response");
  }

  const key = String(session.publicKey || "").trim();
  const validPublicKey = key.startsWith("pk_test_") || key.startsWith("pk_live_");
  if (!validPublicKey) {
    throw new Error("Payment setup error: Paystack public key is invalid on server.");
  }

  return session;
}

async function confirmPayment(orderRef) {
  const response = await callAuthedFunction(auth, "confirmCheckoutPayment", { orderRef });
  if (!response.order) {
    throw new Error("Unable to confirm payment");
  }
  return response.order;
}

async function applyCoupon() {
  if (!applyCouponBtn) return;

  const nextCode = String(couponInputEl?.value || "").trim().toUpperCase();
  applyCouponBtn.disabled = true;
  setCouponFeedback("Checking coupon...", "info");

  try {
    const summary = await previewCheckoutTotals(nextCode);
    activeCouponCode = summary?.couponCode || "";

    if (activeCouponCode) {
      if (couponInputEl) couponInputEl.value = activeCouponCode;
      setCouponFeedback(`Coupon ${activeCouponCode} applied.`, "success");
    } else {
      setCouponFeedback("No discount code applied.", "info");
    }
  } catch (error) {
    activeCouponCode = "";
    setCouponFeedback(toUserMessage(error, "Could not apply coupon."), "error");
  } finally {
    applyCouponBtn.disabled = false;
  }
}

async function startPayment() {
  if (!payBtn) return;
  window.__beulahPlayTapSound?.("checkout");

  setPayButton(true, "Preparing...");
  setFeedback("Preparing secure checkout...", "info");

  try {
    if (couponInputEl && !activeCouponCode) {
      const typedCode = String(couponInputEl.value || "").trim().toUpperCase();
      if (typedCode) {
        activeCouponCode = typedCode;
      }
    }

    activeCheckoutSession = await createSessionFromBackend();
    checkoutVerificationReady = Boolean(activeCheckoutSession.verificationReady);
    if (orderRefEl) orderRefEl.textContent = activeCheckoutSession.orderRef;

    updateCheckoutTotals({
      subtotal: activeCheckoutSession.subtotal,
      discount: activeCheckoutSession.discount,
      total: activeCheckoutSession.total
    });

    if (activeCheckoutSession.couponCode) {
      activeCouponCode = activeCheckoutSession.couponCode;
      if (couponInputEl) couponInputEl.value = activeCouponCode;
      setCouponFeedback(`Coupon ${activeCouponCode} applied.`, "success");
    }

    setFeedback("Checkout session ready. Opening payment window...", "info");

    if (!window.PaystackPop || typeof window.PaystackPop.setup !== "function") {
      throw new Error("Paystack library failed to load. Please refresh and try again.");
    }

    const onPaystackSuccess = function () {
      setPayButton(true, "Verifying...");
      setFeedback("Payment received. Verifying transaction...", "info");

      confirmPayment(activeCheckoutSession.orderRef)
        .then((order) => {
          if (!checkoutVerificationReady || order.paymentStatus !== "paid") {
            setFeedback(
              "Payment submitted. Order is pending verification and will update shortly.",
              "info"
            );
          } else {
            setFeedback("Payment verified. Redirecting to receipt...", "success");
          }

          sessionStorage.setItem("orderRef", order.orderRef);
          window.__beulahShowPageLoader?.();
          window.location.href = `success.html?ref=${encodeURIComponent(order.orderRef)}`;
        })
        .catch((error) => {
          setPayButton(false, "Confirm & Pay");
          setFeedback(toUserMessage(error, "Payment verification failed."), "error");
        });
    };

    const onPaystackClose = function () {
      setPayButton(false, "Confirm & Pay");
      setFeedback("Payment cancelled. You can try again.", "info");
    };

    const handler = PaystackPop.setup({
      key: activeCheckoutSession.publicKey,
      email: activeCheckoutSession.email || auth.currentUser?.email || "beulahfoods2025@gmail.com",
      amount: activeCheckoutSession.amountKobo,
      currency: activeCheckoutSession.currency || "NGN",
      ref: activeCheckoutSession.orderRef,
      callback: onPaystackSuccess,
      onClose: onPaystackClose
    });

    setPayButton(false, "Confirm & Pay");
    handler.openIframe();
  } catch (error) {
    setPayButton(false, "Confirm & Pay");
    setFeedback(toUserMessage(error), "error");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    setPayButton(true, "Sign in to Checkout");
    setFeedback("Please sign in or create an account to continue checkout.", "info");
    window.__beulahShowGuestAuthModal?.("checkout.html");
    return;
  }

  if (payBtn) {
    setPayButton(false, "Confirm & Pay");
    setFeedback("");

    if (!payBtn.dataset.bound) {
      payBtn.addEventListener("click", startPayment);
      payBtn.dataset.bound = "true";
    }
  }

  if (applyCouponBtn && !applyCouponBtn.dataset.bound) {
    applyCouponBtn.addEventListener("click", applyCoupon);
    applyCouponBtn.dataset.bound = "true";
  }

  if (cancelPayBtn && !cancelPayBtn.dataset.bound) {
    cancelPayBtn.addEventListener("click", requestCancelPayment);
    cancelPayBtn.dataset.bound = "true";
  }

  if (cancelPaymentDismissBtn && !cancelPaymentDismissBtn.dataset.bound) {
    cancelPaymentDismissBtn.addEventListener("click", closeCancelPaymentModal);
    cancelPaymentDismissBtn.dataset.bound = "true";
  }

  if (cancelPaymentConfirmBtn && !cancelPaymentConfirmBtn.dataset.bound) {
    cancelPaymentConfirmBtn.addEventListener("click", confirmCancelPayment);
    cancelPaymentConfirmBtn.dataset.bound = "true";
  }

  if (cancelPaymentModalEl && !cancelPaymentModalEl.dataset.bound) {
    cancelPaymentModalEl.addEventListener("click", handleCancelPaymentModalBackdrop);
    document.addEventListener("keydown", handleCancelPaymentModalEscape);
    cancelPaymentModalEl.dataset.bound = "true";
  }

  try {
    await waitForSessionAccess();
    const summary = await previewCheckoutTotals(activeCouponCode);
    if (summary?.couponCode) {
      activeCouponCode = summary.couponCode;
      if (couponInputEl) couponInputEl.value = activeCouponCode;
      setCouponFeedback(Coupon  applied., "success");
    } else {
      setCouponFeedback("");
    }
  } catch {
    setCouponFeedback("");
  }
});