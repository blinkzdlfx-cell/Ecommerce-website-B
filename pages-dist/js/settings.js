import {
  app,
  auth,
  waitForSessionAccess,
  applyRuntimeSessionSecuritySettings
} from "./firebase-init.js";
import {
  onAuthStateChanged,
  updateProfile,
  verifyBeforeUpdateEmail
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { callAuthedFunction } from "./api.js";

const db = getFirestore(app);

const form = document.getElementById("settings-form");
const statusEl = document.getElementById("settings-status");
const nameInput = document.getElementById("settings-name");
const emailInput = document.getElementById("settings-email");
const phoneInput = document.getElementById("settings-phone");
const cityInput = document.getElementById("settings-city");
const addressInput = document.getElementById("settings-address");
const notifyEmailInput = document.getElementById("notify-email");
const notifyWhatsappInput = document.getElementById("notify-whatsapp");

const accountProviderEl = document.getElementById("account-provider");
const accountEmailVerifiedEl = document.getElementById("account-email-verified");
const accountCreatedEl = document.getElementById("account-created");
const accountLastSigninEl = document.getElementById("account-last-signin");
const ordersTotalEl = document.getElementById("settings-orders-total");
const ordersPaidEl = document.getElementById("settings-orders-paid");
const ordersPendingEl = document.getElementById("settings-orders-pending");
const ordersStatusEl = document.getElementById("settings-orders-status");
const ordersBodyEl = document.getElementById("settings-orders-body");
const ordersEmptyEl = document.getElementById("settings-orders-empty");
const ordersLoadMoreBtn = document.getElementById("settings-orders-load-more");
const ordersRangeNoteEl = document.getElementById("settings-orders-range-note");
const sessionFormEl = document.getElementById("settings-session-form");
const sessionStatusEl = document.getElementById("settings-session-status");
const sessionModeNoneEl = document.getElementById("session-mode-none");
const sessionModeInactivityEl = document.getElementById("session-mode-inactivity");
const sessionModeReturnEl = document.getElementById("session-mode-return");
const sessionInactivityGroupEl = document.getElementById("session-inactivity-group");
const sessionInactivityMinutesEl = document.getElementById("session-inactivity-minutes");

let currentUser = null;
let hasExistingSettings = false;
let hasExistingSecuritySettings = false;
let loadedOrders = [];
let ordersNextOffset = 0;
let ordersHasMore = false;
const ORDERS_PAGE_SIZE = 8;

function settingsRef(uid) {
  return doc(db, "users", uid, "settings", "profile");
}

function securitySettingsRef(uid) {
  return doc(db, "users", uid, "settings", "security");
}

function normalizeSessionMode(value) {
  const mode = String(value || "").trim().toLowerCase();
  if (mode === "lock_after_inactivity") return "lock_after_inactivity";
  if (mode === "lock_on_return") return "lock_on_return";
  return "none";
}

function normalizeSecuritySettings(raw = {}) {
  const mode = normalizeSessionMode(raw.sessionMode);
  const inactivityMinutes = Math.max(1, Math.min(120, Math.trunc(Number(raw.inactivityMinutes || 5)) || 5));
  return {
    sessionMode: mode,
    inactivityMinutes
  };
}

function setStatus(message, type = "") {
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `settings-status${type ? ` ${type}` : ""}`;
}

function setFormDisabled(disabled) {
  if (!form) return;
  Array.from(form.elements).forEach((el) => {
    el.disabled = disabled;
  });
}

function mapSaveError(error) {
  if (error?.code === "permission-denied") {
    return "Could not save settings: Missing or insufficient permissions. Update Firestore rules for users/{uid}/settings/profile.";
  }
  return `Could not save settings: ${error.message}`;
}

function mapEmailUpdateError(error) {
  if (error?.code === "auth/requires-recent-login") {
    return "Settings saved, but email change needs recent login. Please sign out, sign in again, then retry.";
  }
  if (error?.code === "auth/invalid-email") {
    return "Settings saved, but the new email format is invalid.";
  }
  if (error?.code === "auth/email-already-in-use") {
    return "Settings saved, but that email is already in use on another account.";
  }
  return `Settings saved, but email change failed: ${error.message}`;
}

function formatDateTime(value) {
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

function formatNgn(value) {
  return `NGN ${Number(value || 0).toLocaleString("en-NG")}`;
}

function setOrdersStatus(message = "", type = "") {
  if (!ordersStatusEl) return;
  ordersStatusEl.textContent = String(message || "").trim();
  ordersStatusEl.className = `settings-status${type ? ` ${type}` : ""}`;
}

function setSessionStatus(message = "", type = "") {
  if (!sessionStatusEl) return;
  sessionStatusEl.textContent = String(message || "").trim();
  sessionStatusEl.className = `settings-status${type ? ` ${type}` : ""}`;
}

function updateSessionSecurityFormVisibility() {
  const mode = sessionModeInactivityEl?.checked
    ? "lock_after_inactivity"
    : sessionModeReturnEl?.checked
      ? "lock_on_return"
      : "none";

  if (sessionInactivityGroupEl) {
    sessionInactivityGroupEl.hidden = mode !== "lock_after_inactivity";
  }
}

function hydrateSessionSecurityForm(raw = {}) {
  const settings = normalizeSecuritySettings(raw);
  if (sessionModeNoneEl) sessionModeNoneEl.checked = settings.sessionMode === "none";
  if (sessionModeInactivityEl) sessionModeInactivityEl.checked = settings.sessionMode === "lock_after_inactivity";
  if (sessionModeReturnEl) sessionModeReturnEl.checked = settings.sessionMode === "lock_on_return";
  if (sessionInactivityMinutesEl) {
    sessionInactivityMinutesEl.value = String(settings.inactivityMinutes);
  }
  updateSessionSecurityFormVisibility();
}

function getSessionSecurityPayload() {
  const sessionMode = sessionModeInactivityEl?.checked
    ? "lock_after_inactivity"
    : sessionModeReturnEl?.checked
      ? "lock_on_return"
      : "none";
  const inactivityMinutes = Math.max(1, Math.min(120, Math.trunc(Number(sessionInactivityMinutesEl?.value || 5)) || 5));
  return { sessionMode, inactivityMinutes };
}

function updateTransactionsFooter() {
  if (ordersLoadMoreBtn) {
    ordersLoadMoreBtn.hidden = !loadedOrders.length || !ordersHasMore;
    ordersLoadMoreBtn.disabled = !ordersHasMore;
  }

  if (!ordersRangeNoteEl) return;

  if (!loadedOrders.length) {
    ordersRangeNoteEl.textContent = "";
    return;
  }

  ordersRangeNoteEl.textContent = ordersHasMore
    ? `Showing ${loadedOrders.length} most recent transactions. Tap "Load Older Transactions" to continue.`
    : `Showing all ${loadedOrders.length} transactions from day one.`;
}

function renderRecentOrders(orders = []) {
  const paidCount = orders.filter((order) => String(order.paymentStatus || "").toLowerCase() === "paid").length;
  const pendingCount = orders.filter((order) => String(order.paymentStatus || "").toLowerCase() === "pending").length;

  if (ordersTotalEl) ordersTotalEl.textContent = String(orders.length);
  if (ordersPaidEl) ordersPaidEl.textContent = String(paidCount);
  if (ordersPendingEl) ordersPendingEl.textContent = String(pendingCount);

  if (!ordersBodyEl) return;
  ordersBodyEl.innerHTML = "";

  if (!orders.length) {
    if (ordersEmptyEl) ordersEmptyEl.style.display = "block";
    updateTransactionsFooter();
    return;
  }

  if (ordersEmptyEl) ordersEmptyEl.style.display = "none";

  orders.forEach((order) => {
    const row = document.createElement("tr");
    const paymentStatus = String(order.paymentStatus || "pending").toLowerCase();
    const badgeClass = paymentStatus === "paid" ? "admin-status admin-status-paid" : "admin-status admin-status-pending";
    const orderRef = String(order.orderRef || "").trim();
    const receiptHref = orderRef ? `success.html?ref=${encodeURIComponent(orderRef)}&source=settings` : "";
    const downloadHref = orderRef ? `${receiptHref}&download=pdf` : "";
    const imageHref = orderRef ? `${receiptHref}&download=image` : "";

    row.innerHTML = `
      <td>${orderRef || "-"}</td>
      <td>${formatNgn(order.total || 0)}</td>
      <td><span class="${badgeClass}">${paymentStatus}</span></td>
      <td>${formatDateTime(order.createdAt)}</td>
      <td>
        ${orderRef
          ? `
            <div class="settings-receipt-actions">
              <a class="settings-receipt-link" href="${receiptHref}">View</a>
              <a class="settings-receipt-link settings-receipt-download" href="${downloadHref}">PDF</a>
              <a class="settings-receipt-link settings-receipt-image" href="${imageHref}">Image</a>
            </div>
          `
          : "-"}
      </td>
    `;

    if (orderRef) {
      row.classList.add("settings-order-row");
      row.addEventListener("click", (event) => {
        const target = event.target;
        if (target instanceof Element && target.closest("a, button")) return;
        window.__beulahShowPageLoader?.();
        window.location.href = receiptHref;
      });
    }

    ordersBodyEl.appendChild(row);
  });

  updateTransactionsFooter();
}

function getProviderLabel(user) {
  const providers = (user?.providerData || [])
    .map((item) => item.providerId)
    .filter(Boolean);

  if (providers.includes("google.com")) return "Google";
  if (providers.includes("password")) return "Email & Password";
  return providers.length ? providers.join(", ") : "Unknown";
}

function updateAccountInfo(user) {
  if (accountProviderEl) accountProviderEl.textContent = getProviderLabel(user);
  if (accountEmailVerifiedEl) {
    accountEmailVerifiedEl.textContent = user.emailVerified ? "Yes" : "No";
  }
  if (accountCreatedEl) {
    accountCreatedEl.textContent = formatDateTime(user.metadata?.creationTime);
  }
  if (accountLastSigninEl) {
    accountLastSigninEl.textContent = formatDateTime(user.metadata?.lastSignInTime);
  }
}

function hydrateForm(user, data = {}) {
  if (nameInput) {
    nameInput.value = data.displayName || user.displayName || localStorage.getItem("userName") || "";
  }

  if (emailInput) {
    emailInput.value = user.email || data.email || "";
  }

  if (phoneInput) {
    phoneInput.value = data.phone || "";
  }

  if (cityInput) {
    cityInput.value = data.city || "";
  }

  if (addressInput) {
    addressInput.value = data.defaultAddress || "";
  }

  if (notifyEmailInput) {
    notifyEmailInput.checked = data.notifyEmail !== false;
  }

  if (notifyWhatsappInput) {
    notifyWhatsappInput.checked = data.notifyWhatsapp !== false;
  }
}

async function loadSettings(user, options = {}) {
  const showLoader = options.showLoader !== false;
  const disableForm = options.disableForm !== false;

  if (disableForm) {
    setFormDisabled(true);
  }
  if (showLoader) {
    window.__beulahShowPageLoader?.();
  }
  setStatus("Loading settings...", "info");

  try {
    const snap = await getDoc(settingsRef(user.uid));
    hasExistingSettings = snap.exists();
    hydrateForm(user, snap.exists() ? snap.data() : {});
    updateAccountInfo(user);
    setStatus("");
  } catch (error) {
    setStatus(`Unable to load settings: ${error.message}`, "error");
  } finally {
    if (showLoader) {
      window.__beulahHidePageLoader?.();
    }
    if (disableForm) {
      setFormDisabled(false);
    }
  }
}

async function loadSessionSecurity(user) {
  setSessionStatus("Loading session security...", "info");

  try {
    const snap = await getDoc(securitySettingsRef(user.uid));
    hasExistingSecuritySettings = snap.exists();
    hydrateSessionSecurityForm(snap.exists() ? snap.data() : {});
    setSessionStatus("");
  } catch (error) {
    hasExistingSecuritySettings = false;
    hydrateSessionSecurityForm({});
    setSessionStatus(`Unable to load session security: ${error.message}`, "error");
  }
}

async function loadRecentOrders(options = {}) {
  const append = Boolean(options.append);
  const offset = append ? ordersNextOffset : 0;

  if (ordersLoadMoreBtn) {
    ordersLoadMoreBtn.disabled = true;
    if (append) {
      ordersLoadMoreBtn.textContent = "Loading...";
    }
  }
  setOrdersStatus(append ? "Loading older transactions..." : "Loading recent transactions...", "info");

  try {
    const response = await callAuthedFunction(auth, "listMyOrders", {
      limit: ORDERS_PAGE_SIZE,
      offset
    });

    const batch = Array.isArray(response.orders) ? response.orders : [];
    const pagination = response.pagination || {};
    ordersHasMore = Boolean(pagination.hasMore);
    ordersNextOffset = Number.isFinite(Number(pagination.nextOffset))
      ? Math.max(0, Math.trunc(Number(pagination.nextOffset)))
      : offset + batch.length;

    loadedOrders = append ? [...loadedOrders, ...batch] : batch;
    renderRecentOrders(loadedOrders);
    setOrdersStatus("");
  } catch (error) {
    if (!append) {
      loadedOrders = [];
      ordersHasMore = false;
      ordersNextOffset = 0;
      renderRecentOrders([]);
    }
    setOrdersStatus(error.message || "Unable to load recent transactions.", "error");
  } finally {
    if (ordersLoadMoreBtn) {
      ordersLoadMoreBtn.textContent = "Load Older Transactions";
      ordersLoadMoreBtn.disabled = !ordersHasMore;
      ordersLoadMoreBtn.hidden = !loadedOrders.length || !ordersHasMore;
    }
    updateTransactionsFooter();
  }
}

async function saveSessionSecurity(event) {
  event.preventDefault();
  if (!currentUser || !sessionFormEl) return;

  const payload = getSessionSecurityPayload();
  Array.from(sessionFormEl.elements).forEach((element) => {
    element.disabled = true;
  });
  setSessionStatus("Saving session security...", "info");

  try {
    const writePayload = {
      ...payload,
      updatedAt: serverTimestamp()
    };

    if (!hasExistingSecuritySettings) {
      writePayload.createdAt = serverTimestamp();
    }

    await setDoc(securitySettingsRef(currentUser.uid), writePayload, { merge: true });
    hasExistingSecuritySettings = true;
    hydrateSessionSecurityForm(payload);
    applyRuntimeSessionSecuritySettings(payload);
    setSessionStatus("Session security saved for this account.", "success");
  } catch (error) {
    setSessionStatus(`Could not save session security: ${error.message}`, "error");
  } finally {
    Array.from(sessionFormEl.elements).forEach((element) => {
      element.disabled = false;
    });
    updateSessionSecurityFormVisibility();
  }
}

async function saveSettings(event) {
  event.preventDefault();
  if (!currentUser) return;

  const displayName = nameInput?.value.trim() || "";
  const enteredEmail = emailInput?.value.trim() || currentUser.email || "";
  const phone = phoneInput?.value.trim() || "";
  const city = cityInput?.value.trim() || "";
  const defaultAddress = addressInput?.value.trim() || "";
  const notifyEmail = Boolean(notifyEmailInput?.checked);
  const notifyWhatsapp = Boolean(notifyWhatsappInput?.checked);

  const currentEmail = currentUser.email || "";
  const emailChanged = enteredEmail.toLowerCase() !== currentEmail.toLowerCase();

  setFormDisabled(true);
  window.__beulahShowPageLoader?.();
  setStatus("Saving settings...", "info");

  try {
    const payload = {
      uid: currentUser.uid,
      email: currentEmail,
      displayName,
      phone,
      city,
      defaultAddress,
      notifyEmail,
      notifyWhatsapp,
      updatedAt: serverTimestamp()
    };

    if (!hasExistingSettings) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(settingsRef(currentUser.uid), payload, { merge: true });

    if (displayName && currentUser.displayName !== displayName) {
      await updateProfile(currentUser, { displayName });
      localStorage.setItem("userName", displayName);
      const headerName = document.getElementById("user-name");
      const headerNameMobile = document.getElementById("user-name-mobile");
      if (headerName) headerName.textContent = displayName;
      if (headerNameMobile) headerNameMobile.textContent = displayName;
    }

    hasExistingSettings = true;
    updateAccountInfo(currentUser);

    if (emailChanged) {
      try {
        await verifyBeforeUpdateEmail(currentUser, enteredEmail);
        await setDoc(
          settingsRef(currentUser.uid),
          { pendingEmail: enteredEmail, updatedAt: serverTimestamp() },
          { merge: true }
        );
        setStatus(
          "Settings saved. Check your new email inbox to verify and complete the email change.",
          "success"
        );
      } catch (emailError) {
        setStatus(mapEmailUpdateError(emailError), "error");
      }
      return;
    }

    setStatus("Settings saved successfully.", "success");
  } catch (error) {
    setStatus(mapSaveError(error), "error");
  } finally {
    window.__beulahHidePageLoader?.();
    setFormDisabled(false);
  }
}

form?.addEventListener("submit", saveSettings);
sessionFormEl?.addEventListener("submit", saveSessionSecurity);
sessionModeNoneEl?.addEventListener("change", updateSessionSecurityFormVisibility);
sessionModeInactivityEl?.addEventListener("change", updateSessionSecurityFormVisibility);
sessionModeReturnEl?.addEventListener("change", updateSessionSecurityFormVisibility);
ordersLoadMoreBtn?.addEventListener("click", () => {
  if (!ordersHasMore) return;
  void loadRecentOrders({ append: true });
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    sessionStorage.setItem("redirectAfterLogin", "settings.html");
    window.__beulahShowPageLoader?.();
    window.location.href = "auth.html";
    return;
  }

  currentUser = user;

  try {
    window.__beulahShowPageLoader?.();
    await waitForSessionAccess();
    updateAccountInfo(user);
    await loadSettings(user, { showLoader: false });
    await loadSessionSecurity(user);
    await loadRecentOrders();
  } finally {
    window.__beulahHidePageLoader?.();
  }
});
